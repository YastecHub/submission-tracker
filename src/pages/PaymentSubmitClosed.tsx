import { useParams, Link } from 'react-router-dom';

export default function PaymentSubmitClosed() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <div className="page-base flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-4 animate-fade-up">
        <div className="card-base p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-surface-2 border border-nx flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold tracking-tight mb-2">Payment closed</h1>
          <p className="text-muted text-sm">
            This payment collection is no longer accepting receipts.
          </p>
          <p className="text-dim text-xs mt-1">The deadline may have passed or it has been closed.</p>
          {slug && (
            <p className="mt-4 text-xs text-dim font-mono break-all">ref: {slug}</p>
          )}
        </div>

        <Link to="/transparency" className="card-interactive block p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-2 border border-nx flex items-center justify-center text-accent font-semibold">
              ₦
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium">See class account transparency</p>
              <p className="text-xs text-muted">View the current balance and all transactions</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
