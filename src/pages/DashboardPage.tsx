import { useState, useEffect, FormEvent } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import EventCard from '../components/EventCard';
import PaymentEventCard from '../components/PaymentEventCard';
import ConfirmModal from '../components/ConfirmModal';
import DashboardLedger from './DashboardLedger';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import type { SubmissionEvent, EventType, PaymentEvent } from '../types';
import { useToast } from '../context/ToastContext';

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
}

interface PendingAction {
  type: 'delete' | 'close';
  event: SubmissionEvent | PaymentEvent;
  kind: 'submission' | 'payment';
}

type ActiveTab = 'submissions' | 'payments' | 'ledger';

export default function DashboardPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const canCreate = user?.role !== 'fin_sec';

  // Submission events
  const [events, setEvents] = useState<SubmissionEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState<EventForm>({
    title: '', courseCode: '', type: 'assignment', description: '', deadline: '',
  });
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [eventFormError, setEventFormError] = useState('');

  // Payment events
  const [paymentEvents, setPaymentEvents] = useState<PaymentEvent[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    title: '', description: '', amount: '', accountNumber: '', accountName: '', bankName: '', deadline: '',
  });
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [paymentFormError, setPaymentFormError] = useState('');

  const [activeTab, setActiveTab] = useState<ActiveTab>('submissions');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchPaymentEvents();
  }, []);

  async function fetchEvents(): Promise<void> {
    try {
      const res = await api.get<{ events: SubmissionEvent[] }>('/api/events');
      setEvents(res.data.events);
    } catch (err) {
      console.error(err);
    } finally {
      setEventsLoading(false);
    }
  }

  async function fetchPaymentEvents(): Promise<void> {
    try {
      const res = await api.get<{ events: PaymentEvent[] }>('/api/payment-events');
      setPaymentEvents(res.data.events);
    } catch (err) {
      console.error(err);
    } finally {
      setPaymentsLoading(false);
    }
  }

  async function handleCreateEvent(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setEventFormError('');
    setCreatingEvent(true);
    try {
      const res = await api.post<SubmissionEvent>('/api/events', eventForm);
      setEvents([res.data, ...events]);
      setShowEventForm(false);
      setEventForm({ title: '', courseCode: '', type: 'assignment', description: '', deadline: '' });
      toast('Event created!', 'success');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setEventFormError(err.response?.data?.error ?? 'Failed to create event.');
      } else {
        setEventFormError('Failed to create event.');
      }
    } finally {
      setCreatingEvent(false);
    }
  }

  async function handleCreatePayment(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setPaymentFormError('');
    setCreatingPayment(true);
    try {
      const res = await api.post<PaymentEvent>('/api/payment-events', paymentForm);
      setPaymentEvents([res.data, ...paymentEvents]);
      setShowPaymentForm(false);
      setPaymentForm({ title: '', description: '', amount: '', accountNumber: '', accountName: '', bankName: '', deadline: '' });
      toast('Payment collection created!', 'success');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setPaymentFormError(err.response?.data?.error ?? 'Failed to create payment collection.');
      } else {
        setPaymentFormError('Failed to create payment collection.');
      }
    } finally {
      setCreatingPayment(false);
    }
  }

  function requestToggleClose(id: string, kind: 'submission' | 'payment'): void {
    const event = kind === 'submission'
      ? events.find((e) => e.id === id)
      : paymentEvents.find((e) => e.id === id);
    if (event) setPendingAction({ type: 'close', event, kind });
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
      const base = kind === 'submission' ? '/api/events' : '/api/payment-events';
      if (type === 'delete') {
        await api.delete(`${base}/${event.id}`);
        if (kind === 'submission') {
          setEvents((prev) => prev.filter((e) => e.id !== event.id));
        } else {
          setPaymentEvents((prev) => prev.filter((e) => e.id !== event.id));
        }
      } else {
        const res = await api.patch<{ isClosed: boolean }>(`${base}/${event.id}/close`);
        if (kind === 'submission') {
          setEvents((prev) => prev.map((e) => e.id === event.id ? { ...e, isClosed: res.data.isClosed } : e));
        } else {
          setPaymentEvents((prev) => prev.map((e) => e.id === event.id ? { ...e, isClosed: res.data.isClosed } : e));
        }
      }
      setPendingAction(null);
    } catch {
      setPendingAction(null);
      toast(type === 'delete' ? 'Failed to delete.' : 'Failed to update.', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  const loading = eventsLoading || paymentsLoading;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          {canCreate && (
            <div className="flex gap-2">
              {activeTab === 'submissions' && (
                <button
                  type="button"
                  onClick={() => { setShowEventForm(!showEventForm); setShowPaymentForm(false); }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
                >
                  {showEventForm ? 'Cancel' : '+ New Event'}
                </button>
              )}
              {activeTab === 'payments' && (
                <button
                  type="button"
                  onClick={() => { setShowPaymentForm(!showPaymentForm); setShowEventForm(false); }}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
                >
                  {showPaymentForm ? 'Cancel' : '+ New Payment'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('submissions')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
              activeTab === 'submissions'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Submissions
            {!eventsLoading && (
              <span className="ml-2 bg-gray-200 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">
                {events.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
              activeTab === 'payments'
                ? 'bg-white text-green-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Payments
            {!paymentsLoading && (
              <span className="ml-2 bg-gray-200 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">
                {paymentEvents.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
              activeTab === 'ledger'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Ledger
          </button>
        </div>

        {/* ── SUBMISSION EVENTS TAB ── */}
        {activeTab === 'submissions' && (
          <>
            {showEventForm && (
              <div className="bg-white rounded-2xl shadow p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Create Submission Event</h2>
                {eventFormError && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                    {eventFormError}
                  </div>
                )}
                <form onSubmit={handleCreateEvent} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text" required value={eventForm.title}
                        onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Assignment 1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Course Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text" required value={eventForm.courseCode}
                        onChange={(e) => setEventForm({ ...eventForm, courseCode: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="CSC401"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={eventForm.type}
                        onChange={(e) => setEventForm({ ...eventForm, type: e.target.value as EventType })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {EVENT_TYPES.map((t) => (
                          <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Deadline <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local" required value={eventForm.deadline}
                        onChange={(e) => setEventForm({ ...eventForm, deadline: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                    <textarea
                      value={eventForm.description}
                      onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2} placeholder="Any notes for students..."
                    />
                  </div>
                  <button
                    type="submit" disabled={creatingEvent}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold px-6 py-3 rounded-lg transition disabled:opacity-60"
                  >
                    {creatingEvent ? 'Creating...' : 'Create Event'}
                  </button>
                </form>
              </div>
            )}

            {eventsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl shadow p-5 animate-pulse">
                    <div className="h-3 bg-gray-200 rounded w-1/4 mb-3" />
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/3 mb-4" />
                    <div className="flex gap-3 mb-4">
                      <div className="flex-1 h-12 bg-gray-100 rounded-xl" />
                      <div className="flex-1 h-12 bg-gray-100 rounded-xl" />
                      <div className="flex-1 h-12 bg-gray-100 rounded-xl" />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 h-9 bg-gray-200 rounded-lg" />
                      <div className="flex-1 h-9 bg-gray-200 rounded-lg" />
                      <div className="h-9 w-9 bg-gray-200 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <p className="text-5xl mb-4">📋</p>
                <p className="text-lg font-medium">No submission events yet</p>
                {canCreate && <p className="text-sm mt-1">Create your first submission event to get started.</p>}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onToggleClose={(id) => requestToggleClose(id, 'submission')}
                    onDelete={(id) => requestDelete(id, 'submission')}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── PAYMENT EVENTS TAB ── */}
        {activeTab === 'payments' && (
          <>
            {showPaymentForm && (
              <div className="bg-white rounded-2xl shadow p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Create Payment Collection</h2>
                {paymentFormError && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                    {paymentFormError}
                  </div>
                )}
                <form onSubmit={handleCreatePayment} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text" required value={paymentForm.title}
                      onChange={(e) => setPaymentForm({ ...paymentForm, title: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="e.g. Department Dinner Ticket"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount (₦) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number" required min="1" step="any" value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="2000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Deadline <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local" required value={paymentForm.deadline}
                        onChange={(e) => setPaymentForm({ ...paymentForm, deadline: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bank Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text" required value={paymentForm.bankName}
                        onChange={(e) => setPaymentForm({ ...paymentForm, bankName: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="First Bank"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text" required value={paymentForm.accountNumber}
                        onChange={(e) => setPaymentForm({ ...paymentForm, accountNumber: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
                        placeholder="0123456789"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text" required value={paymentForm.accountName}
                        onChange={(e) => setPaymentForm({ ...paymentForm, accountName: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="NASAMS CSC Dept"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={paymentForm.description}
                      onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                      rows={2} placeholder="What is this payment for?"
                    />
                  </div>

                  <button
                    type="submit" disabled={creatingPayment}
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white text-base font-semibold px-6 py-3 rounded-lg transition disabled:opacity-60"
                  >
                    {creatingPayment ? 'Creating...' : 'Create Payment Collection'}
                  </button>
                </form>
              </div>
            )}

            {paymentsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl shadow p-5 animate-pulse">
                    <div className="h-3 bg-gray-200 rounded w-1/4 mb-3" />
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
                    <div className="h-12 bg-green-50 rounded-xl mb-3" />
                    <div className="flex gap-3 mb-4">
                      <div className="flex-1 h-12 bg-gray-100 rounded-xl" />
                      <div className="flex-1 h-12 bg-gray-100 rounded-xl" />
                      <div className="flex-1 h-12 bg-gray-100 rounded-xl" />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 h-9 bg-gray-200 rounded-lg" />
                      <div className="flex-1 h-9 bg-gray-200 rounded-lg" />
                      <div className="h-9 w-9 bg-gray-200 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : paymentEvents.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <p className="text-5xl mb-4">💳</p>
                <p className="text-lg font-medium">No payment collections yet</p>
                {canCreate && <p className="text-sm mt-1">Create one to start collecting payment receipts.</p>}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paymentEvents.map((event) => (
                  <PaymentEventCard
                    key={event.id}
                    event={event}
                    onToggleClose={(id) => requestToggleClose(id, 'payment')}
                    onDelete={(id) => requestDelete(id, 'payment')}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── LEDGER TAB ── */}
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
    </div>
  );
}
