import { useState } from 'react';
import {
  calculateRisk,
  type PatientInput,
  type RiskResult,
} from './lib/framingham';
import { fetchRisk, fetchExplanation, type Explanation } from './lib/api';
import { initialForm, type FormState } from './lib/form';
import { RiskForm } from './components/RiskForm';
import { RiskResult as RiskResultCard } from './components/RiskResult';
import { HistoryTable } from './components/HistoryTable';
import { useEntranceAnimation } from './hooks/useEntranceAnimation';
import { useAssessmentHistory } from './hooks/useAssessmentHistory';

function App() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [result, setResult] = useState<RiskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submittedInput, setSubmittedInput] = useState<PatientInput | null>(null);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [explaining, setExplaining] = useState(false);

  const pageRef = useEntranceAnimation<HTMLDivElement>();
  const { history, reload } = useAssessmentHistory();

  const update = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

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
      setError('Please fill in age, systolic BP, total cholesterol and HDL.');
      return;
    }

    setSubmittedInput(input);

    try {
      setResult(await fetchRisk(input));
      reload();
    } catch (apiError) {
      // API down, so calculate locally instead.
      try {
        setResult(calculateRisk(input));
      } catch {
        setError(apiError instanceof Error ? apiError.message : 'Could not calculate the risk score.');
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
      setExplanation(await fetchExplanation(submittedInput));
    } catch {
      setError('Could not generate an explanation right now. Please try again.');
    } finally {
      setExplaining(false);
    }
  };

  return (
    <div ref={pageRef} className="mx-auto max-w-[980px] px-4 pt-8 pb-16">
      <header data-enter className="mb-6 text-center">
        <h1 className="m-0 text-[1.9rem] font-bold text-ink">
          Framingham Risk Calculator
        </h1>
        <p className="mt-1 mb-0 text-muted">
          10-year cardiovascular disease risk estimate
        </p>
      </header>

      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-[1.4fr_1fr]">
        <RiskForm
          form={form}
          error={error}
          onChange={update}
          onSubmit={onSubmit}
          onReset={onReset}
        />
        <RiskResultCard
          result={result}
          name={form.name}
          explanation={explanation}
          explaining={explaining}
          onExplain={onExplain}
        />
      </div>

      <HistoryTable history={history} />
    </div>
  );
}

export default App;
