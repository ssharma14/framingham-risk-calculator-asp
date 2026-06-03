using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using FraminghamRisk.Api.Ai;
using FraminghamRisk.Api.Data;
using FraminghamRisk.Domain;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

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
// production the SPA is same-origin via the Firebase rewrite, so CORS isn't needed.
const string DevCors = "dev";
builder.Services.AddCors(options =>
    options.AddPolicy(DevCors, policy =>
    {
        if (builder.Environment.IsDevelopment())
            policy.SetIsOriginAllowed(_ => true).AllowAnyHeader().AllowAnyMethod();
        else
            policy.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod();
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
        var sessionId = GetOrCreateSession(ctx);
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

// History is scoped to the caller's session cookie: a visitor only ever sees
// their own assessments. No cookie yet (first visit) → empty list.
app.MapGet("/api/assessments", async (AppDbContext db, HttpContext ctx, CancellationToken ct) =>
{
    var sessionId = ctx.Request.Cookies[SessionCookie];
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

// Returns the visitor's session id, creating and setting the cookie if absent.
// The cookie is HttpOnly (not needed by JS) and persists so history survives
// across visits from the same browser.
static string GetOrCreateSession(HttpContext ctx)
{
    if (ctx.Request.Cookies.TryGetValue(SessionCookie, out var existing)
        && !string.IsNullOrWhiteSpace(existing))
        return existing;

    var id = Guid.NewGuid().ToString("N");
    ctx.Response.Cookies.Append(SessionCookie, id, new CookieOptions
    {
        HttpOnly = true,
        SameSite = SameSiteMode.Lax,
        Secure = ctx.Request.IsHttps, // false over dev http, true in production
        MaxAge = TimeSpan.FromDays(30),
        Path = "/",
    });
    return id;
}

public partial class Program
{
    private const string SessionCookie = "frs_session";
}
