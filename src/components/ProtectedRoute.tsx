import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CLASS_ROLES, homePathFor } from '../features/auth/model/capabilities';
import type { UserRole } from '../types';

/**
 * Staff pages. By default only class reps get in; the electoral committee is sent to
 * the elections area (its only area). Pass `roles` to open a page to other roles.
 */
export default function ProtectedRoute({ children, roles = CLASS_ROLES }: { children: ReactNode; roles?: readonly UserRole[] }) {
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
  if (!roles.includes(user.role)) return <Navigate to={homePathFor(user.role)} replace />;
  return <>{children}</>;
}
