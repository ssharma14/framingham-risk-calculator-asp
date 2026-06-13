using FraminghamRisk.Domain;

namespace FraminghamRisk.Api.Data;

// A persisted assessment. No name or identifying data is stored.
public class Assessment
{
    public int Id { get; set; }

    public DateTime CreatedAt { get; set; } // UTC; DateTime so SQLite can ORDER BY it
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
