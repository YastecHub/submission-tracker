import { GRADES } from '../model/gpa';
import type { Grade } from '../model/types';

const TONES: Record<Grade, string> = {
  A: '!border-emerald-500 text-emerald-400',
  B: '!border-sky-500 text-sky-400',
  C: '!border-amber-400 text-amber-400',
  D: '!border-orange-400 text-orange-400',
  E: '!border-orange-600 text-orange-500',
  F: '!border-red-500 text-red-400',
};

const NOT_OUT = '';

/** A plain dropdown: native on phones (a wheel / sheet), keyboard-friendly on desktop. */
export default function GradeSelect({
  id,
  value,
  onChange,
  label,
  disabled = false,
}: {
  id: string;
  value: Grade | null;
  onChange: (grade: Grade | null) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <>
      <label className="sr-only" htmlFor={id}>Grade for {label}</label>
      <select
        id={id}
        disabled={disabled}
        value={value ?? NOT_OUT}
        onChange={(event) => onChange(event.target.value === NOT_OUT ? null : event.target.value as Grade)}
        className={`input-base !py-2 text-sm font-semibold ${value ? TONES[value] : 'text-muted'}`}
      >
        <option value={NOT_OUT}>Select grade</option>
        {GRADES.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
      </select>
    </>
  );
}
