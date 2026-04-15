import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import axios from 'axios';

const FEATURES = [
  {
    title: 'Collect submissions',
    body: 'Share one link. Students upload their work before the deadline, no more DMs, no more lost files.',
  },
  {
    title: 'Track payments',
    body: 'Receipts come in, get verified, and stay in one place. Export when you need to.',
  },
  {
    title: 'Public ledger',
    body: 'Every naira in or out is visible to the class. Nothing to explain, nothing to defend.',
  },
  {
    title: 'No more chasing',
    body: 'Students see what is due and what has been paid. You stop being the middleman.',
  },
];

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (user) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedInUser = await login(email, password);
      const roleLabel = loggedInUser.role === 'acr' ? 'Assistant CR' : 'Class Rep';
      toast(`Welcome back, ${loggedInUser.name} (${roleLabel})!`, 'success');
      navigate('/dashboard');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error ?? 'Login failed. Please try again.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-base px-4 py-8 sm:py-16">
      {/* Mobile brand header — desktop hides this, brand lives in left column */}
      <div className="md:hidden flex items-center gap-3 mb-6 max-w-md mx-auto">
        <div className="w-10 h-10 rounded-xl bg-surface-2 border border-nx flex items-center justify-center overflow-hidden">
          <img src="/icon.svg" alt="" className="w-full h-full object-contain" />
        </div>
        <div>
          <p className="text-base font-semibold tracking-tight leading-tight">NEXIUM</p>
          <p className="text-xs text-muted leading-tight">Run your class in one place.</p>
        </div>
      </div>

      <div className="w-full max-w-5xl mx-auto grid md:grid-cols-2 gap-10 md:gap-16 md:items-center animate-fade-up">
        {/* Left — brand + features (desktop; hidden on mobile top, shown below form) */}
        <div className="order-2 md:order-1">
          <div className="hidden md:flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-surface-2 border border-nx flex items-center justify-center overflow-hidden">
              <img src="/icon.svg" alt="" className="w-full h-full object-contain" />
            </div>
            <span className="text-lg font-semibold tracking-tight">NEXIUM</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight leading-tight">
            Run your class.<br />
            <span className="text-muted">Collect submissions and dues in one place.</span>
          </h1>

          <p className="mt-4 sm:mt-5 text-muted text-[0.95rem] leading-relaxed max-w-md">
            The App is a quiet workspace for class reps. Gather assignments, log payments,
            and keep the whole class in the loop, without the whatsapp group-chat chaos.
          </p>

          <ul className="mt-6 sm:mt-8 space-y-5">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[color:var(--nx-accent)] flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">{f.title}</p>
                  <p className="text-muted text-sm leading-relaxed mt-0.5">{f.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Right — login card */}
        <div className="order-1 md:order-2 w-full max-w-md mx-auto md:mx-0 md:justify-self-end">
          <div className="card-base p-7 sm:p-8">
            <h2 className="text-xl font-semibold">Sign in</h2>
            <p className="text-sm text-muted mt-1">Class reps and assistant CRs only.</p>

            {error && (
              <div className="alert-danger mt-5 flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-base"
                  placeholder="cr@university.edu"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-base pr-11"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-dim hover:text-muted transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                {loading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Signing in…</span>
                  </>
                ) : (
                  <span>Sign in</span>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-dim mt-5">
            Protected portal. Contact your admin if you need access.
          </p>

          {/* Student CTA — prominent, right under the login card on every screen */}
          <Link
            to="/transparency"
            className="mt-5 flex items-center justify-between gap-3 card-base p-4 hover:border-[color:var(--nx-border-hover)] transition-colors group"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold">Are you a student?</p>
              <p className="text-xs text-muted mt-0.5">View the class account ledger.</p>
            </div>
            <span className="flex-shrink-0 w-9 h-9 rounded-lg bg-surface-2 border border-nx flex items-center justify-center text-accent group-hover:bg-[color:var(--nx-accent)] group-hover:text-black group-hover:border-[color:var(--nx-accent)] transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
