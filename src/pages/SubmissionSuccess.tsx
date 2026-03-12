import { useState, useEffect } from 'react';
import { useLocation, useParams, Navigate } from 'react-router-dom';
import api from '../api/axios';
import type { Submission } from '../types';

interface LocationState {
  submission: Submission;
}

interface StatusResponse {
  isConfirmed: boolean;
  confirmedAt: string | null;
  confirmedBy: string | null;
}

export default function SubmissionSuccess() {
  const { state } = useLocation() as { state: LocationState | null };
  const { slug } = useParams<{ slug: string }>();

  const [confirmed, setConfirmed] = useState(false);
  const [confirmedBy, setConfirmedBy] = useState<string | null>(null);
  const [justConfirmed, setJustConfirmed] = useState(false);

  const submission = state?.submission;

  useEffect(() => {
    if (!submission) return;
    if (submission.isConfirmed) {
      setConfirmed(true);
      setConfirmedBy(submission.confirmedBy ?? null);
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await api.get<StatusResponse>(`/api/submissions/status/${submission.id}`);
        if (res.data.isConfirmed) {
          clearInterval(interval);
          setConfirmedBy(res.data.confirmedBy ?? null);
          setConfirmed(true);
          setJustConfirmed(true);
        }
      } catch {
        // silent — student has no auth, just keep polling
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [submission]);

  if (!submission) {
    return <Navigate to={`/submit/${slug}`} replace />;
  }

  const submittedAt = new Date(submission.submittedAt).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">

        {/* Confirmed banner — appears when CR confirms */}
        {confirmed && (
          <div
            className={`mb-4 rounded-2xl px-4 py-4 text-center shadow-md
              ${justConfirmed ? 'animate-bounce-once' : ''}
              bg-green-500 text-white`}
          >
            <p className="text-2xl mb-1">🎉</p>
            <p className="font-bold text-lg">CR has confirmed your submission!</p>
            {confirmedBy && (
              <p className="text-sm opacity-90 mt-0.5">Confirmed by {confirmedBy}</p>
            )}
          </div>
        )}

        {/* Waiting banner — shown while not yet confirmed */}
        {!confirmed && (
          <div className="mb-4 rounded-2xl px-4 py-3 text-center bg-yellow-50 border border-yellow-200">
            <div className="flex items-center justify-center gap-2 text-yellow-700 text-sm">
              <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse inline-block" />
              Waiting for CR to confirm your submission...
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors duration-500 ${confirmed ? 'bg-green-500' : 'bg-green-100'}`}>
            <svg className={`w-8 h-8 ${confirmed ? 'text-white' : 'text-green-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-1">Submission Recorded!</h1>
          <p className="text-sm text-gray-500 mb-4">Your digital record has been saved.</p>

          <div className="bg-gray-50 rounded-xl p-4 mb-5 text-left text-sm space-y-1">
            <div>
              <span className="text-gray-500">Name:</span>{' '}
              <span className="font-medium">{submission.fullName}</span>
            </div>
            <div>
              <span className="text-gray-500">Matric:</span>{' '}
              <span className="font-medium">{submission.matricNumber}</span>
            </div>
            {submission.level && (
              <div>
                <span className="text-gray-500">Level:</span>{' '}
                <span className="font-medium">{submission.level}</span>
              </div>
            )}
            <div>
              <span className="text-gray-500">Time:</span>{' '}
              <span className="font-medium">{submittedAt}</span>
            </div>
            <div className="pt-1">
              <span className="text-gray-500">Status:</span>{' '}
              {confirmed ? (
                <span className="font-semibold text-green-600">Confirmed ✓</span>
              ) : (
                <span className="font-medium text-yellow-600">Pending confirmation</span>
              )}
            </div>
          </div>

          {!confirmed && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">
                Show this QR code to your Course Rep for confirmation
              </p>
              <div className="inline-block border-2 border-gray-200 rounded-xl p-2 bg-white">
                <img
                  src={submission.qrCode}
                  alt="Submission QR Code"
                  className="w-44 h-44 mx-auto"
                />
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400">Screenshot this page for your records</p>
        </div>
      </div>
    </div>
  );
}
