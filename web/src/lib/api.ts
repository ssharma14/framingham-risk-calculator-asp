import {
  type PatientInput,
  type RiskResult,
  type RiskLevel,
  type Sex,
} from './framingham';

const BASE = import.meta.env.VITE_API_URL ?? '';

export async function fetchRisk(input: PatientInput): Promise<RiskResult> {
  const res = await fetch(`${BASE}/api/assessments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Request failed');
  }
  return res.json();
}

export interface Explanation {
  summary: string;
  suggestions: string[];
  source: 'ai' | 'fallback';
}

export async function fetchExplanation(input: PatientInput): Promise<Explanation> {
  const res = await fetch(`${BASE}/api/assessments/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Request failed');
  }
  return res.json();
}

// One row of the persisted assessment history (GET /api/assessments).
export interface AssessmentSummary {
  id: number;
  createdAt: string; // ISO timestamp (UTC)
  age: number;
  sex: Sex | 'Male' | 'Female';
  systolicBp: number;
  smoker: boolean;
  diabetic: boolean;
  totalPoints: number;
  riskPercent: string;
  heartAge: string;
  level: RiskLevel;
}

export async function fetchHistory(): Promise<AssessmentSummary[]> {
  const res = await fetch(`${BASE}/api/assessments`);
  if (!res.ok) throw new Error('Could not load history');
  return res.json();
}
