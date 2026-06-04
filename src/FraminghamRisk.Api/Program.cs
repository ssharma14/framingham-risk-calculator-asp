using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using FraminghamRisk.Api.Ai;
using FraminghamRisk.Api.Data;
using FraminghamRisk.Domain;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Bind to the host-provided PORT so the same image runs anywhere (Cloud Run,
// Render, Koyeb, ...). Locally, PORT is unset and launchSettings/urls apply.
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

builder.Services.AddOpenApi();
builder.Services.AddSingleton<FraminghamCalculator>();

// Assessment history. SQLite by default; swap the provider/connection string to
// move to Postgres without touching the rest of the app.
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Default")
        ?? "Data Source=framingham.db"));

// AI explanation: an OpenAI-compatible provider when a key is configured,
// otherwise a local fallback.
builder.Services.AddSingleton<FallbackExplainer>();
builder.Services.AddHttpClient<IRiskExplainer, LlmRiskExplainer>();

// Per-IP rate limit on the AI endpoint to protect the shared server-side key.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("explain", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
            }));
});

// Serialize enums as strings ("Male", "Low") instead of numbers.
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

// CORS. In development allow any local origin (whatever port Vite picks); in
// production the SPA is served from Firebase Hosting on a different origin than
// this API, so allow those origins explicitly.
const string DevCors = "dev";
string[] prodOrigins =
[
    "https://framingham-risk-calculator.web.app",
    "https://framingham-risk-calculator.firebaseapp.com",
];
builder.Services.AddCors(options =>
    options.AddPolicy(DevCors, policy =>
    {
        if (builder.Environment.IsDevelopment())
            policy.SetIsOriginAllowed(_ => true).AllowAnyHeader().AllowAnyMethod();
        else
            policy.WithOrigins(prodOrigins).AllowAnyHeader().AllowAnyMethod();
    }));

var app = builder.Build();

// Apply migrations on startup so the SQLite file exists and is up to date.
using (var scope = app.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi(); // OpenAPI doc at /openapi/v1.json
}

app.UseCors(DevCors);
app.UseRateLimiter();

// Liveness probe for the host's health check (works in any environment).
app.MapGet("/health", () => Results.Ok("ok")).WithName("Health");

app.MapPost("/api/assessments", async (
    PatientInput input,
    FraminghamCalculator calc,
    AppDbContext db,
    HttpContext ctx,
    CancellationToken ct) =>
{
    try
    {
        var result = calc.Calculate(input);
        var sessionId = SessionId(ctx) ?? Guid.NewGuid().ToString("N");
        db.Assessments.Add(Assessment.From(input, result, DateTime.UtcNow, sessionId));
        await db.SaveChangesAsync(ct);
        return Results.Ok(result);
    }
    catch (ValidationException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
})
.WithName("CreateAssessment");

// History is scoped to the caller's session token (X-Session-Id header): a
// visitor only ever sees their own assessments. No token yet → empty list.
app.MapGet("/api/assessments", async (AppDbContext db, HttpContext ctx, CancellationToken ct) =>
{
    var sessionId = SessionId(ctx);
    if (string.IsNullOrWhiteSpace(sessionId))
        return Results.Ok(Array.Empty<AssessmentSummary>());

    var recent = await db.Assessments
        .Where(a => a.SessionId == sessionId)
        .OrderByDescending(a => a.CreatedAt)
        .Take(20)
        .Select(a => new AssessmentSummary(
            a.Id, a.CreatedAt, a.Age, a.Sex, a.SystolicBp, a.Smoker, a.Diabetic,
            a.TotalPoints, a.RiskPercent, a.HeartAge, a.Level))
        .ToListAsync(ct);
    return Results.Ok(recent);
})
.WithName("ListAssessments");

app.MapPost("/api/assessments/explain", async (
    PatientInput input,
    FraminghamCalculator calc,
    IRiskExplainer explainer,
    CancellationToken ct) =>
{
    try
    {
        var result = calc.Calculate(input);
        var explanation = await explainer.ExplainAsync(input, result, ct);
        return Results.Ok(explanation);
    }
    catch (ValidationException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
})
.WithName("ExplainAssessment")
.RequireRateLimiting("explain");

app.Run();

// The visitor's session token, sent by the SPA as the X-Session-Id header
// (generated and stored in localStorage on the client). Works cross-origin
// without third-party cookies. Returns null when absent.
static string? SessionId(HttpContext ctx)
{
    var id = ctx.Request.Headers["X-Session-Id"].FirstOrDefault();
    return string.IsNullOrWhiteSpace(id) ? null : id;
}
