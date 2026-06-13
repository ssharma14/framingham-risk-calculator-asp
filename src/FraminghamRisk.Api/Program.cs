using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using FraminghamRisk.Api.Ai;
using FraminghamRisk.Api.Data;
using FraminghamRisk.Domain;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Honour the host's PORT in production; locally it's unset and launchSettings wins.
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

builder.Services.AddOpenApi();
builder.Services.AddSingleton<FraminghamCalculator>();

// SQLite by default; swap the provider/connection string for Postgres.
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Default")
        ?? "Data Source=framingham.db"));

builder.Services.AddSingleton<FallbackExplainer>();
builder.Services.AddHttpClient<IRiskExplainer, LlmRiskExplainer>();

// Per-IP rate limit on the AI endpoint.
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

// Serialize enums as strings instead of numbers.
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

// Dev: allow any local origin (Vite picks a port). Prod: the Firebase-hosted SPA only.
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

// Apply migrations on startup.
using (var scope = app.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors(DevCors);
app.UseRateLimiter();

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

// History is scoped to the caller's session token; no token → empty list.
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

static string? SessionId(HttpContext ctx)
{
    var id = ctx.Request.Headers["X-Session-Id"].FirstOrDefault();
    return string.IsNullOrWhiteSpace(id) ? null : id;
}
