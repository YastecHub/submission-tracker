import { useLocation, useParams, Navigate } from 'react-router-dom';
import type { Submission } from '../types';

interface LocationState {
  submission: Submission;
}

export default function SubmissionSuccess() {
  const { state } = useLocation() as { state: LocationState | null };
  const { slug } = useParams<{ slug: string }>();

  if (!state?.submission) {
    return <Navigate to={`/submit/${slug}`} replace />;
  }

  const { submission } = state;
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
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-1">Submission Confirmed!</h1>
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
          </div>

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

          <p className="text-xs text-gray-400">Screenshot this page for your records</p>
        </div>
      </div>
    </div>
  );
}
