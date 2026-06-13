import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { RiskResult as RiskResultData } from '../lib/framingham';
import type { Explanation } from '../lib/api';
import { prefersReducedMotion } from '../lib/animation';
import { cardClass, headingClass, btnBase, btnPrimary, levelBg } from '../lib/ui';

interface RiskResultProps {
  result: RiskResultData | null;
  name: string;
  explanation: Explanation | null;
  explaining: boolean;
  onExplain: () => void;
}

const statClass = 'm-0 text-[1.25rem] font-bold text-ink';
const rowClass =
  'flex items-baseline justify-between border-b border-dotted border-line pb-2';

export function RiskResult({
  result,
  name,
  explanation,
  explaining,
  onExplain,
}: RiskResultProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const percentRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!result || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.from('[data-reveal]', {
        opacity: 0,
        y: 10,
        duration: 0.4,
        stagger: 0.06,
        ease: 'power2.out',
      });

      const raw = result.riskPercent;
      // Only count up plain numbers, not "<1" / ">30".
      if (percentRef.current && /^[0-9.]+$/.test(raw)) {
        const decimals = raw.split('.')[1]?.length ?? 0;
        const proxy = { v: 0 };
        gsap.to(proxy, {
          v: parseFloat(raw),
          duration: 0.8,
          ease: 'power1.out',
          onUpdate: () => {
            if (percentRef.current)
              percentRef.current.textContent = `${proxy.v.toFixed(decimals)}%`;
          },
          onComplete: () => {
            if (percentRef.current) percentRef.current.textContent = `${raw}%`;
          },
        });
      }
    }, cardRef);
    return () => ctx.revert();
  }, [result]);

  return (
    <div ref={cardRef} data-enter className={cardClass}>
      <h2 className={`${headingClass} mb-4`}>Result</h2>
      {!result ? (
        <p className="text-[0.95rem] text-faint">
          Fill in the form and press Calculate.
        </p>
      ) : (
        <>
          {name && (
            <p data-reveal className="mt-0 mb-2 font-semibold text-ink-soft">
              {name}
            </p>
          )}
          <div
            data-reveal
            className={`mb-5 inline-block rounded-full px-3.5 py-1.5 text-[0.95rem] font-bold text-white ${levelBg[result.level]}`}
          >
            {result.level} Risk
          </div>
          <dl data-reveal className="m-0 grid gap-[0.9rem]">
            <div className={rowClass}>
              <dt className="text-[0.9rem] text-muted">10-year CVD risk</dt>
              <dd ref={percentRef} className={statClass}>
                {result.riskPercent}%
              </dd>
            </div>
            <div className={rowClass}>
              <dt className="text-[0.9rem] text-muted">Heart age</dt>
              <dd className={statClass}>{result.heartAge} yrs</dd>
            </div>
            <div className={rowClass}>
              <dt className="text-[0.9rem] text-muted">Total points</dt>
              <dd className={statClass}>{result.totalPoints}</dd>
            </div>
          </dl>
          <div data-reveal className="mt-5">
            {!explanation ? (
              <button
                type="button"
                className={`${btnBase} ${btnPrimary} w-full disabled:cursor-default disabled:opacity-65`}
                onClick={onExplain}
                disabled={explaining}
              >
                {explaining ? 'Generating…' : 'Explain my result with AI'}
              </button>
            ) : (
              <div className="rounded-[10px] border border-tint-line bg-tint px-[1.1rem] py-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="m-0 text-base font-semibold text-ink">
                    What this means
                  </h3>
                  <span className="rounded-full bg-tint-line px-2 py-0.5 text-[0.7rem] uppercase tracking-[0.04em] text-muted">
                    {explanation.source === 'ai' ? 'AI-generated' : 'Auto-generated'}
                  </span>
                </div>
                <p className="m-0 mb-3 text-[0.92rem] text-ink-soft">
                  {explanation.summary}
                </p>
                <ul className="m-0 grid list-disc gap-1.5 pl-[1.1rem]">
                  {explanation.suggestions.map((suggestion) => (
                    <li key={suggestion} className="text-[0.88rem] text-ink-soft">
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <p data-reveal className="mt-5 mb-0 text-[0.78rem] text-faint">
            This estimate is for education only and is not a substitute for
            professional medical advice.
          </p>
        </>
      )}
    </div>
  );
}
