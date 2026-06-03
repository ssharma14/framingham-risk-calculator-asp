using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using FraminghamRisk.Api.Ai;
using FraminghamRisk.Domain;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddSingleton<FraminghamCalculator>();

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

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi(); // OpenAPI doc at /openapi/v1.json
}

app.UseCors(DevCors);
app.UseRateLimiter();

app.MapPost("/api/assessments", (PatientInput input, FraminghamCalculator calc) =>
{
    try
    {
        return Results.Ok(calc.Calculate(input));
    }
    catch (ValidationException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
})
.WithName("CreateAssessment");

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
