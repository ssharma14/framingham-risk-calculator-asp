import type { Sex } from './framingham';

export interface FormState {
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

export const initialForm: FormState = {
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
