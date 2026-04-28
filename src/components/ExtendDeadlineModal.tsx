import { useState, FormEvent } from 'react';

interface Props {
  title: string;
  eventTitle: string;
  currentDeadline: string;
  loading?: boolean;
  onConfirm: (deadline: string) => void;
  onCancel: () => void;
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ExtendDeadlineModal({
  title,
  eventTitle,
  currentDeadline,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const suggested = new Date();
  const current = new Date(currentDeadline);
  const base = current > suggested ? current : suggested;
  const defaultValue = toLocalInputValue(new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000));

  const [value, setValue] = useState<string>(defaultValue);
  const [error, setError] = useState<string>('');

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    if (!value) {
      setError('Please pick a new deadline.');
      return;
    }
    const picked = new Date(value);
    if (isNaN(picked.getTime())) {
      setError('Invalid date.');
      return;
    }
    if (picked <= new Date()) {
      setError('Deadline must be in the future.');
      return;
    }
    setError('');
    onConfirm(picked.toISOString());
  }

  const currentDeadlineStr = current.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/70" onClick={loading ? undefined : onCancel} />

      <form
        onSubmit={handleSubmit}
        className="relative card-base w-full max-w-sm p-6 z-10 animate-fade-up"
      >
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <p className="text-sm text-muted mb-1">"{eventTitle}"</p>
        <p className="text-xs text-dim mb-4">Current deadline: {currentDeadlineStr}</p>

        <label className="block text-sm font-medium mb-1" htmlFor="extend-deadline">
          New deadline
        </label>
        <input
          id="extend-deadline"
          type="datetime-local"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError('');
          }}
          className="input-base w-full mb-2"
          disabled={loading}
          required
        />
        {error && <p className="text-xs text-danger mb-2">{error}</p>}
        <p className="text-xs text-dim mb-5">
          Submissions will reopen and accept entries until this time.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? 'Please wait…' : 'Extend'}
          </button>
        </div>
      </form>
    </div>
  );
}
