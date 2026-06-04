import {
  type PatientInput,
  type RiskResult,
  type RiskLevel,
  type Sex,
} from './framingham';

const BASE = import.meta.env.VITE_API_URL ?? '';

// A stable per-browser session token kept in localStorage and sent as the
// X-Session-Id header. Scopes assessment history to this browser and works
// cross-origin (API on a different domain) without third-party cookies.
function sessionId(): string {
  let id = localStorage.getItem('frs_session');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('frs_session', id);
  }
  return id;
}

function headers(extra?: Record<string, string>): Record<string, string> {
  return { 'X-Session-Id': sessionId(), ...extra };
}

export async function fetchRisk(input: PatientInput): Promise<RiskResult> {
  const res = await fetch(`${BASE}/api/assessments`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
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
    headers: headers({ 'Content-Type': 'application/json' }),
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
  const res = await fetch(`${BASE}/api/assessments`, { headers: headers() });
  if (!res.ok) throw new Error('Could not load history');
  return res.json();
}
