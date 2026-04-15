export default function SubmissionClosed() {
  return (
    <div className="page-base flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center animate-fade-up">
        <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-surface-2 border border-nx">
          <svg className="w-7 h-7 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold tracking-tight mb-2">Submissions closed</h1>
        <p className="text-muted text-sm leading-relaxed">
          This event is no longer accepting submissions. The deadline may have passed or the class
          rep has closed it manually.
        </p>
        <p className="text-dim text-xs mt-4">
          If you believe this is an error, contact your class representative.
        </p>
      </div>
    </div>
  );
}
