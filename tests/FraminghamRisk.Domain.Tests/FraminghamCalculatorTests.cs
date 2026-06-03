using FraminghamRisk.Domain;
using Xunit;

namespace FraminghamRisk.Domain.Tests;

public class FraminghamCalculatorTests
{
    private readonly FraminghamCalculator _calc = new();

    [Fact]
    public void Calculate_ModerateRiskMale_ReturnsExpectedResult()
    {
        // age 50 (8) + chol 6.0 (2) + HDL 1.0 (1) + BP 130 untreated (1) = 12 points
        var input = new PatientInput(
            Age: 50, Sex: Sex.Male, BpTreated: false, SystolicBp: 130,
            TotalCholesterol: 6.0, Hdl: 1.0, Smoker: false, Diabetic: false);

        var result = _calc.Calculate(input);

        Assert.Equal(12, result.TotalPoints);
        Assert.Equal("13.3", result.RiskPercent);
        Assert.Equal("60", result.HeartAge);
        Assert.Equal(RiskLevel.Moderate, result.Level);
    }

    [Fact]
    public void Calculate_LowRiskFemale_ClampsToTableFloor()
    {
        // age 35 (2) + chol 4.0 (0) + HDL 1.7 (-2) + BP 110 untreated (-3) = -3 points
        var input = new PatientInput(
            Age: 35, Sex: Sex.Female, BpTreated: false, SystolicBp: 110,
            TotalCholesterol: 4.0, Hdl: 1.7, Smoker: false, Diabetic: false);

        var result = _calc.Calculate(input);

        Assert.Equal(-3, result.TotalPoints);
        Assert.Equal("<1", result.RiskPercent);
        Assert.Equal("<30", result.HeartAge);
        Assert.Equal(RiskLevel.Low, result.Level);
    }

    [Fact]
    public void Calculate_HighRiskMale_ClampsToTableCeiling()
    {
        // age 75 (15) + chol 8 (4) + HDL 0.8 (2) + BP 170 treated (5) + smoker (4) + diabetic (3) = 33
        var input = new PatientInput(
            Age: 75, Sex: Sex.Male, BpTreated: true, SystolicBp: 170,
            TotalCholesterol: 8.0, Hdl: 0.8, Smoker: true, Diabetic: true);

        var result = _calc.Calculate(input);

        Assert.Equal(33, result.TotalPoints);
        Assert.Equal(">30", result.RiskPercent);
        Assert.Equal(">80", result.HeartAge);
        Assert.Equal(RiskLevel.High, result.Level);
    }

    [Theory]
    [InlineData(34, Sex.Male, 0)]
    [InlineData(35, Sex.Male, 2)]   // bracket boundary
    [InlineData(40, Sex.Male, 5)]
    [InlineData(40, Sex.Female, 4)] // sex difference
    [InlineData(75, Sex.Female, 12)]
    public void AgeBrackets_ScoreCorrectly(int age, Sex sex, int expectedAgeContribution)
    {
        // baseline (chol<4.1=0, HDL 1.2-1.29=0, BP 120-129 untreated=0, no smoke/diabetes)
        var input = new PatientInput(age, sex, false, 125, 4.0, 1.25, false, false);
        Assert.Equal(expectedAgeContribution, _calc.Calculate(input).TotalPoints);
    }

    [Fact]
    public void Calculate_UnderAge30_Throws()
    {
        var input = new PatientInput(29, Sex.Male, false, 120, 5.0, 1.2, false, false);
        Assert.Throws<ValidationException>(() => _calc.Calculate(input));
    }

    [Fact]
    public void Calculate_NegativeHdl_Throws()
    {
        var input = new PatientInput(45, Sex.Male, false, 120, 5.0, -1.0, false, false);
        Assert.Throws<ValidationException>(() => _calc.Calculate(input));
    }
}
