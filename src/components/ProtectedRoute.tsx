import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, sessionError, retrySession } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div role="alert" className="alert-danger text-center">
          <p>We couldn&apos;t restore your session. Please check your connection.</p>
          <button type="button" className="btn-secondary mt-3" onClick={retrySession}>Try again</button>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
