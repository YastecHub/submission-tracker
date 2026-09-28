import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStudentAuth } from '../context/StudentAuthContext';

export default function StudentProtectedRoute({ children }: { children: ReactNode }) {
  const { student, loading, sessionError, retrySession } = useStudentAuth();
  const location = useLocation();
  if (loading) return <div className="page-base flex items-center justify-center"><div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin border-[color:var(--nx-accent)]" /></div>;
  if (sessionError) return <div className="page-base flex items-center justify-center px-4"><div role="alert" className="alert-danger text-center"><p>We couldn&apos;t restore your student session. Please check your connection.</p><button type="button" className="btn-secondary mt-3" onClick={retrySession}>Try again</button></div></div>;
  if (!student) return <Navigate to={`/student/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <>{children}</>;
}
