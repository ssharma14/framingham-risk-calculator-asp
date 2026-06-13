import type { RiskResult } from './framingham';

export const cardClass =
  'rounded-xl border border-line bg-surface p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]';
export const noteClass =
  'mt-0 mb-5 rounded-lg bg-tint px-3 py-2.5 text-[0.85rem] text-muted';
export const headingClass = 'm-0 text-[1.2rem] font-bold text-ink';

export const inputClass =
  'w-full rounded-md border border-line-soft px-2.5 py-2 text-[0.95rem] focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15';
export const fieldClass = 'm-0 flex flex-col gap-1.5 border-none p-0';
export const fieldLabel = 'text-[0.82rem] font-semibold text-ink-soft';
export const radioRow = 'flex gap-[1.1rem] pt-1';
export const radioLabel = 'flex items-center gap-1.5 text-[0.9rem] text-ink-soft';

export const btnBase =
  'cursor-pointer rounded-lg border border-line-soft bg-surface px-[1.4rem] py-2.5 text-[0.95rem] font-semibold text-ink-soft';
export const btnPrimary = 'border-brand bg-brand text-white hover:bg-brand-dark';

// Literal strings so Tailwind's scanner keeps them.
export const levelBg: Record<RiskResult['level'], string> = {
  Low: 'bg-risk-low',
  Moderate: 'bg-risk-moderate',
  High: 'bg-risk-high',
};
