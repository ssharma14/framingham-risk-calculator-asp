using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using FraminghamRisk.Domain;

namespace FraminghamRisk.Api.Ai;

// Calls an OpenAI-compatible chat endpoint for the explanation, falling back to
// the local explainer when there's no API key or the call fails.
public class LlmRiskExplainer : IRiskExplainer
{
    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private readonly FallbackExplainer _fallback;
    private readonly ILogger<LlmRiskExplainer> _logger;

    public LlmRiskExplainer(
        HttpClient http,
        IConfiguration config,
        FallbackExplainer fallback,
        ILogger<LlmRiskExplainer> logger)
    {
        _http = http;
        _config = config;
        _fallback = fallback;
        _logger = logger;
    }

    public async Task<Explanation> ExplainAsync(
        PatientInput input, RiskResult result, CancellationToken ct = default)
    {
        var apiKey = _config["Llm:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogInformation("No LLM API key configured; using fallback explainer.");
            return await _fallback.ExplainAsync(input, result, ct);
        }

        var baseUrl = (_config["Llm:BaseUrl"] ?? "https://api.groq.com/openai/v1").TrimEnd('/');
        var model = _config["Llm:Model"] ?? "llama-3.3-70b-versatile";

        try
        {
            const string system =
                "You are a cautious health-information assistant. You explain cardiovascular risk " +
                "results in plain, supportive language for a layperson. You never give a diagnosis " +
                "or prescribe treatment, and you always encourage consulting a qualified healthcare " +
                "professional. Respond ONLY with a JSON object of the form " +
                "{\"summary\": string, \"suggestions\": string[]}. The summary is 2-3 short " +
                "sentences. Provide 3-4 brief, general, non-prescriptive lifestyle suggestions.";

            var userContent =
                "Framingham 10-year cardiovascular risk assessment:\n" +
                $"- Age: {input.Age}\n" +
                $"- Sex: {input.Sex}\n" +
                $"- Systolic blood pressure: {input.SystolicBp} mmHg " +
                $"({(input.BpTreated ? "treated" : "untreated")})\n" +
                $"- Total cholesterol: {input.TotalCholesterol} mmol/L\n" +
                $"- HDL: {input.Hdl} mmol/L\n" +
                $"- Smoker: {(input.Smoker ? "yes" : "no")}\n" +
                $"- Diabetic: {(input.Diabetic ? "yes" : "no")}\n\n" +
                $"Computed result: total score {result.TotalPoints} points, estimated 10-year risk " +
                $"{result.RiskPercent}%, heart age {result.HeartAge} years, risk level {result.Level}.\n\n" +
                "Explain what this means for the person and offer lifestyle suggestions as JSON.";

            var requestBody = new
            {
                model,
                max_tokens = 1024,
                temperature = 0.4,
                response_format = new { type = "json_object" },
                messages = new object[]
                {
                    new { role = "system", content = system },
                    new { role = "user", content = userContent },
                },
            };

            using var req = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/chat/completions");
            req.Headers.Add("Authorization", $"Bearer {apiKey}");
            req.Content = new StringContent(
                JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

            using var resp = await _http.SendAsync(req, ct);
            var raw = await resp.Content.ReadAsStringAsync(ct);
            if (!resp.IsSuccessStatusCode)
            {
                _logger.LogWarning("LLM API returned {Status}: {Body}", resp.StatusCode, raw);
                return await _fallback.ExplainAsync(input, result, ct);
            }

            using var doc = JsonDocument.Parse(raw);
            var content = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            var parsed = JsonSerializer.Deserialize<ModelOutput>(
                content ?? "", new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (parsed?.Summary is null || parsed.Suggestions is null || parsed.Suggestions.Count == 0)
            {
                _logger.LogWarning("LLM output could not be parsed; using fallback.");
                return await _fallback.ExplainAsync(input, result, ct);
            }

            return new Explanation(parsed.Summary, parsed.Suggestions, "ai");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get AI explanation; using fallback.");
            return await _fallback.ExplainAsync(input, result, ct);
        }
    }

    private record ModelOutput(
        [property: JsonPropertyName("summary")] string Summary,
        [property: JsonPropertyName("suggestions")] List<string> Suggestions);
}
