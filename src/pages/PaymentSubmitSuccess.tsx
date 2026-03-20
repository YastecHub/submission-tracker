import { useState, useEffect } from 'react';
import { useLocation, useParams, Navigate } from 'react-router-dom';
import api from '../api/axios';
import type { PaymentReceipt, PaymentEvent } from '../types';

interface LocationState {
  receipt: PaymentReceipt;
  event: PaymentEvent;
}

interface StatusResponse {
  status: 'pending' | 'confirmed' | 'rejected';
  confirmedAt: string | null;
  confirmedBy: string | null;
  note: string | null;
}

export default function PaymentSubmitSuccess() {
  const { state } = useLocation() as { state: LocationState | null };
  const { slug } = useParams<{ slug: string }>();

  const [status, setStatus] = useState<'pending' | 'confirmed' | 'rejected'>('pending');
  const [confirmedBy, setConfirmedBy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [justUpdated, setJustUpdated] = useState(false);

  const receipt = state?.receipt;
  const event = state?.event;

  useEffect(() => {
    if (!receipt) return;
    if (receipt.status !== 'pending') {
      setStatus(receipt.status);
      setConfirmedBy(receipt.confirmedBy ?? null);
      setNote(receipt.note ?? null);
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await api.get<StatusResponse>(`/api/payment-receipts/status/${receipt.id}`);
        if (res.data.status !== 'pending') {
          clearInterval(interval);
          setStatus(res.data.status);
          setConfirmedBy(res.data.confirmedBy ?? null);
          setNote(res.data.note ?? null);
          setJustUpdated(true);
        }
      } catch {
        // silent — student has no auth, keep polling
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [receipt]);

  if (!receipt || !event) {
    return <Navigate to={`/pay/${slug}`} replace />;
  }

  const submittedAt = new Date(receipt.submittedAt).toLocaleString('en-GB', {
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-4">

        {/* Status banner */}
        {status === 'confirmed' && (
          <div className={`rounded-2xl px-4 py-4 text-center shadow-md bg-green-500 text-white ${justUpdated ? 'animate-bounce-once' : ''}`}>
            <p className="text-2xl mb-1">🎉</p>
            <p className="font-bold text-lg">Payment Confirmed!</p>
            {confirmedBy && <p className="text-sm opacity-90 mt-0.5">Confirmed by {confirmedBy}</p>}
            {note && <p className="text-sm opacity-80 mt-1 italic">"{note}"</p>}
          </div>
        )}

        {status === 'rejected' && (
          <div className="rounded-2xl px-4 py-4 text-center shadow-md bg-red-500 text-white">
            <p className="text-2xl mb-1">❌</p>
            <p className="font-bold text-lg">Receipt Rejected</p>
            {confirmedBy && <p className="text-sm opacity-90 mt-0.5">Reviewed by {confirmedBy}</p>}
            {note && <p className="text-sm opacity-80 mt-2 bg-red-600 rounded-lg px-3 py-2">Reason: {note}</p>}
            <p className="text-sm opacity-80 mt-2">Please contact your Fin Sec or CR.</p>
          </div>
        )}

        {status === 'pending' && (
          <div className="rounded-2xl px-4 py-3 text-center bg-yellow-50 border border-yellow-200">
            <div className="flex items-center justify-center gap-2 text-yellow-700 text-sm">
              <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse inline-block" />
              Waiting for Fin Sec to confirm your payment...
            </div>
          </div>
        )}

        {/* Details card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors duration-500
            ${status === 'confirmed' ? 'bg-green-500' : status === 'rejected' ? 'bg-red-500' : 'bg-green-100'}`}>
            {status === 'rejected' ? (
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className={`w-8 h-8 ${status === 'confirmed' ? 'text-white' : 'text-green-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-1">Receipt Submitted!</h1>
          <p className="text-sm text-gray-500 mb-4">Your payment receipt has been uploaded.</p>

          <div className="bg-gray-50 rounded-xl p-4 mb-4 text-left text-sm space-y-1">
            <div>
              <span className="text-gray-500">Name:</span>{' '}
              <span className="font-medium">{receipt.fullName}</span>
            </div>
            <div>
              <span className="text-gray-500">Matric:</span>{' '}
              <span className="font-medium">{receipt.matricNumber}</span>
            </div>
            {receipt.level && (
              <div>
                <span className="text-gray-500">Level:</span>{' '}
                <span className="font-medium">{receipt.level}</span>
              </div>
            )}
            <div>
              <span className="text-gray-500">Amount:</span>{' '}
              <span className="font-medium">{amount}</span>
            </div>
            <div>
              <span className="text-gray-500">Submitted:</span>{' '}
              <span className="font-medium">{submittedAt}</span>
            </div>
            <div className="pt-1">
              <span className="text-gray-500">Status:</span>{' '}
              {status === 'confirmed' ? (
                <span className="font-semibold text-green-600">Confirmed ✓</span>
              ) : status === 'rejected' ? (
                <span className="font-semibold text-red-600">Rejected ✗</span>
              ) : (
                <span className="font-medium text-yellow-600">Pending review</span>
              )}
            </div>
          </div>

          {/* Receipt image thumbnail */}
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">Your uploaded receipt</p>
            <a href={receipt.receiptUrl} target="_blank" rel="noopener noreferrer">
              <img
                src={receipt.receiptUrl}
                alt="Payment receipt"
                className="w-full max-h-40 object-contain rounded-xl border border-gray-200 cursor-pointer hover:opacity-90 transition"
              />
            </a>
            <p className="text-xs text-gray-400 mt-1">Tap to view full size</p>
          </div>

          <p className="text-xs text-gray-400">Screenshot this page for your records</p>
        </div>
      </div>
    </div>
  );
}
