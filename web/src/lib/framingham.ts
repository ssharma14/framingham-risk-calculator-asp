// Framingham 10-year cardiovascular risk — TypeScript port of the original
// FraminghamCalculator.js. Pure functions, no DOM access, fully unit-testable.
// In Phase 3 this same contract is served by the ASP.NET Core API; the UI can
// then call the API instead of computing locally.

export type Sex = 'male' | 'female';
export type RiskLevel = 'Low' | 'Moderate' | 'High';

export interface PatientInput {
  age: number;
  sex: Sex;
  bpTreated: boolean;
  systolicBp: number;
  totalCholesterol: number; // mmol/L
  hdl: number; // mmol/L
  smoker: boolean;
  diabetic: boolean;
}

export interface RiskResult {
  totalPoints: number;
  riskPercent: string; // e.g. "12.0", "<1", ">30"
  heartAge: string; // e.g. "45", "<30", ">80"
  level: RiskLevel;
}

// risk percentage [male, female] — index 0 corresponds to a score of -3
const CVD_RISK_TABLE: [string | number, string | number][] = [
  ['<1', '<1'], [1.1, '<1'], [1.4, 1.0], [1.6, 1.2], [1.9, 1.5], [2.3, 1.7],
  [2.8, 2.0], [3.3, 2.3], [3.9, 2.8], [4.7, 3.3], [5.6, 3.9], [6.7, 4.5],
  [7.9, 5.3], [9.4, 6.3], [11.2, 7.3], [13.3, 8.6], [15.6, 10.0], [18.4, 11.7],
  [21.6, 13.7], [25.3, 15.9], [29.4, 18.5], ['>30', 21.5], ['>30', 24.8],
  ['>30', 27.5], ['>30', '>30'],
];

// heart age in years [male, female] — index 0 corresponds to a score of -1
const HEART_AGE_TABLE: [string | number, string | number][] = [
  ['<30', '<30'], [30, '<30'], [32, 31], [34, 34], [36, 36], [38, 39], [40, 42],
  [42, 45], [45, 48], [48, 51], [51, 55], [54, 59], [57, 64], [60, 68],
  [64, 73], [68, 79], [72, '>80'], [76, '>80'], ['>80', '>80'],
];

function ageScore(age: number, sex: Sex): number {
  if (age <= 34) return 0;
  if (age <= 39) return 2;
  if (age <= 44) return sex === 'male' ? 5 : 4;
  if (age <= 49) return sex === 'male' ? 7 : 5;
  if (age <= 54) return sex === 'male' ? 8 : 7;
  if (age <= 59) return sex === 'male' ? 10 : 8;
  if (age <= 64) return sex === 'male' ? 11 : 9;
  if (age <= 69) return sex === 'male' ? 13 : 10;
  if (age <= 74) return sex === 'male' ? 14 : 11;
  return sex === 'male' ? 15 : 12;
}

function cholesterolScore(chol: number, sex: Sex): number {
  if (chol < 4.1) return 0;
  if (chol < 5.2) return 1;
  if (chol < 6.2) return sex === 'male' ? 2 : 3;
  if (chol <= 7.2) return sex === 'male' ? 3 : 4;
  return sex === 'male' ? 4 : 5;
}

function hdlScore(hdl: number): number {
  if (hdl < 0.9) return 2;
  if (hdl <= 1.19) return 1;
  if (hdl <= 1.29) return 0;
  if (hdl <= 1.6) return -1;
  return -2;
}

function bloodPressureScore(systolic: number, sex: Sex, treated: boolean): number {
  if (systolic < 120) {
    if (sex === 'male') return treated ? 0 : -2;
    return treated ? -1 : -3;
  }
  if (systolic <= 129) return treated ? 2 : 0;
  if (systolic <= 139) return treated ? 3 : 1;
  if (systolic <= 149) {
    if (sex === 'male') return treated ? 4 : 2;
    return treated ? 5 : 2;
  }
  if (systolic <= 159) {
    if (sex === 'male') return treated ? 4 : 2;
    return treated ? 6 : 4;
  }
  if (sex === 'male') return treated ? 5 : 3;
  return treated ? 7 : 5;
}

function smokingScore(smoker: boolean, sex: Sex): number {
  if (!smoker) return 0;
  return sex === 'male' ? 4 : 3;
}

function diabetesScore(diabetic: boolean, sex: Sex): number {
  if (!diabetic) return 0;
  return sex === 'male' ? 3 : 4;
}

function lookup(
  table: [string | number, string | number][],
  index: number,
  sex: Sex,
): string {
  const col = sex === 'male' ? 0 : 1;
  const value = table[index][col];
  return String(value);
}

// Numeric magnitude used to bucket the risk into Low/Moderate/High.
function riskMagnitude(riskPercent: string): number {
  return parseFloat(riskPercent.replace(/[<>]/g, ''));
}

function riskLevel(riskPercent: string): RiskLevel {
  const value = riskMagnitude(riskPercent);
  if (value < 10) return 'Low';
  if (value >= 20) return 'High';
  return 'Moderate';
}

export class ValidationError extends Error {}

function validate(input: PatientInput): void {
  if (Number.isNaN(input.age) || input.age < 30) {
    throw new ValidationError(
      'The Framingham calculator only applies to patients aged 30 and over.',
    );
  }
  if (!(input.systolicBp >= 10)) {
    throw new ValidationError('Enter a systolic blood pressure of at least 10 mmHg.');
  }
  if (!(input.totalCholesterol >= 0)) {
    throw new ValidationError('Total cholesterol must be 0 or greater.');
  }
  if (!(input.hdl >= 0)) {
    throw new ValidationError('HDL must be 0 or greater.');
  }
}

export function calculateRisk(input: PatientInput): RiskResult {
  validate(input);

  const totalPoints =
    ageScore(input.age, input.sex) +
    cholesterolScore(input.totalCholesterol, input.sex) +
    hdlScore(input.hdl) +
    bloodPressureScore(input.systolicBp, input.sex, input.bpTreated) +
    smokingScore(input.smoker, input.sex) +
    diabetesScore(input.diabetic, input.sex);

  // risk table starts at score -3 (clamped to its valid range)
  const riskIndex = Math.min(Math.max(totalPoints + 3, 0), CVD_RISK_TABLE.length - 1);
  // heart-age table starts at score -1
  const heartIndex = Math.min(Math.max(totalPoints + 1, 0), HEART_AGE_TABLE.length - 1);

  const riskPercent = lookup(CVD_RISK_TABLE, riskIndex, input.sex);
  const heartAge = lookup(HEART_AGE_TABLE, heartIndex, input.sex);

  return {
    totalPoints,
    riskPercent,
    heartAge,
    level: riskLevel(riskPercent),
  };
}
