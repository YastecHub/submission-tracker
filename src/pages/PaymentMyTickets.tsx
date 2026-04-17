import { useState, useEffect, FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import api from '../api/axios';
import type { PaymentEvent } from '../types';
import TicketCard from '../components/TicketCard';

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

  const [event, setEvent] = useState<PaymentEvent | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [eventError, setEventError] = useState<string | null>(null);

  const [matric, setMatric] = useState('');
  const [searching, setSearching] = useState(false);
  const [tickets, setTickets] = useState<TicketDto[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<PaymentEvent>(`/api/payment-events/slug/${slug}`)
      .then((res) => setEvent(res.data))
      .catch(() => setEventError('Payment event not found.'))
      .finally(() => setLoadingEvent(false));
  }, [slug]);

  async function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!matric.trim()) return;
    setSearching(true);
    setSearchError(null);
    setTickets(null);
    try {
      const res = await api.get<{ tickets: TicketDto[] }>(
        `/api/payment-receipts/my-tickets`,
        { params: { matricNumber: matric.trim() } },
      );
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
        <div className="card-base p-5">
          <span className="badge badge-accent">Find my ticket</span>
          <h1 className="text-lg font-semibold tracking-tight mt-3">{event.title}</h1>
          <p className="text-xs text-dim mt-2">
            Enter the matric number you used when submitting your receipt to retrieve your ticket.
          </p>
        </div>

        <div className="card-base p-5">
          <form onSubmit={handleSearch} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">
                Matric number
              </label>
              <input
                type="text"
                required
                value={matric}
                onChange={(e) => setMatric(e.target.value)}
                className="input-base uppercase"
                placeholder="e.g. 251100000"
              />
            </div>
            <button type="submit" disabled={searching || !matric.trim()} className="btn-primary w-full">
              {searching ? 'Searching…' : 'Find my ticket'}
            </button>
          </form>
        </div>

        {searchError && (
          <div className="alert-danger text-center">
            <p className="text-sm">{searchError}</p>
          </div>
        )}

        {tickets !== null && tickets.length === 0 && !searchError && (
          <div className="card-base p-5 text-center">
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
