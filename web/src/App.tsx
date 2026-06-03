import { useEffect, useState } from 'react';
import {
  calculateRisk,
  type PatientInput,
  type RiskResult,
  type Sex,
} from './lib/framingham';
import {
  fetchRisk,
  fetchExplanation,
  fetchHistory,
  type Explanation,
  type AssessmentSummary,
} from './lib/api';
import './App.css';

interface FormState {
  name: string;
  age: string;
  sex: Sex;
  bpTreated: boolean;
  systolicBp: string;
  totalCholesterol: string;
  hdl: string;
  smoker: boolean;
  diabetic: boolean;
}

const initialForm: FormState = {
  name: '',
  age: '',
  sex: 'male',
  bpTreated: false,
  systolicBp: '',
  totalCholesterol: '',
  hdl: '',
  smoker: false,
  diabetic: false,
};

const levelColor: Record<RiskResult['level'], string> = {
  Low: '#009590',
  Moderate: '#e0b500',
  High: '#bf1e2e',
};

function App() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [result, setResult] = useState<RiskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submittedInput, setSubmittedInput] = useState<PatientInput | null>(null);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [history, setHistory] = useState<AssessmentSummary[]>([]);

  const update = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  // Load the persisted history on mount. Failures are non-fatal: if the API is
  // offline the calculator still works locally, just without a history list.
  const loadHistory = async () => {
    try {
      setHistory(await fetchHistory());
    } catch {
      /* history is best-effort */
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setExplanation(null);

    const input: PatientInput = {
      age: parseFloat(form.age),
      sex: form.sex,
      bpTreated: form.bpTreated,
      systolicBp: parseFloat(form.systolicBp),
      totalCholesterol: parseFloat(form.totalCholesterol),
      hdl: parseFloat(form.hdl),
      smoker: form.smoker,
      diabetic: form.diabetic,
    };

    if (
      [input.age, input.systolicBp, input.totalCholesterol, input.hdl].some(
        Number.isNaN
      )
    ) {
      setError(
        'Please fill in age, systolic BP, total cholesterol and HDL.'
      );
      return;
    }

    setSubmittedInput(input);

    try {
      const risk = await fetchRisk(input);
      setResult(risk);
      // The API persisted this assessment; pull the refreshed history.
      loadHistory();
    } catch (err) {
      try {
        setResult(calculateRisk(input));
      } catch {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Something went wrong while calculating.');
        }
      }
    }
  };

  const onReset = () => {
    setForm(initialForm);
    setResult(null);
    setError(null);
    setExplanation(null);
    setSubmittedInput(null);
  };

  const onExplain = async () => {
    if (!submittedInput) return;
    setExplaining(true);
    setExplanation(null);
    try {
      const ex = await fetchExplanation(submittedInput);
      setExplanation(ex);
    } catch {
      setError('Could not generate an explanation right now. Please try again.');
    } finally {
      setExplaining(false);
    }
  };

  return (
    <div className="page">
      <header className="header">
        <h1>Framingham Risk Calculator</h1>
        <p className="subtitle">10-year cardiovascular disease risk estimate</p>
      </header>

      <div className="layout">
        <form className="card form" onSubmit={onSubmit}>
          <p className="note">
            For <b>primary prevention</b> in patients aged 30+. Not for those with known
            heart disease. Educational use only &mdash; not medical advice.
          </p>

          <label className="field">
            <span>Name</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="Optional"
            />
          </label>

          <div className="grid">
            <label className="field">
              <span>Age *</span>
              <input
                type="number"
                min={30}
                value={form.age}
                onChange={(e) => update({ age: e.target.value })}
                required
              />
            </label>

            <fieldset className="field">
              <span>Sex *</span>
              <div className="radio-row">
                <label>
                  <input
                    type="radio"
                    name="sex"
                    checked={form.sex === 'male'}
                    onChange={() => update({ sex: 'male' })}
                  />
                  Male
                </label>
                <label>
                  <input
                    type="radio"
                    name="sex"
                    checked={form.sex === 'female'}
                    onChange={() => update({ sex: 'female' })}
                  />
                  Female
                </label>
              </div>
            </fieldset>

            <label className="field">
              <span>Systolic BP (mmHg) *</span>
              <input
                type="number"
                min={10}
                value={form.systolicBp}
                onChange={(e) => update({ systolicBp: e.target.value })}
                required
              />
            </label>

            <fieldset className="field">
              <span>Blood pressure</span>
              <div className="radio-row">
                <label>
                  <input
                    type="radio"
                    name="bp"
                    checked={!form.bpTreated}
                    onChange={() => update({ bpTreated: false })}
                  />
                  Untreated
                </label>
                <label>
                  <input
                    type="radio"
                    name="bp"
                    checked={form.bpTreated}
                    onChange={() => update({ bpTreated: true })}
                  />
                  Treated
                </label>
              </div>
            </fieldset>

            <label className="field">
              <span>Total cholesterol (mmol/L) *</span>
              <input
                type="number"
                step="0.1"
                min={0}
                value={form.totalCholesterol}
                onChange={(e) => update({ totalCholesterol: e.target.value })}
                required
              />
            </label>

            <label className="field">
              <span>HDL (mmol/L) *</span>
              <input
                type="number"
                step="0.1"
                min={0}
                value={form.hdl}
                onChange={(e) => update({ hdl: e.target.value })}
                required
              />
            </label>

            <fieldset className="field">
              <span>Smoker?</span>
              <div className="radio-row">
                <label>
                  <input
                    type="radio"
                    name="smoker"
                    checked={!form.smoker}
                    onChange={() => update({ smoker: false })}
                  />
                  No
                </label>
                <label>
                  <input
                    type="radio"
                    name="smoker"
                    checked={form.smoker}
                    onChange={() => update({ smoker: true })}
                  />
                  Yes
                </label>
              </div>
            </fieldset>

            <fieldset className="field">
              <span>Diabetic?</span>
              <div className="radio-row">
                <label>
                  <input
                    type="radio"
                    name="diabetic"
                    checked={!form.diabetic}
                    onChange={() => update({ diabetic: false })}
                  />
                  No
                </label>
                <label>
                  <input
                    type="radio"
                    name="diabetic"
                    checked={form.diabetic}
                    onChange={() => update({ diabetic: true })}
                  />
                  Yes
                </label>
              </div>
            </fieldset>
          </div>

          {error && <p className="error">{error}</p>}

          <div className="actions">
            <button type="submit" className="btn primary">
              Calculate
            </button>
            <button type="button" className="btn" onClick={onReset}>
              Reset
            </button>
          </div>
        </form>

        <div className="card result">
          <h2>Result</h2>
          {!result ? (
            <p className="placeholder">Fill in the form and press Calculate.</p>
          ) : (
            <>
              {form.name && <p className="result-name">{form.name}</p>}
              <div className="badge" style={{ backgroundColor: levelColor[result.level] }}>
                {result.level} Risk
              </div>
              <dl className="result-grid">
                <div>
                  <dt>10-year CVD risk</dt>
                  <dd>{result.riskPercent}%</dd>
                </div>
                <div>
                  <dt>Heart age</dt>
                  <dd>{result.heartAge} yrs</dd>
                </div>
                <div>
                  <dt>Total points</dt>
                  <dd>{result.totalPoints}</dd>
                </div>
              </dl>
              <div className="explain">
                {!explanation ? (
                  <button
                    type="button"
                    className="btn primary explain-btn"
                    onClick={onExplain}
                    disabled={explaining}
                  >
                    {explaining ? 'Generating…' : 'Explain my result with AI'}
                  </button>
                ) : (
                  <div className="explain-panel">
                    <div className="explain-head">
                      <h3>What this means</h3>
                      <span className="explain-source">
                        {explanation.source === 'ai' ? 'AI-generated' : 'Auto-generated'}
                      </span>
                    </div>
                    <p>{explanation.summary}</p>
                    <ul>
                      {explanation.suggestions.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <p className="disclaimer">
                This estimate is for education only and is not a substitute for
                professional medical advice.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="card history">
        <h2>Your recent assessments</h2>
        <p className="note">
          Only the calculations from this browser are shown, stored by the API in
          SQLite and scoped to your session. No names or identifying details are saved.
        </p>
        {history.length === 0 ? (
          <p className="placeholder">
            No assessments yet. Calculate a risk score above and it will appear here.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="history-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Age</th>
                  <th>Sex</th>
                  <th>Systolic</th>
                  <th>10-yr risk</th>
                  <th>Heart age</th>
                  <th>Level</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.createdAt + 'Z').toLocaleString()}</td>
                    <td>{row.age}</td>
                    <td>{row.sex}</td>
                    <td>{row.systolicBp}</td>
                    <td>{row.riskPercent}%</td>
                    <td>{row.heartAge}</td>
                    <td>
                      <span
                        className="level-pill"
                        style={{ backgroundColor: levelColor[row.level] }}
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
    </div>
  );
}

export default App;
