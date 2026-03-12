import { useState } from 'react';
import api from '../api/axios';
import type { Submission } from '../types';
import { useToast } from '../context/ToastContext';

interface Props {
  submission: Submission;
  onConfirmed: (updated: Submission) => void;
}

export default function ConfirmButton({ submission, onConfirmed }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  if (submission.isConfirmed) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
        <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
        Confirmed
      </span>
    );
  }

  async function handleConfirm(): Promise<void> {
    setLoading(true);
    try {
      const res = await api.patch<Submission>(`/api/submissions/${submission.id}/confirm`);
      onConfirmed(res.data);
    } catch {
      toast('Failed to confirm submission.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleConfirm}
      disabled={loading}
      className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg transition disabled:opacity-60"
    >
      {loading ? '...' : 'Confirm'}
    </button>
  );
}
