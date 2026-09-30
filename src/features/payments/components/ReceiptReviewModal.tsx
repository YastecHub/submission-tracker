import type { PaymentReceipt } from '../../../types';
import { useDialogFocus } from '../../../hooks/useDialogFocus';

export interface ReceiptAction {
  type: 'confirm' | 'reject';
  receipt: PaymentReceipt;
}

export function ReceiptReviewModal({ action, note, loading, onNoteChange, onSubmit, onClose }: {
  action: ReceiptAction;
  note: string;
  loading: boolean;
  onNoteChange: (note: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const panelRef = useDialogFocus(onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="receipt-review-title">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div ref={panelRef} className="relative card-base w-full max-w-sm max-h-[90dvh] overflow-y-auto p-5 sm:p-6 z-10 animate-fade-up">
        <h3 id="receipt-review-title" className="text-lg font-semibold mb-2">
          {action.type === 'confirm' ? 'Confirm payment' : 'Reject receipt'}
        </h3>
        <p className="text-sm text-muted mb-4">
          {action.type === 'confirm'
            ? `Confirm payment from ${action.receipt.fullName} (${action.receipt.matricNumber})?`
            : `Reject receipt from ${action.receipt.fullName} (${action.receipt.matricNumber})?`}
        </p>
        <label htmlFor="receipt-review-note" className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Note (optional)</label>
        <textarea id="receipt-review-note" value={note} onChange={(event) => onNoteChange(event.target.value)} rows={2}
          placeholder={action.type === 'reject' ? 'Reason for rejection…' : 'Any note for the student…'} className="input-base mb-4 resize-none" />
        <div className="flex gap-2">
          <button onClick={onClose} disabled={loading} className="btn-secondary flex-1">Cancel</button>
          <button onClick={onSubmit} disabled={loading} className="btn-primary flex-1">
            {loading ? 'Please wait…' : action.type === 'confirm' ? 'Confirm' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}
