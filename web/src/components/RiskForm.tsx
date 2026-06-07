import type { FormState } from '../lib/form';
import {
  cardClass,
  noteClass,
  inputClass,
  fieldClass,
  fieldLabel,
  radioRow,
  radioLabel,
  btnBase,
  btnPrimary,
} from '../lib/ui';

interface RiskFormProps {
  form: FormState;
  error: string | null;
  onChange: (patch: Partial<FormState>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onReset: () => void;
}

// Two-option radio group, reused for sex / BP / smoker / diabetic.
interface ChoiceProps {
  label: string;
  name: string;
  options: [string, string];
  value: boolean;
  onSelect: (value: boolean) => void;
}

function BooleanChoice({ label, name, options, value, onSelect }: ChoiceProps) {
  return (
    <fieldset className={fieldClass}>
      <span className={fieldLabel}>{label}</span>
      <div className={radioRow}>
        <label className={radioLabel}>
          <input
            type="radio"
            name={name}
            checked={!value}
            onChange={() => onSelect(false)}
          />
          {options[0]}
        </label>
        <label className={radioLabel}>
          <input
            type="radio"
            name={name}
            checked={value}
            onChange={() => onSelect(true)}
          />
          {options[1]}
        </label>
      </div>
    </fieldset>
  );
}

export function RiskForm({ form, error, onChange, onSubmit, onReset }: RiskFormProps) {
  return (
    <form data-enter className={cardClass} onSubmit={onSubmit}>
      <p className={noteClass}>
        For <b>primary prevention</b> in patients aged 30+. Not for those with known
        heart disease. Educational use only &mdash; not medical advice.
      </p>

      <label className={fieldClass}>
        <span className={fieldLabel}>Name</span>
        <input
          type="text"
          className={inputClass}
          value={form.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Optional"
        />
      </label>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={fieldClass}>
          <span className={fieldLabel}>Age *</span>
          <input
            type="number"
            min={30}
            className={inputClass}
            value={form.age}
            onChange={(e) => onChange({ age: e.target.value })}
            required
          />
        </label>

        <BooleanChoice
          label="Sex *"
          name="sex"
          options={['Male', 'Female']}
          value={form.sex === 'female'}
          onSelect={(v) => onChange({ sex: v ? 'female' : 'male' })}
        />

        <label className={fieldClass}>
          <span className={fieldLabel}>Systolic BP (mmHg) *</span>
          <input
            type="number"
            min={10}
            className={inputClass}
            value={form.systolicBp}
            onChange={(e) => onChange({ systolicBp: e.target.value })}
            required
          />
        </label>

        <BooleanChoice
          label="Blood pressure"
          name="bp"
          options={['Untreated', 'Treated']}
          value={form.bpTreated}
          onSelect={(v) => onChange({ bpTreated: v })}
        />

        <label className={fieldClass}>
          <span className={fieldLabel}>Total cholesterol (mmol/L) *</span>
          <input
            type="number"
            step="0.1"
            min={0}
            className={inputClass}
            value={form.totalCholesterol}
            onChange={(e) => onChange({ totalCholesterol: e.target.value })}
            required
          />
        </label>

        <label className={fieldClass}>
          <span className={fieldLabel}>HDL (mmol/L) *</span>
          <input
            type="number"
            step="0.1"
            min={0}
            className={inputClass}
            value={form.hdl}
            onChange={(e) => onChange({ hdl: e.target.value })}
            required
          />
        </label>

        <BooleanChoice
          label="Smoker?"
          name="smoker"
          options={['No', 'Yes']}
          value={form.smoker}
          onSelect={(v) => onChange({ smoker: v })}
        />

        <BooleanChoice
          label="Diabetic?"
          name="diabetic"
          options={['No', 'Yes']}
          value={form.diabetic}
          onSelect={(v) => onChange({ diabetic: v })}
        />
      </div>

      {error && <p className="mt-4 mb-0 text-[0.9rem] text-risk-high">{error}</p>}

      <div className="mt-6 flex gap-3">
        <button type="submit" className={`${btnBase} ${btnPrimary}`}>
          Calculate
        </button>
        <button type="button" className={btnBase} onClick={onReset}>
          Reset
        </button>
      </div>
    </form>
  );
}
