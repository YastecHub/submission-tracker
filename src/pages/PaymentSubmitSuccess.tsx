import { useState, useEffect } from 'react';
import { useLocation, useParams, Navigate, Link } from 'react-router-dom';
import api from '../api/axios';
import type { PaymentReceipt, PaymentEvent } from '../types';

interface LocationState {
  receipt: PaymentReceipt;
  event: PaymentEvent;
}

interface StatusResponse {
  status: 'pending' | 'confirmed' | 'rejected';
  confirmedAt: string | null;
  confirmedBy: string | null;
  note: string | null;
}

export default function PaymentSubmitSuccess() {
  const { state } = useLocation() as { state: LocationState | null };
  const { slug } = useParams<{ slug: string }>();

  const [status, setStatus] = useState<'pending' | 'confirmed' | 'rejected'>('pending');
  const [confirmedBy, setConfirmedBy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [justUpdated, setJustUpdated] = useState(false);

  const receipt = state?.receipt;
  const event = state?.event;

  useEffect(() => {
    if (!receipt) return;
    if (receipt.status !== 'pending') {
      setStatus(receipt.status);
      setConfirmedBy(receipt.confirmedBy ?? null);
      setNote(receipt.note ?? null);
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await api.get<StatusResponse>(`/api/payment-receipts/status/${receipt.id}`);
        if (res.data.status !== 'pending') {
          clearInterval(interval);
          setStatus(res.data.status);
          setConfirmedBy(res.data.confirmedBy ?? null);
          setNote(res.data.note ?? null);
          setJustUpdated(true);
        }
      } catch {
        // silent — student has no auth, keep polling
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [receipt]);

  if (!receipt || !event) {
    return <Navigate to={`/payment/${slug}`} replace />;
  }

  const submittedAt = new Date(receipt.submittedAt).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const amount = parseFloat(event.amount).toLocaleString('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  });

  return (
    <div className="page-base flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-4 animate-fade-up">
        {status === 'confirmed' && (
          <div className={`alert-success text-center ${justUpdated ? 'animate-bounce-once' : ''}`}>
            <p className="font-semibold">Payment confirmed</p>
            {confirmedBy && <p className="text-xs opacity-80 mt-1">Confirmed by {confirmedBy}</p>}
            {note && <p className="text-xs opacity-80 mt-1 italic">"{note}"</p>}
          </div>
        )}

        {status === 'rejected' && (
          <div className="alert-danger text-center">
            <p className="font-semibold">Receipt rejected</p>
            {confirmedBy && <p className="text-xs opacity-80 mt-1">Reviewed by {confirmedBy}</p>}
            {note && <p className="text-xs mt-2">Reason: {note}</p>}
            <p className="text-xs mt-2">Please contact your Fin Sec or class rep.</p>
          </div>
        )}

        {status === 'pending' && (
          <div className="card-base px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-2 text-muted text-sm">
              <span className="w-2 h-2 rounded-full bg-[color:var(--nx-accent)] inline-block" />
              Waiting for Fin Sec to confirm your payment…
            </div>
          </div>
        )}

        <div className="card-base p-6 text-center">
          <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-surface-2 border border-nx">
            {status === 'rejected' ? (
              <svg className="w-7 h-7 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className={`w-7 h-7 ${status === 'confirmed' ? 'text-success' : 'text-accent'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>

          <h1 className="text-xl font-semibold tracking-tight">Receipt submitted</h1>
          <p className="text-sm text-muted mt-1 mb-5">Your payment receipt has been uploaded.</p>

          <div className="bg-surface-2 border border-nx rounded-lg p-4 mb-4 text-left text-sm space-y-1.5">
            <div>
              <span className="text-dim">Name:</span>{' '}
              <span className="font-medium">{receipt.fullName}</span>
            </div>
            <div>
              <span className="text-dim">Matric:</span>{' '}
              <span className="font-medium">{receipt.matricNumber}</span>
            </div>
            {receipt.level && (
              <div>
                <span className="text-dim">Level:</span>{' '}
                <span className="font-medium">{receipt.level}</span>
              </div>
            )}
            <div>
              <span className="text-dim">Amount:</span>{' '}
              <span className="font-medium">{amount}</span>
            </div>
            <div>
              <span className="text-dim">Submitted:</span>{' '}
              <span className="font-medium">{submittedAt}</span>
            </div>
            <div className="pt-1">
              <span className="text-dim">Status:</span>{' '}
              {status === 'confirmed' ? (
                <span className="font-semibold text-success">Confirmed</span>
              ) : status === 'rejected' ? (
                <span className="font-semibold text-danger">Rejected</span>
              ) : (
                <span className="font-medium text-accent">Pending review</span>
              )}
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs text-muted mb-2">Your uploaded receipt</p>
            <a href={receipt.receiptUrl} target="_blank" rel="noopener noreferrer">
              <img
                src={receipt.receiptUrl}
                alt="Payment receipt"
                className="w-full max-h-40 object-contain rounded-lg border border-nx bg-surface-2 cursor-pointer hover:opacity-90 transition-opacity"
              />
            </a>
            <p className="text-xs text-dim mt-1">Tap to view full size</p>
          </div>

          <p className="text-xs text-dim">Screenshot this page for your records.</p>
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
