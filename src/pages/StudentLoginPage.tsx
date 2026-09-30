import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useStudentAuth } from '../context/StudentAuthContext';

export default function StudentLoginPage() {
  const { student, login, requestRegistrationCode, register } = useStudentAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [matric, setMatric] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const requested = params.get('returnTo') ?? '/student';
  const returnTo = requested.startsWith('/payment/') ? requested : '/student';
  if (student) return <Navigate to={returnTo} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true); setError('');
    try {
      if (mode === 'login') {
        await login(matric, password);
      } else if (!codeSent) {
        await requestRegistrationCode(matric, email);
        setCodeSent(true);
        return;
      } else {
        await register(matric, email, code, password);
      }
      navigate(returnTo, { replace: true });
    } catch (caught: unknown) {
      setError(axios.isAxiosError(caught) ? caught.response?.data?.error ?? 'Unable to continue.' : 'Unable to continue.');
    } finally { setLoading(false); }
  }

  return (
    <main className="page-base flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link to="/login" className="btn-ghost !px-0 mb-4">← Back to NEXIUM home</Link>
      <div className="card-base p-5 sm:p-6">
        <h1 className="text-xl font-semibold">Student account</h1>
        <p className="text-sm text-muted mt-1">Sign in to read Nexium Bulletin, manage payments and retrieve your tickets.</p>
        <div className="grid grid-cols-2 gap-1 bg-surface-2 p-1 rounded-lg mt-5">
          <button type="button" className={mode === 'login' ? 'btn-secondary' : 'btn-ghost'} onClick={() => { setMode('login'); setCodeSent(false); setShowPassword(false); setError(''); }}>Sign in</button>
          <button type="button" className={mode === 'register' ? 'btn-secondary' : 'btn-ghost'} onClick={() => { setMode('register'); setCodeSent(false); setShowPassword(false); setError(''); }}>Register</button>
        </div>
        {error && <div role="alert" className="alert-danger mt-4">{error}</div>}
        <form onSubmit={submit} className="space-y-4 mt-5">
          <div><label htmlFor="student-matric-number" className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Matric number</label><input id="student-matric-number" required disabled={codeSent} name="studentMatricNumber" inputMode="numeric" autoComplete="off" placeholder="e.g. 251106026" className="input-base uppercase" value={matric} onChange={(e) => setMatric(e.target.value)} /></div>
          {mode === 'register' && <div><label htmlFor="student-email" className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Email</label><input id="student-email" required disabled={codeSent} type="email" autoComplete="email" className="input-base" value={email} onChange={(e) => setEmail(e.target.value)} /></div>}
          {mode === 'register' && codeSent && <div><label htmlFor="student-verification-code" className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Verification code</label><input id="student-verification-code" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" className="input-base tracking-widest" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></div>}
          {(mode === 'login' || codeSent) && <div>
            <label htmlFor="student-password" className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Password</label>
            <div className="relative">
              <input id="student-password" required minLength={8} maxLength={128} type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="input-base pr-11" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-dim hover:text-muted transition-colors min-w-11 justify-center"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
              </button>
            </div>
          </div>}
          {mode === 'register' && !codeSent && <p className="text-xs text-dim">Your matric number must exist in class records, and the email address must reflect the name stored for it.</p>}
          {mode === 'register' && codeSent && <p className="text-xs text-dim">Enter the 6-digit code sent to {email}. It expires in 10 minutes.</p>}
          <button disabled={loading || (mode === 'register' && codeSent && code.length !== 6)} className="btn-primary w-full">{loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : codeSent ? 'Verify and create account' : 'Send verification code'}</button>
          {mode === 'register' && codeSent && <button type="button" className="btn-ghost w-full" onClick={() => { setCodeSent(false); setCode(''); setPassword(''); setShowPassword(false); setError(''); }}>Change details</button>}
        </form>
      </div>
      </div>
    </main>
  );
}
