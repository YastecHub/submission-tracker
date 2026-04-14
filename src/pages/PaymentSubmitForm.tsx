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
          navigate(`/pay/${slug}/closed`, { replace: true });
        } else {
          setEvent(ev);
        }
      })
      .catch(() => navigate(`/pay/${slug}/closed`, { replace: true }))
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

      navigate(`/pay/${slug}/success`, {
        state: { receipt: res.data.receipt, event },
        replace: true,
      });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 409) {
          setError('You have already submitted a receipt for this payment.');
        } else if (err.response?.status === 403) {
          navigate(`/pay/${slug}/closed`, { replace: true });
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md space-y-4">

        {/* Event header */}
        <div className="bg-green-700 text-white rounded-2xl p-5 shadow">
          <span className="text-xs uppercase tracking-widest opacity-70">Payment</span>
          <h1 className="text-xl font-bold mt-1">{event.title}</h1>
          {event.description && <p className="text-sm opacity-75 mt-1">{event.description}</p>}
          <p className="text-xs mt-3 opacity-60">Deadline: {deadline}</p>
        </div>

        {/* Payment details box */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-green-800 uppercase tracking-wide mb-3">
            Payment Details
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Amount</span>
              <span className="font-bold text-green-700 text-base">{amount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Bank</span>
              <span className="font-medium text-gray-800">{event.bankName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Account Name</span>
              <span className="font-medium text-gray-800">{event.accountName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Account Number</span>
              <span className="font-bold text-gray-900 text-base tracking-wider">
                {event.accountNumber}
              </span>
            </div>
          </div>
          <p className="mt-3 text-xs text-green-700 bg-green-100 rounded-lg px-3 py-2">
            Pay the amount above, then fill in your details and upload your receipt below.
          </p>
        </div>

        {/* Submission form */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Submit Payment Receipt</h2>

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
                autoComplete="name"
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
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
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 uppercase"
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
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select level</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            {/* Receipt upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Receipt <span className="text-red-500">*</span>
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
                    className="w-full rounded-xl border border-gray-200 object-contain max-h-56"
                  />
                  <button
                    type="button"
                    onClick={() => { setReceiptFile(null); setPreviewUrl(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="absolute top-2 right-2 bg-white rounded-full shadow px-2 py-1 text-xs text-gray-600 hover:text-red-600 border"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 rounded-xl px-4 py-8 text-center hover:border-green-400 transition"
                >
                  <p className="text-3xl mb-2">📸</p>
                  <p className="text-sm font-medium text-gray-600">Tap to upload receipt</p>
                  <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WEBP — max 5 MB</p>
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3.5 rounded-lg transition text-base disabled:opacity-60 mt-2"
            >
              {submitting ? 'Submitting...' : 'Submit Receipt'}
            </button>
          </form>
        </div>

        <Link
          to="/transparency"
          className="block bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-2xl p-4 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xl">
              ₦
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-800">See class account transparency</p>
              <p className="text-xs text-emerald-700">View the current balance and all transactions →</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
