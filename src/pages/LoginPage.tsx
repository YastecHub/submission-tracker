import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import axios from 'axios';

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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Grid background + radial fade */}
      <div className="absolute inset-0 bg-grid-dark bg-radial-fade pointer-events-none" />

      {/* Aurora blobs */}
      <div className="blob bg-purple-600 w-[500px] h-[500px] -top-40 -left-40 animate-aurora" />
      <div className="blob bg-violet-700 w-[420px] h-[420px] -bottom-32 -right-32 animate-aurora-slow" />
      <div className="blob bg-amber-500 w-[300px] h-[300px] top-1/3 right-1/4 opacity-25 animate-aurora" />

      <div className="w-full max-w-md relative animate-fade-up">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 mb-4 shadow-2xl animate-pulse-ring-violet overflow-hidden">
            <img src="/icon.svg" alt="NEXIUM" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gradient-nexium">NEXIUM</h1>
          <p className="text-zinc-400 text-sm mt-1.5 tracking-wide">Class Representative Portal</p>
        </div>

        {/* Login card with gradient border */}
        <div className="relative rounded-3xl p-[1px] bg-gradient-to-br from-white/20 via-white/5 to-transparent overflow-hidden">
          <div className="absolute inset-0 opacity-50 overflow-hidden rounded-3xl">
            <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer-sweep" />
          </div>

          <div className="relative bg-zinc-900/80 backdrop-blur-xl rounded-3xl p-7 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-1">Welcome back</h2>
            <p className="text-sm text-zinc-400 mb-6">Sign in to manage submissions and payments.</p>

            {error && (
              <div className="mb-5 bg-red-500/10 text-red-300 border border-red-500/30 rounded-xl px-4 py-3 text-sm flex items-start gap-2 animate-fade-up">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">Email</label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 group-focus-within:text-amber-400 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-800/60 border border-zinc-700 text-zinc-100 placeholder-zinc-500 rounded-xl pl-10 pr-3 py-3 text-base focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition"
                    placeholder="cr@university.edu"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">Password</label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 group-focus-within:text-amber-400 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-800/60 border border-zinc-700 text-zinc-100 placeholder-zinc-500 rounded-xl pl-10 pr-12 py-3 text-base focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-zinc-300 transition"
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

              <button
                type="submit"
                disabled={loading}
                className="relative w-full overflow-hidden bg-gradient-to-r from-purple-700 via-violet-600 to-purple-700 hover:from-purple-600 hover:via-violet-500 hover:to-purple-600 text-white font-semibold py-3.5 rounded-xl transition disabled:opacity-60 text-base mt-2 shadow-lg shadow-purple-600/40 flex items-center justify-center gap-2 group ring-1 ring-amber-300/30"
              >
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer-sweep" />
                </span>
                {loading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin relative" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="relative">Signing in...</span>
                  </>
                ) : (
                  <>
                    <span className="relative">Sign In</span>
                    <svg className="w-5 h-5 relative group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Transparency link */}
        <Link
          to="/transparency"
          className="card-lift mt-5 flex items-center gap-3 bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-xl border border-white/10 hover:border-emerald-400/40 rounded-2xl p-4 group"
        >
          <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-emerald-500/30 flex-shrink-0">
            ₦
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Student? View class account transparency</p>
            <p className="text-xs text-zinc-400 mt-0.5">See the balance and every transaction</p>
          </div>
          <svg className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <p className="text-center text-xs text-zinc-500 mt-6">
          Protected portal. Contact your admin if you need access.
        </p>
      </div>
    </div>
  );
}
