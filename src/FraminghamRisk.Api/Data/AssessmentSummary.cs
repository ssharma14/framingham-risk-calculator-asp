using FraminghamRisk.Domain;

namespace FraminghamRisk.Api.Data;

/// <summary>Shape returned by GET /api/assessments — a row in the history list.</summary>
public record AssessmentSummary(
    int Id,
    DateTime CreatedAt,
    int Age,
    Sex Sex,
    int SystolicBp,
    bool Smoker,
    bool Diabetic,
    int TotalPoints,
    string RiskPercent,
    string HeartAge,
    RiskLevel Level);
