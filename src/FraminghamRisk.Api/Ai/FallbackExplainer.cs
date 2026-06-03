using FraminghamRisk.Domain;

namespace FraminghamRisk.Api.Ai;

/// <summary>
/// Deterministic, rule-based explanation used when no AI provider is configured
/// or when a call to the model fails. Keeps the feature usable in any demo.
/// </summary>
public class FallbackExplainer : IRiskExplainer
{
    public Task<Explanation> ExplainAsync(
        PatientInput input, RiskResult result, CancellationToken ct = default)
    {
        var summary =
            $"Based on the information provided, the estimated 10-year risk of cardiovascular " +
            $"disease is {result.RiskPercent}%, which is considered " +
            $"{result.Level.ToString().ToLowerInvariant()} risk. The corresponding \"heart age\" " +
            $"is {result.HeartAge} years. This is a general estimate, not a diagnosis.";

        var suggestions = new List<string>();
        if (input.Smoker)
            suggestions.Add("Stopping smoking is one of the most effective ways to lower " +
                "cardiovascular risk; your healthcare provider can suggest support options.");
        if (input.SystolicBp >= 140)
            suggestions.Add("Your blood pressure is on the higher side. Regular monitoring and " +
                "a conversation with your doctor may help.");
        if (input.TotalCholesterol > 5.2)
            suggestions.Add("A heart-healthy diet lower in saturated fat can help manage " +
                "cholesterol levels.");
        suggestions.Add("Aim for regular physical activity, such as about 150 minutes of " +
            "moderate exercise per week, as generally recommended.");
        suggestions.Add("Discuss these results with a qualified healthcare professional for " +
            "advice tailored to you.");

        var top = suggestions.Take(4).ToList();
        return Task.FromResult(new Explanation(summary, top, "fallback"));
    }
}
