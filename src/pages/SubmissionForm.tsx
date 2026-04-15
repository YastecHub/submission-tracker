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
          navigate(`/submitit/${slug}/closed`, { replace: true });
        } else {
          setEvent(ev);
        }
      })
      .catch(() => navigate(`/submitit/${slug}/closed`, { replace: true }))
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
      navigate(`/submitit/${slug}/success`, {
        state: { submission: res.data.submission },
        replace: true,
      });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 409) {
          setError('You have already submitted for this event.');
        } else if (err.response?.status === 403) {
          navigate(`/submitit/${slug}/closed`, { replace: true });
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
      <div className="page-base flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-nx" />
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
    <div className="page-base flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md animate-fade-up">
        <div className="card-base p-5 mb-5">
          <span className="badge badge-accent">{event.type}</span>
          <h1 className="text-xl font-semibold tracking-tight mt-3">{event.title}</h1>
          <p className="text-sm text-muted mt-1">{event.courseCode}</p>
          {event.description && (
            <p className="text-sm text-muted mt-2 leading-relaxed">{event.description}</p>
          )}
          <p className="text-xs text-dim mt-3">Deadline: {deadline}</p>
        </div>

        <div className="card-base p-6">
          <h2 className="text-lg font-semibold">Digital submission</h2>
          <p className="text-sm text-muted mt-1 mb-5">
            Fill in your details after physically submitting your work.
          </p>

          {error && <div className="alert-danger mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">
                Full name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                autoComplete="name"
                className="input-base"
                placeholder="e.g. Amina Bello"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">
                Matric number <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={form.matricNumber}
                onChange={(e) => setForm({ ...form, matricNumber: e.target.value })}
                className="input-base uppercase"
                placeholder="e.g. 2021/12345"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">
                Level <span className="text-dim font-normal normal-case">(optional)</span>
              </label>
              <select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
                className="input-base"
              >
                <option value="">Select level</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full mt-2">
              {submitting ? 'Submitting…' : 'Confirm submission'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
