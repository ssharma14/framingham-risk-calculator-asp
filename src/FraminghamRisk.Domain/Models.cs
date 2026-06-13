namespace FraminghamRisk.Domain;

public enum Sex { Male, Female }

public enum RiskLevel { Low, Moderate, High }

public record PatientInput(
    int Age,
    Sex Sex,
    bool BpTreated,
    int SystolicBp,
    double TotalCholesterol, // mmol/L
    double Hdl,              // mmol/L
    bool Smoker,
    bool Diabetic);

public record RiskResult(
    int TotalPoints,
    string RiskPercent, // e.g. "13.3", "<1", ">30"
    string HeartAge,    // e.g. "60", "<30", ">80"
    RiskLevel Level);

public class ValidationException : Exception
{
    public ValidationException(string message) : base(message) { }
}
