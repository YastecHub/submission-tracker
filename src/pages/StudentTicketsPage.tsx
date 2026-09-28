import { useCallback } from 'react';
import TicketCard from '../components/TicketCard';
import { useStudentAuth } from '../context/StudentAuthContext';
import { getStudentTickets } from '../features/payments/api/receipts';
import { useRemoteData } from '../hooks/useRemoteData';

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

export default function StudentTicketsPage() {
  const { token } = useStudentAuth();
  const load = useCallback(async (signal: AbortSignal) => {
    const response = await getStudentTickets<{ tickets: TicketDto[] }>(token!, signal);
    return response.data.tickets;
  }, [token]);
  const tickets = useRemoteData(load, 0, Boolean(token));

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-7">
        <p className="text-xs uppercase tracking-wider text-accent font-semibold">Confirmed collections</p>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">My tickets</h1>
        <p className="text-sm text-muted mt-2">Tickets appear here after a payment with ticketing is confirmed.</p>
      </div>
      {tickets.error ? (
        <div role="alert" className="alert-danger">We couldn&apos;t load your tickets. <button type="button" className="underline font-semibold" onClick={() => void tickets.refresh()}>Try again</button></div>
      ) : tickets.loading && !tickets.data ? (
        <div className="card-base h-80 animate-pulse max-w-sm" />
      ) : !tickets.data?.length ? (
        <div className="card-base p-8 text-center"><h2 className="text-lg font-semibold">No tickets yet</h2><p className="text-sm text-muted mt-2">Your confirmed collection tickets will be kept here.</p></div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5 items-start">
          {tickets.data.map((ticket) => (
            <TicketCard
              key={ticket.receiptId}
              eventTitle={ticket.eventTitle}
              fullName={ticket.fullName}
              matricNumber={ticket.matricNumber}
              receiptId={ticket.receiptId}
              qrCode={ticket.ticketQrCode}
              status="confirmed"
              isClaimed={ticket.isClaimed}
              claimedBy={ticket.claimedBy}
              claimedAt={ticket.claimedAt}
            />
          ))}
        </div>
      )}
    </main>
  );
}
