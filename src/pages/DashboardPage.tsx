import { useState, useCallback, FormEvent, useRef } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import EventCard from '../components/EventCard';
import PaymentEventCard from '../components/PaymentEventCard';
import ConfirmModal from '../components/ConfirmModal';
import ExtendDeadlineModal from '../components/ExtendDeadlineModal';
import DashboardLedger from './DashboardLedger';
import { useAuth } from '../context/AuthContext';
import type { SubmissionEvent, EventType, PaymentEvent } from '../types';
import { useToast } from '../context/ToastContext';
import { useRemoteData } from '../hooks/useRemoteData';
import { listSubmissionEvents, createSubmissionEvent, extendSubmissionEvent, toggleSubmissionEvent, deleteSubmissionEvent } from '../features/submissions/api/events';
import { listPaymentEvents, createPaymentEvent, extendPaymentEvent, togglePaymentEvent, deletePaymentEvent } from '../features/payments/api/events';
import { dashboardCapabilities } from '../features/auth/model/capabilities';

const EVENT_TYPES: EventType[] = ['assignment', 'attendance', 'lab', 'other'];

interface EventForm {
  title: string;
  courseCode: string;
  type: EventType;
  description: string;
  deadline: string;
}

interface PaymentForm {
  title: string;
  description: string;
  amount: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  deadline: string;
  hasTickets: boolean;
}

interface PendingAction {
  type: 'delete' | 'close';
  event: SubmissionEvent | PaymentEvent;
  kind: 'submission' | 'payment';
}

interface PendingExtend {
  event: SubmissionEvent | PaymentEvent;
  kind: 'submission' | 'payment';
}

type ActiveTab = 'submissions' | 'payments' | 'ledger';

export default function DashboardPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const access = dashboardCapabilities(user?.role);

  const loadEvents = useCallback((signal: AbortSignal) => listSubmissionEvents(signal), []);
  const eventState = useRemoteData(loadEvents, 0, access.submissions);
  const events = eventState.data ?? [];
  const eventsLoading = eventState.loading;
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState<EventForm>({
    title: '', courseCode: '', type: 'assignment', description: '', deadline: '',
  });
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [eventFormError, setEventFormError] = useState('');

  const loadPaymentEvents = useCallback((signal: AbortSignal) => listPaymentEvents(signal), []);
  const paymentEventState = useRemoteData(loadPaymentEvents, 0, access.payments);
  const paymentEvents = paymentEventState.data ?? [];
  const paymentsLoading = paymentEventState.loading;
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    title: '', description: '', amount: '', accountNumber: '', accountName: '', bankName: '', deadline: '', hasTickets: false,
  });
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [paymentFormError, setPaymentFormError] = useState('');

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => access.submissions ? 'submissions' : access.payments ? 'payments' : 'ledger');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingExtend, setPendingExtend] = useState<PendingExtend | null>(null);
  const [extendLoading, setExtendLoading] = useState(false);
  const mutationInFlight = useRef(false);

  async function handleCreateEvent(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (mutationInFlight.current) return;
    mutationInFlight.current = true;
    setEventFormError('');
    setCreatingEvent(true);
    try {
      await createSubmissionEvent(eventForm);
      const refreshed = await eventState.refresh(true);
      setShowEventForm(false);
      setEventForm({ title: '', courseCode: '', type: 'assignment', description: '', deadline: '' });
      toast(refreshed ? 'Event created!' : 'Event created, but the list could not refresh.', refreshed ? 'success' : 'info');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setEventFormError(err.response?.data?.error ?? 'Failed to create event.');
      } else {
        setEventFormError('Failed to create event.');
      }
    } finally {
      setCreatingEvent(false);
      mutationInFlight.current = false;
    }
  }

  async function handleCreatePayment(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (mutationInFlight.current) return;
    mutationInFlight.current = true;
    setPaymentFormError('');
    setCreatingPayment(true);
    try {
      await createPaymentEvent(paymentForm);
      const refreshed = await paymentEventState.refresh(true);
      setShowPaymentForm(false);
      setPaymentForm({ title: '', description: '', amount: '', accountNumber: '', accountName: '', bankName: '', deadline: '', hasTickets: false });
      toast(refreshed ? 'Payment collection created!' : 'Payment collection created, but the list could not refresh.', refreshed ? 'success' : 'info');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setPaymentFormError(err.response?.data?.error ?? 'Failed to create payment collection.');
      } else {
        setPaymentFormError('Failed to create payment collection.');
      }
    } finally {
      setCreatingPayment(false);
      mutationInFlight.current = false;
    }
  }

  function requestToggleClose(id: string, kind: 'submission' | 'payment'): void {
    const event = kind === 'submission'
      ? events.find((e) => e.id === id)
      : paymentEvents.find((e) => e.id === id);
    if (event) setPendingAction({ type: 'close', event, kind });
  }

  function requestExtend(id: string, kind: 'submission' | 'payment'): void {
    const event = kind === 'submission'
      ? events.find((e) => e.id === id)
      : paymentEvents.find((e) => e.id === id);
    if (event) setPendingExtend({ event, kind });
  }

  async function handleConfirmExtend(deadline: string): Promise<void> {
    if (!pendingExtend) return;
    const { event, kind } = pendingExtend;
    setExtendLoading(true);
    try {
      let refreshed: boolean;
      if (kind === 'submission') {
        await extendSubmissionEvent(event.id, deadline);
        refreshed = await eventState.refresh(true);
      } else {
        await extendPaymentEvent(event.id, deadline);
        refreshed = await paymentEventState.refresh(true);
      }
      setPendingExtend(null);
      toast(refreshed ? 'Deadline updated.' : 'Deadline updated, but the list could not refresh.', refreshed ? 'success' : 'info');
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null;
      toast(msg ?? 'Failed to update deadline.', 'error');
    } finally {
      setExtendLoading(false);
    }
  }

  function requestDelete(id: string, kind: 'submission' | 'payment'): void {
    const event = kind === 'submission'
      ? events.find((e) => e.id === id)
      : paymentEvents.find((e) => e.id === id);
    if (event) setPendingAction({ type: 'delete', event, kind });
  }

  async function handleConfirmAction(): Promise<void> {
    if (!pendingAction) return;
    const { type, event, kind } = pendingAction;
    setActionLoading(true);
    try {
      if (type === 'delete') {
        if (kind === 'submission') await deleteSubmissionEvent(event.id);
        else await deletePaymentEvent(event.id);
      } else {
        if (kind === 'submission') await toggleSubmissionEvent(event.id);
        else await togglePaymentEvent(event.id);
      }
      const refreshed = kind === 'submission'
        ? await eventState.refresh(true)
        : await paymentEventState.refresh(true);
      if (!refreshed) toast(`${type === 'delete' ? 'Deleted' : 'Updated'}, but the list could not refresh.`, 'info');
      setPendingAction(null);
    } catch {
      setPendingAction(null);
      toast(type === 'delete' ? 'Failed to delete.' : 'Failed to update.', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  const tabClass = (tab: ActiveTab) =>
    `px-2.5 sm:px-4 py-2 text-sm font-medium rounded-md transition-colors flex-1 sm:flex-initial ${
      activeTab === tab
        ? 'bg-surface text-[color:var(--nx-text)] border border-nx'
        : 'text-muted hover:text-[color:var(--nx-text)]'
    }`;

  return (
    <div className="page-base">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          {((activeTab === 'submissions' && access.submissions) || (activeTab === 'payments' && access.payments)) && (
            <div className="flex gap-2 w-full sm:w-auto">
              {activeTab === 'submissions' && (
                <button
                  type="button"
                  onClick={() => { setShowEventForm(!showEventForm); setShowPaymentForm(false); }}
                  className="btn-primary !py-2 !text-sm w-full sm:w-auto"
                >
                  {showEventForm ? 'Cancel' : '+ New event'}
                </button>
              )}
              {activeTab === 'payments' && (
                <button
                  type="button"
                  onClick={() => { setShowPaymentForm(!showPaymentForm); setShowEventForm(false); }}
                  className="btn-primary !py-2 !text-sm w-full sm:w-auto"
                >
                  {showPaymentForm ? 'Cancel' : '+ New payment'}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-1 bg-surface-2 border border-nx rounded-lg p-1 mb-6 w-full sm:w-fit">
          {access.submissions && <button type="button" onClick={() => setActiveTab('submissions')} className={tabClass('submissions')}>
            Submissions
            {!eventsLoading && <span className="ml-2 badge">{events.length}</span>}
          </button>}
          {access.payments && <button type="button" onClick={() => setActiveTab('payments')} className={tabClass('payments')}>
            Payments
            {!paymentsLoading && <span className="ml-2 badge">{paymentEvents.length}</span>}
          </button>}
          {access.ledger && <button type="button" onClick={() => setActiveTab('ledger')} className={tabClass('ledger')}>
            Ledger
          </button>}
        </div>

        {activeTab === 'submissions' && (
          <>
            {showEventForm && (
              <div className="card-base p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Create submission event</h2>
                {eventFormError && <div className="alert-danger mb-4">{eventFormError}</div>}
                <form onSubmit={handleCreateEvent} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">
                        Title <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text" required value={eventForm.title}
                        onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                        className="input-base"
                        placeholder="Assignment 1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">
                        Course code <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text" required value={eventForm.courseCode}
                        onChange={(e) => setEventForm({ ...eventForm, courseCode: e.target.value })}
                        className="input-base"
                        placeholder="CSC401"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Type</label>
                      <select
                        value={eventForm.type}
                        onChange={(e) => setEventForm({ ...eventForm, type: e.target.value as EventType })}
                        className="input-base"
                      >
                        {EVENT_TYPES.map((t) => (
                          <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">
                        Deadline <span className="text-danger">*</span>
                      </label>
                      <input
                        type="datetime-local" required value={eventForm.deadline}
                        onChange={(e) => setEventForm({ ...eventForm, deadline: e.target.value })}
                        className="input-base"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">
                      Description <span className="text-dim font-normal normal-case">(optional)</span>
                    </label>
                    <textarea
                      value={eventForm.description}
                      onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                      className="input-base"
                      rows={2} placeholder="Any notes for students..."
                    />
                  </div>
                  <button type="submit" disabled={creatingEvent} className="btn-primary">
                    {creatingEvent ? 'Creating…' : 'Create event'}
                  </button>
                </form>
              </div>
            )}

            {eventState.error ? (
              <div role="alert" className="alert-danger">Unable to load submission events. <button className="btn-secondary ml-2" onClick={() => void eventState.refresh()}>Try again</button></div>
            ) : eventsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="card-base p-5 animate-pulse">
                    <div className="h-3 bg-surface-2 rounded w-1/4 mb-3" />
                    <div className="h-5 bg-surface-2 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-surface-2 rounded w-1/3 mb-4" />
                    <div className="flex gap-2 mb-4">
                      <div className="flex-1 h-12 bg-surface-2 rounded-lg" />
                      <div className="flex-1 h-12 bg-surface-2 rounded-lg" />
                      <div className="flex-1 h-12 bg-surface-2 rounded-lg" />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 h-9 bg-surface-2 rounded-lg" />
                      <div className="flex-1 h-9 bg-surface-2 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-20 text-muted">
                <p className="text-lg font-medium">No submission events yet</p>
                {access.submissions && <p className="text-sm text-dim mt-2">Create your first submission event to get started.</p>}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onToggleClose={(id) => requestToggleClose(id, 'submission')}
                    onExtend={(id) => requestExtend(id, 'submission')}
                    onDelete={(id) => requestDelete(id, 'submission')}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'payments' && (
          <>
            {showPaymentForm && (
              <div className="card-base p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Create payment collection</h2>
                {paymentFormError && <div className="alert-danger mb-4">{paymentFormError}</div>}
                <form onSubmit={handleCreatePayment} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">
                      Title <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text" required value={paymentForm.title}
                      onChange={(e) => setPaymentForm({ ...paymentForm, title: e.target.value })}
                      className="input-base"
                      placeholder="e.g. Department dinner ticket"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">
                        Amount (₦) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number" required min="1" step="any" value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        className="input-base"
                        placeholder="2000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">
                        Deadline <span className="text-danger">*</span>
                      </label>
                      <input
                        type="datetime-local" required value={paymentForm.deadline}
                        onChange={(e) => setPaymentForm({ ...paymentForm, deadline: e.target.value })}
                        className="input-base"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">
                        Bank name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text" required value={paymentForm.bankName}
                        onChange={(e) => setPaymentForm({ ...paymentForm, bankName: e.target.value })}
                        className="input-base"
                        placeholder="First Bank"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">
                        Account number <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text" required value={paymentForm.accountNumber}
                        onChange={(e) => setPaymentForm({ ...paymentForm, accountNumber: e.target.value })}
                        className="input-base font-mono"
                        placeholder="0123456789"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">
                        Account name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text" required value={paymentForm.accountName}
                        onChange={(e) => setPaymentForm({ ...paymentForm, accountName: e.target.value })}
                        className="input-base"
                        placeholder="NASAMS CSC Dept"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">
                      Description <span className="text-dim font-normal normal-case">(optional)</span>
                    </label>
                    <textarea
                      value={paymentForm.description}
                      onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                      className="input-base"
                      rows={2} placeholder="What is this payment for?"
                    />
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={paymentForm.hasTickets}
                      onChange={(e) => setPaymentForm({ ...paymentForm, hasTickets: e.target.checked })}
                      className="mt-0.5 w-4 h-4 rounded border-[color:var(--nx-border)] bg-surface-2 accent-[color:var(--nx-accent)]"
                    />
                    <div>
                      <span className="text-sm font-medium">Enable collection tickets</span>
                      <p className="text-xs text-dim mt-0.5">Students get a QR ticket when confirmed. Scan at the event to mark collected.</p>
                    </div>
                  </label>

                  <button type="submit" disabled={creatingPayment} className="btn-primary">
                    {creatingPayment ? 'Creating…' : 'Create payment collection'}
                  </button>
                </form>
              </div>
            )}

            {paymentEventState.error ? (
              <div role="alert" className="alert-danger">Unable to load payment collections. <button className="btn-secondary ml-2" onClick={() => void paymentEventState.refresh()}>Try again</button></div>
            ) : paymentsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="card-base p-5 animate-pulse">
                    <div className="h-3 bg-surface-2 rounded w-1/4 mb-3" />
                    <div className="h-5 bg-surface-2 rounded w-3/4 mb-2" />
                    <div className="h-8 bg-surface-2 rounded w-1/3 mb-4" />
                    <div className="h-12 bg-surface-2 rounded-lg mb-3" />
                    <div className="flex gap-2 mb-4">
                      <div className="flex-1 h-12 bg-surface-2 rounded-lg" />
                      <div className="flex-1 h-12 bg-surface-2 rounded-lg" />
                      <div className="flex-1 h-12 bg-surface-2 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : paymentEvents.length === 0 ? (
              <div className="text-center py-20 text-muted">
                <p className="text-lg font-medium">No payment collections yet</p>
                {access.payments && <p className="text-sm text-dim mt-2">Create one to start collecting payment receipts.</p>}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paymentEvents.map((event) => (
                  <PaymentEventCard
                    key={event.id}
                    event={event}
                    onToggleClose={(id) => requestToggleClose(id, 'payment')}
                    onExtend={(id) => requestExtend(id, 'payment')}
                    onDelete={(id) => requestDelete(id, 'payment')}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'ledger' && <DashboardLedger />}
      </main>

      {pendingAction && (
        <ConfirmModal
          title={
            pendingAction.type === 'delete'
              ? 'Delete'
              : (pendingAction.event as SubmissionEvent).isClosed
              ? 'Re-open'
              : 'Close'
          }
          message={
            pendingAction.type === 'delete'
              ? `Delete "${pendingAction.event.title}"? The data will be kept but hidden.`
              : (pendingAction.event as SubmissionEvent).isClosed
              ? `Re-open "${pendingAction.event.title}"?`
              : `Close "${pendingAction.event.title}"? No more submissions will be accepted.`
          }
          confirmLabel={
            pendingAction.type === 'delete'
              ? 'Delete'
              : (pendingAction.event as SubmissionEvent).isClosed
              ? 'Re-open'
              : 'Close'
          }
          variant={pendingAction.type === 'delete' ? 'danger' : 'warning'}
          loading={actionLoading}
          onConfirm={handleConfirmAction}
          onCancel={() => setPendingAction(null)}
        />
      )}

      {pendingExtend && (
        <ExtendDeadlineModal
          title={
            pendingExtend.event.isClosed ||
            new Date() > new Date(pendingExtend.event.deadline)
              ? 'Reopen with new deadline'
              : 'Extend deadline'
          }
          eventTitle={pendingExtend.event.title}
          currentDeadline={pendingExtend.event.deadline}
          loading={extendLoading}
          onConfirm={handleConfirmExtend}
          onCancel={() => setPendingExtend(null)}
        />
      )}
    </div>
  );
}
