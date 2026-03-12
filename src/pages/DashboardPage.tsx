import { useState, useEffect, FormEvent } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import EventCard from '../components/EventCard';
import api from '../api/axios';
import type { SubmissionEvent, EventType } from '../types';
import { useToast } from '../context/ToastContext';

const EVENT_TYPES: EventType[] = ['assignment', 'attendance', 'lab', 'other'];

interface EventForm {
  title: string;
  courseCode: string;
  type: EventType;
  description: string;
  deadline: string;
}

export default function DashboardPage() {
  const { toast } = useToast();
  const [events, setEvents] = useState<SubmissionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<EventForm>({
    title: '',
    courseCode: '',
    type: 'assignment',
    description: '',
    deadline: '',
  });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents(): Promise<void> {
    try {
      const res = await api.get<SubmissionEvent[]>('/api/events');
      setEvents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setFormError('');
    setCreating(true);
    try {
      const res = await api.post<SubmissionEvent>('/api/events', form);
      setEvents([res.data, ...events]);
      setShowForm(false);
      setForm({ title: '', courseCode: '', type: 'assignment', description: '', deadline: '' });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setFormError(err.response?.data?.error ?? 'Failed to create event.');
      } else {
        setFormError('Failed to create event.');
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleClose(id: string): Promise<void> {
    try {
      const res = await api.patch<SubmissionEvent>(`/api/events/${id}/close`);
      setEvents(events.map((e) => (e.id === id ? { ...e, isClosed: res.data.isClosed } : e)));
    } catch {
      toast('Failed to update event.', 'error');
    }
  }

  async function handleDelete(id: string): Promise<void> {
    if (!confirm('Delete this event? The data will be kept but hidden.')) return;
    try {
      await api.delete(`/api/events/${id}`);
      setEvents(events.filter((e) => e.id !== id));
    } catch {
      toast('Failed to delete event.', 'error');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            {showForm ? 'Cancel' : '+ New Event'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Create Submission Event</h2>
            {formError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                {formError}
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Assignment 1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Course Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.courseCode}
                    onChange={(e) => setForm({ ...form, courseCode: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="CSC401"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as EventType })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deadline <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Any notes for students..."
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold px-6 py-3 rounded-lg transition disabled:opacity-60"
              >
                {creating ? 'Creating...' : 'Create Event'}
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow p-5 animate-pulse h-48" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-4">📋</p>
            <p className="text-lg font-medium">No events yet</p>
            <p className="text-sm mt-1">Create your first submission event to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onToggleClose={handleToggleClose}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
