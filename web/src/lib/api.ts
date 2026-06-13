import {
  type PatientInput,
  type RiskResult,
  type RiskLevel,
  type Sex,
} from './framingham';

const BASE = import.meta.env.VITE_API_URL ?? '';

// Stable per-browser id sent as X-Session-Id so history works without cookies.
function sessionId(): string {
  let id = localStorage.getItem('frs_session');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('frs_session', id);
  }
  return id;
}

async function post<T>(path: string, input: PatientInput): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'X-Session-Id': sessionId(), 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Request failed');
  }
  return res.json();
}

export function fetchRisk(input: PatientInput): Promise<RiskResult> {
  return post('/api/assessments', input);
}

export interface Explanation {
  summary: string;
  suggestions: string[];
  source: 'ai' | 'fallback';
}

export function fetchExplanation(input: PatientInput): Promise<Explanation> {
  return post('/api/assessments/explain', input);
}

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
  const res = await fetch(`${BASE}/api/assessments`, {
    headers: { 'X-Session-Id': sessionId() },
  });
  if (!res.ok) throw new Error('Could not load history');
  return res.json();
}
