export default function SubmissionClosed() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Submissions Closed</h1>
        <p className="text-gray-500 text-sm">
          This event is no longer accepting submissions. The deadline may have passed or the course
          rep has closed it manually.
        </p>
        <p className="text-gray-400 text-xs mt-4">
          If you believe this is an error, contact your Course Representative.
        </p>
      </div>
    </div>
  );
}
