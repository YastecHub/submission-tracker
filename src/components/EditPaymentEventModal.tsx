import { useState, type FormEvent } from 'react';
import axios from 'axios';
import type { PaymentEvent } from '../types';
import { updatePaymentEvent } from '../features/payments/api/events';

function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const labelClass = 'block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider';

/** Edit any detail of a payment, even while students are paying. */
export default function EditPaymentEventModal({ event, onSaved, onCancel }: { event: PaymentEvent; onSaved: (message: string) => void; onCancel: () => void }) {
  const initial = {
    title: event.title,
    amount: String(Number(event.amount)),
    bankName: event.bankName,
    accountName: event.accountName,
    accountNumber: event.accountNumber,
    description: event.description ?? '',
    deadline: toLocalInput(event.deadline),
  };
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (key: keyof typeof form) => (value: string) => { setForm((current) => ({ ...current, [key]: value })); setError(''); };

  const paid = event.totalReceipts ?? 0;
  const priceChanged = Number(form.amount.replace(/,/g, '')) !== Number(event.amount);
  const accountChanged = form.bankName.trim() !== event.bankName || form.accountName.trim() !== event.accountName || form.accountNumber.trim() !== event.accountNumber;

  async function submit(submitEvent: FormEvent) {
    submitEvent.preventDefault();
    const changes: Record<string, unknown> = {};
    for (const key of ['title', 'amount', 'bankName', 'accountName', 'accountNumber', 'description'] as const) {
      if (form[key].trim() !== initial[key]) changes[key] = form[key];
    }
    // Only send the deadline if it was changed, so an expired payment can still be edited.
    if (form.deadline !== initial.deadline) {
      const deadline = new Date(form.deadline);
      if (Number.isNaN(deadline.getTime())) { setError('Choose a valid deadline.'); return; }
      changes.deadline = deadline.toISOString();
    }
    if (!Object.keys(changes).length) { onCancel(); return; }
    setSaving(true);
    try {
      await updatePaymentEvent(event.id, changes);
      onSaved(priceChanged || accountChanged ? 'Saved. Students have been notified of the change.' : 'Payment details saved.');
    } catch (caught) {
      const message = axios.isAxiosError(caught) ? (caught.response?.data as { error?: string } | undefined)?.error : null;
      setError(message ?? 'The changes could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="edit-payment-title">
      <div className="absolute inset-0 bg-black/70" onClick={saving ? undefined : onCancel} />
      <form onSubmit={submit} className="relative card-base w-full max-w-md max-h-[90dvh] overflow-y-auto p-5 sm:p-6 z-10 space-y-4">
        <div>
          <h2 id="edit-payment-title" className="text-lg font-semibold">Edit payment</h2>
          {paid > 0 && (
            <p className="text-xs text-dim mt-1">
              {paid} {paid === 1 ? 'student has' : 'students have'} already submitted a receipt. They stay paid at the price they submitted against, whatever you change here.
            </p>
          )}
        </div>
        <div>
          <label htmlFor="edit-payment-name" className={labelClass}>Title</label>
          <input id="edit-payment-name" required maxLength={150} className="input-base" value={form.title} onChange={(e) => set('title')(e.target.value)} />
        </div>
        <div>
          <label htmlFor="edit-payment-amount" className={labelClass}>Amount (₦)</label>
          <input id="edit-payment-amount" required inputMode="decimal" className="input-base" value={form.amount} onChange={(e) => set('amount')(e.target.value)} />
          {priceChanged && <p className="text-xs text-accent mt-1">New receipts are checked against the new price, and students get a notification.</p>}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="edit-payment-bank" className={labelClass}>Bank</label>
            <input id="edit-payment-bank" required maxLength={100} className="input-base" value={form.bankName} onChange={(e) => set('bankName')(e.target.value)} />
          </div>
          <div>
            <label htmlFor="edit-payment-number" className={labelClass}>Account number</label>
            <input id="edit-payment-number" required maxLength={50} inputMode="numeric" className="input-base font-mono" value={form.accountNumber} onChange={(e) => set('accountNumber')(e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor="edit-payment-account-name" className={labelClass}>Account name</label>
          <input id="edit-payment-account-name" required maxLength={100} className="input-base" value={form.accountName} onChange={(e) => set('accountName')(e.target.value)} />
          {accountChanged && <p className="text-xs text-accent mt-1">Students get a notification with the new account details.</p>}
        </div>
        <div>
          <label htmlFor="edit-payment-description" className={labelClass}>Description <span className="normal-case font-normal text-dim">(optional)</span></label>
          <textarea id="edit-payment-description" rows={2} className="input-base" value={form.description} onChange={(e) => set('description')(e.target.value)} />
        </div>
        <div>
          <label htmlFor="edit-payment-deadline" className={labelClass}>Deadline</label>
          <input id="edit-payment-deadline" type="datetime-local" required className="input-base" value={form.deadline} onChange={(e) => set('deadline')(e.target.value)} />
        </div>
        {error && <p role="alert" className="alert-danger text-sm">{error}</p>}
        <div className="flex gap-3">
          <button type="button" className="btn-secondary flex-1" disabled={saving} onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form>
    </div>
  );
}
