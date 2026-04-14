import { useParams, Link } from 'react-router-dom';

export default function PaymentSubmitClosed() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Payment Closed</h1>
          <p className="text-gray-500 text-sm mb-1">
            This payment collection is no longer accepting receipts.
          </p>
          <p className="text-gray-400 text-xs">The deadline may have passed or it has been closed.</p>
          {slug && (
            <p className="mt-4 text-xs text-gray-300 font-mono break-all">ref: {slug}</p>
          )}
        </div>

        <Link
          to="/transparency"
          className="block bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-2xl p-4 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xl">
              ₦
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-emerald-800">See class account transparency</p>
              <p className="text-xs text-emerald-700">View the current balance and all transactions →</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
