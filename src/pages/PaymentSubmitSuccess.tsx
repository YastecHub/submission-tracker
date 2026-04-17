import { useState, useEffect } from 'react';
import { useLocation, useParams, useSearchParams, Navigate, Link } from 'react-router-dom';
import api from '../api/axios';
import type { PaymentReceipt, PaymentEvent } from '../types';
import TicketCard from '../components/TicketCard';

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
  const [searchParams] = useSearchParams();
  const { slug } = useParams<{ slug: string }>();

  const stateReceipt = state?.receipt ?? null;
  const stateEvent = state?.event ?? null;
  const queryId = searchParams.get('id');
  const receiptId = stateReceipt?.id ?? queryId;

  const [status, setStatus] = useState<'pending' | 'confirmed' | 'rejected'>('pending');
  const [confirmedBy, setConfirmedBy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [justUpdated, setJustUpdated] = useState(false);
  const [ticketQrCode, setTicketQrCode] = useState<string | null>(null);
  const [hasTickets, setHasTickets] = useState(false);
  const [isClaimed, setIsClaimed] = useState(false);
  const [claimedBy, setClaimedBy] = useState<string | null>(null);
  const [claimedAt, setClaimedAt] = useState<string | null>(null);
  const [hydratedName, setHydratedName] = useState<string | null>(null);
  const [hydratedMatric, setHydratedMatric] = useState<string | null>(null);
  const [hydratedEventTitle, setHydratedEventTitle] = useState<string | null>(null);
  const [hydrateError, setHydrateError] = useState(false);

  function applyStatusResponse(data: StatusResponse) {
    setStatus(data.status);
    setConfirmedBy(data.confirmedBy ?? null);
    setNote(data.note ?? null);
    setTicketQrCode(data.ticketQrCode ?? null);
    setHasTickets(data.hasTickets ?? false);
    setIsClaimed(data.isClaimed ?? false);
    setClaimedBy(data.claimedBy ?? null);
    setClaimedAt(data.claimedAt ?? null);
    setHydratedName(data.fullName);
    setHydratedMatric(data.matricNumber);
    setHydratedEventTitle(data.eventTitle);
  }

  useEffect(() => {
    if (!receiptId) return;

    async function fetchStatus() {
      try {
        const res = await api.get<StatusResponse>(`/api/payment-receipts/status/${receiptId}`);
        applyStatusResponse(res.data);
        if (res.data.status !== 'pending') {
          setJustUpdated(true);
        }
        return res.data.status !== 'pending';
      } catch {
        if (!stateReceipt) setHydrateError(true);
        return false;
      }
    }

    void fetchStatus();

    const interval = setInterval(async () => {
      const done = await fetchStatus();
      if (done) clearInterval(interval);
    }, 5000);

    return () => clearInterval(interval);
  }, [receiptId, stateReceipt]);

  if (!receiptId) {
    return <Navigate to={`/payment/${slug}`} replace />;
  }

  // URL-only mode (no router state) — hydrate failed or still loading
  if (!stateReceipt || !stateEvent) {
    if (hydrateError) {
      return (
        <div className="page-base flex flex-col items-center justify-center px-4 py-10">
          <div className="w-full max-w-sm">
            <div className="alert-danger text-center">
              <p className="font-semibold">Ticket not found</p>
              <p className="text-xs mt-1">This link may be invalid or the receipt was deleted.</p>
            </div>
            <Link to={`/payment/${slug}/my-tickets`} className="btn-secondary !py-2 !text-sm w-full mt-4">
              Look up by matric number
            </Link>
          </div>
        </div>
      );
    }

    const fullName = hydratedName ?? '';
    const matricNumber = hydratedMatric ?? '';
    const eventTitle = hydratedEventTitle ?? '';

    return (
      <div className="page-base flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm space-y-4 animate-fade-up">
          {status === 'confirmed' && (
            <div className="alert-success text-center">
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
            </div>
          )}

          {status === 'pending' && fullName && (
            <div className="card-base px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-2 text-muted text-sm">
                <span className="w-2 h-2 rounded-full bg-[color:var(--nx-accent)] inline-block" />
                Waiting for Fin Sec to confirm your payment…
              </div>
            </div>
          )}

          {fullName && hasTickets && ticketQrCode && (
            <TicketCard
              eventTitle={eventTitle}
              fullName={fullName}
              matricNumber={matricNumber}
              receiptId={receiptId}
              qrCode={ticketQrCode}
              status={status}
              isClaimed={isClaimed}
              claimedBy={claimedBy}
              claimedAt={claimedAt}
            />
          )}

          {fullName && !hasTickets && (
            <div className="card-base p-6 text-center">
              <h1 className="text-lg font-semibold tracking-tight">{eventTitle}</h1>
              <p className="text-sm text-muted mt-2">
                {fullName} <span className="text-dim">({matricNumber})</span>
              </p>
              <p className="text-xs text-dim mt-3">
                This event doesn't issue collection tickets.
              </p>
            </div>
          )}

          {!fullName && !hydrateError && (
            <div className="card-base p-6 text-center text-sm text-muted">Loading your ticket…</div>
          )}
        </div>
      </div>
    );
  }

  // Normal post-submit flow (router state present)
  const receipt = stateReceipt;
  const event = stateEvent;

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

          {hasTickets ? (
            <p className="text-xs text-dim">Save your ticket below — you'll need it at the event.</p>
          ) : (
            <p className="text-xs text-dim">Bookmark this page to check your status later.</p>
          )}
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
