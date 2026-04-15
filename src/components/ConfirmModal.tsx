interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} />

      <div className="relative card-base w-full max-w-sm p-6 z-10 animate-fade-up">
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <p className="text-sm text-muted mb-6">{message}</p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={variant === 'danger' ? 'btn-primary flex-1 !bg-[color:var(--nx-danger)] !border-[color:var(--nx-danger)] !text-white hover:!bg-red-500 hover:!border-red-500' : 'btn-primary flex-1'}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
