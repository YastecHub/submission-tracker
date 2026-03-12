import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '../api/axios';
import type { SubmissionEvent, Level, Submission } from '../types';

const LEVELS: Level[] = ['100L', '200L', '300L', '400L', '500L', 'Postgrad'];

export default function SubmissionForm() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<SubmissionEvent | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [form, setForm] = useState({ fullName: '', matricNumber: '', level: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<SubmissionEvent>(`/api/events/${slug}`)
      .then((res) => {
        const ev = res.data;
        const isClosed = ev.isClosed || new Date() > new Date(ev.deadline);
        if (isClosed || ev.isDeleted) {
          navigate(`/submit/${slug}/closed`, { replace: true });
        } else {
          setEvent(ev);
        }
      })
      .catch(() => navigate(`/submit/${slug}/closed`, { replace: true }))
      .finally(() => setLoadingEvent(false));
  }, [slug, navigate]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.post<{ submission: Submission }>('/api/submissions', {
        eventId: event!.id,
        fullName: form.fullName.trim(),
        matricNumber: form.matricNumber.trim().toUpperCase(),
        level: form.level || undefined,
      });
      navigate(`/submit/${slug}/success`, {
        state: { submission: res.data.submission },
        replace: true,
      });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 409) {
          setError('You have already submitted for this event.');
        } else if (err.response?.status === 403) {
          navigate(`/submit/${slug}/closed`, { replace: true });
        } else {
          setError(err.response?.data?.error ?? 'Something went wrong. Please try again.');
        }
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!event) return null;

  const deadline = new Date(event.deadline).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-blue-700 text-white rounded-2xl p-5 mb-6 shadow">
          <span className="text-xs uppercase tracking-widest opacity-70">{event.type}</span>
          <h1 className="text-xl font-bold mt-1">{event.title}</h1>
          <p className="text-sm opacity-80 mt-1">{event.courseCode}</p>
          {event.description && <p className="text-sm opacity-70 mt-2">{event.description}</p>}
          <p className="text-xs mt-3 opacity-60">Deadline: {deadline}</p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Digital Submission</h2>
          <p className="text-sm text-gray-500 mb-5">
            Fill in your details after physically submitting your work.
          </p>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Amina Bello"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Matric Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.matricNumber}
                onChange={(e) => setForm({ ...form, matricNumber: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                placeholder="e.g. 2021/12345"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Level <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select level</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition text-sm disabled:opacity-60 mt-2"
            >
              {submitting ? 'Submitting...' : 'Confirm Submission'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
