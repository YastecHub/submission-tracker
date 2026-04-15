import { useState, useEffect, FormEvent, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import api from '../api/axios';
import type { PaymentEvent, Level, PaymentReceipt } from '../types';

const LEVELS: Level[] = ['100L', '200L', '300L', '400L', '500L', 'Postgrad'];

export default function PaymentSubmitForm() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<PaymentEvent | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [form, setForm] = useState({ fullName: '', matricNumber: '', level: '' });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .get<PaymentEvent>(`/api/payment-events/slug/${slug}`)
      .then((res) => {
        const ev = res.data;
        const isClosed = ev.isClosed || new Date() > new Date(ev.deadline);
        if (isClosed || ev.isDeleted) {
          navigate(`/payment/${slug}/closed`, { replace: true });
        } else {
          setEvent(ev);
        }
      })
      .catch(() => navigate(`/payment/${slug}/closed`, { replace: true }))
      .finally(() => setLoadingEvent(false));
  }, [slug, navigate]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError('');

    if (!receiptFile) {
      setError('Please upload your payment receipt.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('eventId', event!.id);
      formData.append('fullName', form.fullName.trim());
      formData.append('matricNumber', form.matricNumber.trim().toUpperCase());
      if (form.level) formData.append('level', form.level);
      formData.append('receipt', receiptFile);

      const res = await api.post<{ receipt: PaymentReceipt }>('/api/payment-receipts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      navigate(`/payment/${slug}/success`, {
        state: { receipt: res.data.receipt, event },
        replace: true,
      });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 409) {
          setError('You have already submitted a receipt for this payment.');
        } else if (err.response?.status === 403) {
          navigate(`/payment/${slug}/closed`, { replace: true });
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

  const amount = parseFloat(event.amount).toLocaleString('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  });

  return (
    <div className="page-base flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md space-y-4 animate-fade-up">
        <div className="card-base p-5">
          <span className="badge badge-accent">Payment</span>
          <h1 className="text-xl font-semibold tracking-tight mt-3">{event.title}</h1>
          {event.description && <p className="text-sm text-muted mt-1">{event.description}</p>}
          <p className="text-xs text-dim mt-3">Deadline: {deadline}</p>
        </div>

        <div className="card-base p-5">
          <h2 className="text-xs font-medium text-muted uppercase tracking-wider mb-3">
            Payment details
          </h2>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-dim">Amount</span>
              <span className="font-semibold text-accent text-base">{amount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dim">Bank</span>
              <span className="font-medium">{event.bankName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dim">Account name</span>
              <span className="font-medium">{event.accountName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-dim">Account number</span>
              <span className="font-mono font-semibold text-base tracking-wider">
                {event.accountNumber}
              </span>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted bg-surface-2 border border-nx rounded-lg px-3 py-2">
            Pay the amount above, then fill in your details and upload your receipt below.
          </p>
        </div>

        <div className="card-base p-6">
          <h2 className="text-lg font-semibold mb-4">Submit payment receipt</h2>

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
                placeholder="e.g. 251100000"
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
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">
                Payment receipt <span className="text-danger">*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
                className="hidden"
              />
              {previewUrl ? (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Receipt preview"
                    className="w-full rounded-lg border border-nx object-contain max-h-56 bg-surface-2"
                  />
                  <button
                    type="button"
                    onClick={() => { setReceiptFile(null); setPreviewUrl(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="absolute top-2 right-2 btn-secondary !text-xs !py-1 !px-2"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border border-dashed border-nx rounded-lg px-4 py-8 text-center hover:border-[color:var(--nx-border-hover)] transition-colors bg-surface-2"
                >
                  <p className="text-sm font-medium">Tap to upload receipt</p>
                  <p className="text-xs text-dim mt-1">JPEG, PNG, WEBP — max 5 MB</p>
                </button>
              )}
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full mt-2">
              {submitting ? 'Submitting…' : 'Submit receipt'}
            </button>
          </form>
        </div>

        <Link to="/transparency" className="card-interactive block p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-2 border border-nx flex items-center justify-center text-accent font-semibold">
              ₦
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">See class account transparency</p>
              <p className="text-xs text-muted">View the current balance and all transactions</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
