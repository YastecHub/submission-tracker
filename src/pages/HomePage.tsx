import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStudentAuth } from '../context/StudentAuthContext';
import { studentFirstName } from '../utils/studentName';

const STUDENT_POINTS = ['Class announcements on Nexium Bulletin', 'Your private GPA and CGPA tracker', 'Payment tickets and the class ledger'];
const CLASS_REP_POINTS = ['Submissions and QR confirmation', 'Payments, receipts and tickets', 'Ledger and Bulletin publishing'];

function Points({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-sm text-muted">
          <span aria-hidden="true" className="mt-2 w-1.5 h-1.5 rounded-full bg-[color:var(--nx-accent)] shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  );
}

/**
 * Landing page and PWA start screen. Students and class reps both start here
 * and pick their side; anyone already signed in to exactly one side goes straight there.
 */
export default function HomePage() {
  const navigate = useNavigate();
  const { user, loading: classRepLoading } = useAuth();
  const { student, loading: studentLoading } = useStudentAuth();
  const loading = classRepLoading || studentLoading;

  useEffect(() => {
    if (loading) return;
    if (user && !student) navigate('/dashboard', { replace: true });
    else if (student && !user) navigate('/student', { replace: true });
  }, [loading, user, student, navigate]);

  if (loading || (user && !student) || (student && !user)) {
    return (
      <div className="page-base flex items-center justify-center" role="status" aria-label="Opening NEXIUM">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin border-[color:var(--nx-accent)]" />
      </div>
    );
  }

  const bothSignedIn = Boolean(user && student);

  return (
    <main className="page-base px-4 py-10 sm:py-16">
      <div className="w-full max-w-3xl mx-auto animate-fade-up">
        <header className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-surface-2 border border-nx flex items-center justify-center overflow-hidden">
            <img src="/icon.svg" alt="" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight leading-tight">NEXIUM</p>
            <p className="text-sm text-muted leading-tight">Your class, in one place.</p>
          </div>
        </header>

        <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight leading-tight mt-10">
          {bothSignedIn ? 'Which side do you want to open?' : 'How are you using NEXIUM?'}
        </h1>
        <p className="text-muted mt-3 max-w-xl">
          {bothSignedIn
            ? 'You are signed in as a student and as a class rep on this device.'
            : 'Choose your side to sign in. You can switch any time from this page.'}
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mt-8">
          <Link
            to={student ? '/student' : '/student/login'}
            className="card-interactive p-5 sm:p-6 flex flex-col group focus-visible:border-[color:var(--nx-accent)]"
          >
            <span className="text-xs uppercase tracking-wider text-accent font-semibold">Students</span>
            <span className="text-xl font-semibold tracking-tight mt-2">I&apos;m a student</span>
            <Points items={STUDENT_POINTS} />
            <span className="btn-primary mt-6 w-full justify-center text-center">
              {student ? `Continue as ${studentFirstName(student.fullName)}` : 'Student sign in or register'}
            </span>
          </Link>

          <Link
            to={user ? '/dashboard' : '/login'}
            className="card-interactive p-5 sm:p-6 flex flex-col group focus-visible:border-[color:var(--nx-accent)]"
          >
            <span className="text-xs uppercase tracking-wider text-accent font-semibold">Class reps</span>
            <span className="text-xl font-semibold tracking-tight mt-2">I&apos;m a class rep</span>
            <Points items={CLASS_REP_POINTS} />
            <span className="btn-secondary mt-6 w-full justify-center text-center">
              {user ? `Continue as ${user.name.split(/\s+/)[0]}` : 'Class rep sign in'}
            </span>
          </Link>
        </div>

        <p className="text-xs text-dim mt-8">
          Tip: add NEXIUM to your home screen from your browser menu to open it like an app, even offline.
        </p>
      </div>
    </main>
  );
}
