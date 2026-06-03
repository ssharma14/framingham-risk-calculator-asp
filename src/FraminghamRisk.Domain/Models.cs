namespace FraminghamRisk.Domain;

public enum Sex { Male, Female }

public enum RiskLevel { Low, Moderate, High }

/// <summary>Patient inputs for a Framingham assessment.</summary>
public record PatientInput(
    int Age,
    Sex Sex,
    bool BpTreated,
    int SystolicBp,
    double TotalCholesterol, // mmol/L
    double Hdl,              // mmol/L
    bool Smoker,
    bool Diabetic);

/// <summary>Computed 10-year cardiovascular risk result.</summary>
public record RiskResult(
    int TotalPoints,
    string RiskPercent, // e.g. "13.3", "<1", ">30"
    string HeartAge,    // e.g. "60", "<30", ">80"
    RiskLevel Level);

/// <summary>Thrown when patient inputs are outside the model's valid range.</summary>
public class ValidationException : Exception
{
    public ValidationException(string message) : base(message) { }
}
