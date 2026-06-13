using System.Globalization;

namespace FraminghamRisk.Domain;

// Framingham 10-year CVD risk score (ported from FraminghamCalculator.js).
public class FraminghamCalculator
{
    // [Male, Female], index 0 = score of -3
    private static readonly (string Male, string Female)[] CvdRiskTable =
    {
        ("<1", "<1"), ("1.1", "<1"), ("1.4", "1.0"), ("1.6", "1.2"), ("1.9", "1.5"),
        ("2.3", "1.7"), ("2.8", "2.0"), ("3.3", "2.3"), ("3.9", "2.8"), ("4.7", "3.3"),
        ("5.6", "3.9"), ("6.7", "4.5"), ("7.9", "5.3"), ("9.4", "6.3"), ("11.2", "7.3"),
        ("13.3", "8.6"), ("15.6", "10.0"), ("18.4", "11.7"), ("21.6", "13.7"),
        ("25.3", "15.9"), ("29.4", "18.5"), (">30", "21.5"), (">30", "24.8"),
        (">30", "27.5"), (">30", ">30"),
    };

    // [Male, Female], index 0 = score of -1
    private static readonly (string Male, string Female)[] HeartAgeTable =
    {
        ("<30", "<30"), ("30", "<30"), ("32", "31"), ("34", "34"), ("36", "36"),
        ("38", "39"), ("40", "42"), ("42", "45"), ("45", "48"), ("48", "51"),
        ("51", "55"), ("54", "59"), ("57", "64"), ("60", "68"), ("64", "73"),
        ("68", "79"), ("72", ">80"), ("76", ">80"), (">80", ">80"),
    };

    public RiskResult Calculate(PatientInput input)
    {
        Validate(input);

        int points =
            AgeScore(input.Age, input.Sex) +
            CholesterolScore(input.TotalCholesterol, input.Sex) +
            HdlScore(input.Hdl) +
            BloodPressureScore(input.SystolicBp, input.Sex, input.BpTreated) +
            SmokingScore(input.Smoker, input.Sex) +
            DiabetesScore(input.Diabetic, input.Sex);

        int riskIndex = Math.Clamp(points + 3, 0, CvdRiskTable.Length - 1);
        int heartIndex = Math.Clamp(points + 1, 0, HeartAgeTable.Length - 1);

        string risk = Column(CvdRiskTable[riskIndex], input.Sex);
        string heartAge = Column(HeartAgeTable[heartIndex], input.Sex);

        return new RiskResult(points, risk, heartAge, Level(risk));
    }

    private static string Column((string Male, string Female) row, Sex sex)
        => sex == Sex.Male ? row.Male : row.Female;

    private static void Validate(PatientInput input)
    {
        if (input.Age < 30)
            throw new ValidationException(
                "The Framingham calculator only applies to patients aged 30 and over.");
        if (input.SystolicBp < 10)
            throw new ValidationException("Enter a systolic blood pressure of at least 10 mmHg.");
        if (input.TotalCholesterol < 0)
            throw new ValidationException("Total cholesterol must be 0 or greater.");
        if (input.Hdl < 0)
            throw new ValidationException("HDL must be 0 or greater.");
    }

    private static int AgeScore(int age, Sex sex)
    {
        if (age <= 34) return 0;
        if (age <= 39) return 2;
        if (age <= 44) return sex == Sex.Male ? 5 : 4;
        if (age <= 49) return sex == Sex.Male ? 7 : 5;
        if (age <= 54) return sex == Sex.Male ? 8 : 7;
        if (age <= 59) return sex == Sex.Male ? 10 : 8;
        if (age <= 64) return sex == Sex.Male ? 11 : 9;
        if (age <= 69) return sex == Sex.Male ? 13 : 10;
        if (age <= 74) return sex == Sex.Male ? 14 : 11;
        return sex == Sex.Male ? 15 : 12;
    }

    private static int CholesterolScore(double chol, Sex sex)
    {
        if (chol < 4.1) return 0;
        if (chol < 5.2) return 1;
        if (chol < 6.2) return sex == Sex.Male ? 2 : 3;
        if (chol <= 7.2) return sex == Sex.Male ? 3 : 4;
        return sex == Sex.Male ? 4 : 5;
    }

    private static int HdlScore(double hdl)
    {
        if (hdl < 0.9) return 2;
        if (hdl <= 1.19) return 1;
        if (hdl <= 1.29) return 0;
        if (hdl <= 1.6) return -1;
        return -2;
    }

    private static int BloodPressureScore(int systolic, Sex sex, bool treated)
    {
        if (systolic < 120)
            return sex == Sex.Male ? (treated ? 0 : -2) : (treated ? -1 : -3);
        if (systolic <= 129) return treated ? 2 : 0;
        if (systolic <= 139) return treated ? 3 : 1;
        if (systolic <= 149)
            return sex == Sex.Male ? (treated ? 4 : 2) : (treated ? 5 : 2);
        if (systolic <= 159)
            return sex == Sex.Male ? (treated ? 4 : 2) : (treated ? 6 : 4);
        return sex == Sex.Male ? (treated ? 5 : 3) : (treated ? 7 : 5);
    }

    private static int SmokingScore(bool smoker, Sex sex)
        => !smoker ? 0 : (sex == Sex.Male ? 4 : 3);

    private static int DiabetesScore(bool diabetic, Sex sex)
        => !diabetic ? 0 : (sex == Sex.Male ? 3 : 4);

    private static RiskLevel Level(string riskPercent)
    {
        double v = double.Parse(
            riskPercent.Replace("<", "").Replace(">", ""), CultureInfo.InvariantCulture);
        if (v < 10) return RiskLevel.Low;
        if (v >= 20) return RiskLevel.High;
        return RiskLevel.Moderate;
    }
}
