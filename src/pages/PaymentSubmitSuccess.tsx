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
  ticketQrCode: string | null;
  hasTickets: boolean;
  eventTitle: string;
  fullName: string;
  matricNumber: string;
  isClaimed: boolean;
  claimedAt: string | null;
  claimedBy: string | null;
}

export default function PaymentSubmitSuccess() {
  const { state } = useLocation() as { state: LocationState | null };
  const { slug } = useParams<{ slug: string }>();

  const [status, setStatus] = useState<'pending' | 'confirmed' | 'rejected'>('pending');
  const [confirmedBy, setConfirmedBy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [justUpdated, setJustUpdated] = useState(false);
  const [ticketQrCode, setTicketQrCode] = useState<string | null>(null);
  const [hasTickets, setHasTickets] = useState(false);
  const [isClaimed, setIsClaimed] = useState(false);
  const [claimedBy, setClaimedBy] = useState<string | null>(null);
  const [claimedAt, setClaimedAt] = useState<string | null>(null);

  const receipt = state?.receipt;
  const event = state?.event;

  function applyStatusResponse(data: StatusResponse) {
    setStatus(data.status);
    setConfirmedBy(data.confirmedBy ?? null);
    setNote(data.note ?? null);
    setTicketQrCode(data.ticketQrCode ?? null);
    setHasTickets(data.hasTickets ?? false);
    setIsClaimed(data.isClaimed ?? false);
    setClaimedBy(data.claimedBy ?? null);
    setClaimedAt(data.claimedAt ?? null);
  }

  useEffect(() => {
    if (!receipt) return;

    async function fetchStatus() {
      try {
        const res = await api.get<StatusResponse>(`/api/payment-receipts/status/${receipt!.id}`);
        applyStatusResponse(res.data);
        if (res.data.status !== 'pending') {
          setJustUpdated(true);
        }
        return res.data.status !== 'pending';
      } catch {
        return false;
      }
    }

    void fetchStatus();

    const interval = setInterval(async () => {
      const done = await fetchStatus();
      if (done) clearInterval(interval);
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

        {hasTickets && ticketQrCode && (
          <TicketCard
            eventTitle={event.title}
            fullName={receipt.fullName}
            matricNumber={receipt.matricNumber}
            receiptId={receipt.id}
            qrCode={ticketQrCode}
            status={status}
            isClaimed={isClaimed}
            claimedBy={claimedBy}
            claimedAt={claimedAt}
          />
        )}

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

function formatClaimCode(id: string): string {
  const hex = id.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4)}`;
}

function TicketCard({
  eventTitle,
  fullName,
  matricNumber,
  receiptId,
  qrCode,
  status,
  isClaimed,
  claimedBy,
  claimedAt,
}: {
  eventTitle: string;
  fullName: string;
  matricNumber: string;
  receiptId: string;
  qrCode: string;
  status: 'pending' | 'confirmed' | 'rejected';
  isClaimed: boolean;
  claimedBy: string | null;
  claimedAt: string | null;
}) {
  const claimCode = formatClaimCode(receiptId);

  if (isClaimed) {
    const claimedTime = claimedAt
      ? new Date(claimedAt).toLocaleString('en-GB', {
          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
        })
      : '';

    return (
      <div className="card-base p-6 text-center border-[color:var(--nx-success)]">
        <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-3 bg-[color:var(--nx-success-soft)]">
          <svg className="w-7 h-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-semibold text-success text-lg">Collected</p>
        <p className="text-sm text-muted mt-1">
          Claimed by {claimedBy}{claimedTime ? ` at ${claimedTime}` : ''}
        </p>
        <p className="text-xs text-dim mt-3">{eventTitle}</p>
      </div>
    );
  }

  return (
    <div className="card-base overflow-hidden">
      <div className="bg-surface-2 border-b border-nx px-5 py-3">
        <p className="text-xs uppercase tracking-wider font-semibold text-accent">{eventTitle}</p>
        <p className="text-sm text-muted mt-0.5">Your ticket</p>
      </div>
      <div className="p-5">
        <div className="flex gap-4 items-start">
          <div className="flex-shrink-0">
            <img
              src={qrCode}
              alt="Ticket QR code"
              className="w-28 h-28 rounded-lg border border-nx bg-white p-1"
            />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <div>
              <p className="text-xs text-dim">Name</p>
              <p className="text-sm font-semibold">{fullName}</p>
            </div>
            <div>
              <p className="text-xs text-dim">Matric</p>
              <p className="text-sm font-semibold">{matricNumber}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-dim uppercase tracking-wider mb-1">Claim code</p>
          <p className="text-2xl font-mono font-bold tracking-widest text-accent">{claimCode}</p>
        </div>

        <div className="mt-4 bg-surface-2 border border-nx rounded-lg px-4 py-2.5 text-center">
          <p className="text-xs text-muted">Show this at the event to collect your item</p>
        </div>

        {status === 'pending' && (
          <div className="mt-3 bg-[color:var(--nx-accent-soft)] border border-[color:var(--nx-accent)] rounded-lg px-4 py-2.5 text-center">
            <p className="text-xs text-accent font-medium">Your payment is still pending confirmation. The ticket will be active once confirmed.</p>
          </div>
        )}

        {status === 'rejected' && (
          <div className="mt-3 alert-danger text-center">
            <p className="text-xs font-medium">This ticket is invalid — your receipt was rejected.</p>
          </div>
        )}
      </div>
    </div>
  );
}
