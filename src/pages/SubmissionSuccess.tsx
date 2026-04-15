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
    return <Navigate to={`/submitit/${slug}`} replace />;
  }

  const submittedAt = new Date(submission.submittedAt).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="page-base flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm animate-fade-up">
        {confirmed && (
          <div className={`alert-success mb-4 text-center ${justConfirmed ? 'animate-bounce-once' : ''}`}>
            <p className="font-semibold">CR has confirmed your submission.</p>
            {confirmedBy && <p className="text-xs opacity-80 mt-1">Confirmed by {confirmedBy}</p>}
          </div>
        )}

        {!confirmed && (
          <div className="card-base mb-4 px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-2 text-muted text-sm">
              <span className="w-2 h-2 rounded-full bg-[color:var(--nx-accent)] inline-block" />
              Waiting for CR to confirm your submission…
            </div>
          </div>
        )}

        <div className="card-base p-6 text-center">
          <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-surface-2 border border-nx">
            <svg className={`w-7 h-7 ${confirmed ? 'text-success' : 'text-accent'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-xl font-semibold tracking-tight">Submission recorded</h1>
          <p className="text-sm text-muted mt-1 mb-5">Your digital record has been saved.</p>

          <div className="bg-surface-2 border border-nx rounded-lg p-4 mb-5 text-left text-sm space-y-1.5">
            <div>
              <span className="text-dim">Name:</span>{' '}
              <span className="font-medium">{submission.fullName}</span>
            </div>
            <div>
              <span className="text-dim">Matric:</span>{' '}
              <span className="font-medium">{submission.matricNumber}</span>
            </div>
            {submission.level && (
              <div>
                <span className="text-dim">Level:</span>{' '}
                <span className="font-medium">{submission.level}</span>
              </div>
            )}
            <div>
              <span className="text-dim">Time:</span>{' '}
              <span className="font-medium">{submittedAt}</span>
            </div>
            <div className="pt-1">
              <span className="text-dim">Status:</span>{' '}
              {confirmed ? (
                <span className="font-semibold text-success">Confirmed</span>
              ) : (
                <span className="font-medium text-accent">Pending confirmation</span>
              )}
            </div>
          </div>

          {!confirmed && (
            <div className="mb-4">
              <p className="text-xs text-muted mb-2">
                Show this QR code to your class rep for confirmation
              </p>
              <div className="inline-block border border-nx rounded-lg p-2 bg-white">
                <img
                  src={submission.qrCode}
                  alt="Submission QR code"
                  className="w-44 h-44 mx-auto"
                />
              </div>
            </div>
          )}

          <p className="text-xs text-dim">Screenshot this page for your records.</p>
        </div>
      </div>
    </div>
  );
}
