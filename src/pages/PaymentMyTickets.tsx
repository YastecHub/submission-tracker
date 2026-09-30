import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import type { PaymentEvent } from '../types';
import TicketCard from '../components/TicketCard';
import { useStudentAuth } from '../context/StudentAuthContext';
import { getPublicPaymentEvent, getStudentTickets } from '../features/payments/api/receipts';

interface TicketDto {
  receiptId: string;
  eventTitle: string;
  eventSlug: string;
  amount: string;
  fullName: string;
  matricNumber: string;
  ticketQrCode: string;
  isClaimed: boolean;
  claimedAt: string | null;
  claimedBy: string | null;
}

export default function PaymentMyTickets() {
  const { slug } = useParams<{ slug: string }>();
  const { student, token, logout } = useStudentAuth();

  const [event, setEvent] = useState<PaymentEvent | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [eventError, setEventError] = useState<string | null>(null);

  const [searching, setSearching] = useState(false);
  const [tickets, setTickets] = useState<TicketDto[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getPublicPaymentEvent(slug!, controller.signal)
      .then(setEvent)
      .catch(() => setEventError('Payment event not found.'))
      .finally(() => setLoadingEvent(false));
    return () => controller.abort();
  }, [slug]);

  async function loadTickets() {
    if (!token) return;
    setSearching(true);
    setSearchError(null);
    setTickets(null);
    try {
      const res = await getStudentTickets<{ tickets: TicketDto[] }>(token);
      const filtered = res.data.tickets.filter((t) => t.eventSlug === slug);
      setTickets(filtered);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setSearchError(err.response.data.error);
      } else {
        setSearchError('Something went wrong. Please try again.');
      }
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => { if (event && token) void loadTickets(); }, [event, token]);

  if (loadingEvent) {
    return (
      <div className="page-base flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-nx" />
      </div>
    );
  }

  if (eventError || !event) {
    return (
      <div className="page-base flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="alert-danger text-center">
            <p className="font-semibold">Event not found</p>
            <p className="text-xs mt-1">{eventError}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!event.hasTickets) {
    return (
      <div className="page-base flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm space-y-4">
          <div className="card-base p-6 text-center">
            <h1 className="text-lg font-semibold tracking-tight">{event.title}</h1>
            <p className="text-sm text-muted mt-2">This event doesn't issue collection tickets.</p>
          </div>
          <Link to={`/payment/${slug}`} className="btn-secondary !py-2 !text-sm w-full">
            Back to payment page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-base flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-sm space-y-4 animate-fade-up">
        <div className="card-base p-4 sm:p-5">
          <span className="badge badge-accent">Find my ticket</span>
          <h1 className="text-lg font-semibold tracking-tight mt-3">{event.title}</h1>
          <p className="text-xs text-dim mt-2">
            Signed in as {student?.fullName} ({student?.matricNumber}).
          </p>
        </div>

        <div className="card-base p-4 sm:p-5">
          <button type="button" disabled={searching} onClick={() => void loadTickets()} className="btn-primary w-full">
            {searching ? 'Loading…' : 'Refresh my tickets'}
          </button>
          <button type="button" onClick={logout} className="btn-ghost w-full mt-2">Use another student account</button>
        </div>

        {searchError && (
          <div className="alert-danger text-center">
            <p className="text-sm">{searchError}</p>
          </div>
        )}

        {tickets !== null && tickets.length === 0 && !searchError && (
          <div className="card-base p-4 sm:p-5 text-center">
            <p className="text-sm font-medium">No confirmed payment found</p>
            <p className="text-xs text-dim mt-2">
              We couldn't find a confirmed payment for that matric number on this event.
              If you've paid but don't see a ticket, check with your Fin Sec or class rep.
            </p>
          </div>
        )}

        {tickets && tickets.map((t) => (
          <TicketCard
            key={t.receiptId}
            eventTitle={t.eventTitle}
            fullName={t.fullName}
            matricNumber={t.matricNumber}
            receiptId={t.receiptId}
            qrCode={t.ticketQrCode}
            status="confirmed"
            isClaimed={t.isClaimed}
            claimedBy={t.claimedBy}
            claimedAt={t.claimedAt}
          />
        ))}

        <Link to={`/payment/${slug}`} className="btn-ghost !text-sm w-full justify-center">
          ← Back to payment page
        </Link>
      </div>
    </div>
  );
}
