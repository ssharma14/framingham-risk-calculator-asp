import type { AssessmentSummary } from '../lib/api';
import { cardClass, noteClass, headingClass, levelBg } from '../lib/ui';

const columns = ['When', 'Age', 'Sex', 'Systolic', '10-yr risk', 'Heart age', 'Level'];
const cellClass = 'whitespace-nowrap border-b border-line px-3 py-2.5';

export function HistoryTable({ history }: { history: AssessmentSummary[] }) {
  return (
    <div data-enter className={`mt-5 ${cardClass}`}>
      <h2 className={`${headingClass} mb-3`}>Your recent assessments</h2>
      <p className={noteClass}>
        Only the calculations from this browser are shown, stored by the API in
        SQLite and scoped to your session. No names or identifying details are saved.
      </p>
      {history.length === 0 ? (
        <p className="text-[0.95rem] text-faint">
          No assessments yet. Calculate a risk score above and it will appear here.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[0.9rem]">
            <thead>
              <tr>
                {columns.map((h) => (
                  <th
                    key={h}
                    className={`${cellClass} text-left text-[0.78rem] uppercase tracking-[0.03em] text-muted`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id} className="hover:bg-tint">
                  <td className={cellClass}>
                    {new Date(row.createdAt + 'Z').toLocaleString()}
                  </td>
                  <td className={cellClass}>{row.age}</td>
                  <td className={cellClass}>{row.sex}</td>
                  <td className={cellClass}>{row.systolicBp}</td>
                  <td className={cellClass}>{row.riskPercent}%</td>
                  <td className={cellClass}>{row.heartAge}</td>
                  <td className={cellClass}>
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-[0.78rem] font-bold text-white ${levelBg[row.level]}`}
                    >
                      {row.level}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
