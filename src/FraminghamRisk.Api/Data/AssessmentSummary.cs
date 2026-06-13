using FraminghamRisk.Domain;

namespace FraminghamRisk.Api.Data;

// Returned by GET /api/assessments.
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
