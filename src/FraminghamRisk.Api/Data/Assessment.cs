using FraminghamRisk.Domain;

namespace FraminghamRisk.Api.Data;

/// <summary>
/// A persisted Framingham assessment: the patient inputs, the computed result,
/// and when it was created. No patient-identifying data (e.g. name) is stored —
/// this is a privacy-conscious history of anonymous calculations.
/// </summary>
public class Assessment
{
    public int Id { get; set; }

    /// <summary>UTC timestamp. Stored as DateTime (not DateTimeOffset) so SQLite can ORDER BY it.</summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Opaque per-browser session id (from the "frs_session" cookie). History is
    /// scoped to this so a visitor only sees their own assessments, not everyone's.
    /// </summary>
    public string SessionId { get; set; } = "";

    // Inputs
    public int Age { get; set; }
    public Sex Sex { get; set; }
    public bool BpTreated { get; set; }
    public int SystolicBp { get; set; }
    public double TotalCholesterol { get; set; }
    public double Hdl { get; set; }
    public bool Smoker { get; set; }
    public bool Diabetic { get; set; }

    // Result
    public int TotalPoints { get; set; }
    public string RiskPercent { get; set; } = "";
    public string HeartAge { get; set; } = "";
    public RiskLevel Level { get; set; }

    public static Assessment From(PatientInput input, RiskResult result, DateTime createdAt, string sessionId) => new()
    {
        CreatedAt = createdAt,
        SessionId = sessionId,
        Age = input.Age,
        Sex = input.Sex,
        BpTreated = input.BpTreated,
        SystolicBp = input.SystolicBp,
        TotalCholesterol = input.TotalCholesterol,
        Hdl = input.Hdl,
        Smoker = input.Smoker,
        Diabetic = input.Diabetic,
        TotalPoints = result.TotalPoints,
        RiskPercent = result.RiskPercent,
        HeartAge = result.HeartAge,
        Level = result.Level,
    };
}
