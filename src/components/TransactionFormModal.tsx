import { useState, useEffect, FormEvent } from 'react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';
import { createTransactionRequest, updateTransactionRequest } from '../api/transactions';
import type { Transaction, TransactionType } from '../types';

const CATEGORIES = ['Dues', 'Printing', 'Purchase', 'Refund', 'Reimbursement', 'Utilities', 'Event', 'Other'];

interface Props {
  transaction: Transaction | null;
  onClose: () => void;
  onSaved: (t: Transaction) => void;
}

function toDateInput(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function TransactionFormModal({ transaction, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const isEdit = !!transaction;

  const [type, setType] = useState<TransactionType>(transaction?.type ?? 'debit');
  const [amount, setAmount] = useState(transaction?.amount ?? '');
  const [description, setDescription] = useState(transaction?.description ?? '');
  const [category, setCategory] = useState(transaction?.category ?? '');
  const [occurredAt, setOccurredAt] = useState(
    transaction ? toDateInput(transaction.occurredAt) : toDateInput(new Date().toISOString())
  );
  const [proof, setProof] = useState<File | null>(null);
  const [removeProof, setRemoveProof] = useState(false);
  const [existingProofUrl, setExistingProofUrl] = useState<string | null>(transaction?.proofUrl ?? null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (proof) setRemoveProof(false);
  }, [proof]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!amount || !description.trim() || !occurredAt) {
      toast('Please fill in all required fields', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        type,
        amount,
        description: description.trim(),
        category: category.trim() || undefined,
        occurredAt: new Date(occurredAt).toISOString(),
        proof,
        removeProof,
      };
      const result = isEdit
        ? await updateTransactionRequest(transaction!.id, payload)
        : await createTransactionRequest(payload);
      toast(isEdit ? 'Transaction updated' : 'Transaction added', 'success');
      onSaved(result);
      onClose();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast(err.response?.data?.error ?? 'Failed to save transaction', 'error');
      } else {
        toast('Failed to save transaction', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div className="relative card-base w-full max-w-md p-6 my-8 z-10 animate-fade-up">
        <h3 className="font-bold text-lg mb-4">
          {isEdit ? 'Edit Transaction' : 'New Transaction'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('credit')}
                className={`py-2.5 rounded-lg text-sm font-semibold border transition ${
                  type === 'credit'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-surface-2 text-muted border-nx hover:border-[color:var(--nx-border-hover)]'
                }`}
              >
                ↓ Money In
              </button>
              <button
                type="button"
                onClick={() => setType('debit')}
                className={`py-2.5 rounded-lg text-sm font-semibold border transition ${
                  type === 'debit'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-surface-2 text-muted border-nx hover:border-[color:var(--nx-border-hover)]'
                }`}
              >
                ↑ Money Out
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1">
              Amount (₦) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-base"
              placeholder="2000"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-base"
              placeholder="e.g. Printing for group project"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1">
              Category <span className="text-dim font-normal">(optional)</span>
            </label>
            <input
              type="text"
              list="tx-categories"
              maxLength={50}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-base"
              placeholder="Printing"
            />
            <datalist id="tx-categories">
              {CATEGORIES.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="input-base [color-scheme:dark]"
            />
          </div>

          {/* Proof */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1">
              Proof image <span className="text-dim font-normal">(optional)</span>
            </label>
            {existingProofUrl && !proof && !removeProof && (
              <div className="mb-2 flex items-center gap-2">
                <img src={existingProofUrl} alt="Current proof" className="w-14 h-14 rounded-lg object-cover border border-nx" />
                <button
                  type="button"
                  onClick={() => { setRemoveProof(true); setExistingProofUrl(null); }}
                  className="text-xs text-danger hover:underline"
                >
                  Remove
                </button>
              </div>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => setProof(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 file:font-semibold hover:file:bg-emerald-100"
            />
            {proof && <p className="text-xs text-dim mt-1">{proof.name}</p>}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex-1"
            >
              {submitting ? 'Saving...' : isEdit ? 'Save' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
