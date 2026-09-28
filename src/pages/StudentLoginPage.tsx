import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
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
  const requested = params.get('returnTo') ?? '/transparency';
  const returnTo = requested.startsWith('/payment/') || requested === '/transparency' ? requested : '/transparency';
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
    <div className="page-base flex items-center justify-center px-4 py-10">
      <div className="card-base p-6 w-full max-w-sm">
        <h1 className="text-xl font-semibold">Student account</h1>
        <p className="text-sm text-muted mt-1">Sign in to submit receipts and retrieve your tickets.</p>
        <div className="grid grid-cols-2 gap-1 bg-surface-2 p-1 rounded-lg mt-5">
          <button type="button" className={mode === 'login' ? 'btn-secondary' : 'btn-ghost'} onClick={() => { setMode('login'); setCodeSent(false); setError(''); }}>Sign in</button>
          <button type="button" className={mode === 'register' ? 'btn-secondary' : 'btn-ghost'} onClick={() => { setMode('register'); setCodeSent(false); setError(''); }}>Register</button>
        </div>
        {error && <div role="alert" className="alert-danger mt-4">{error}</div>}
        <form onSubmit={submit} className="space-y-4 mt-5">
          <div><label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Matric number</label><input required disabled={codeSent} name="studentMatricNumber" inputMode="numeric" autoComplete="off" placeholder="e.g. 251106026" className="input-base uppercase" value={matric} onChange={(e) => setMatric(e.target.value)} /></div>
          {mode === 'register' && <div><label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Email</label><input required disabled={codeSent} type="email" autoComplete="email" className="input-base" value={email} onChange={(e) => setEmail(e.target.value)} /></div>}
          {mode === 'register' && codeSent && <div><label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Verification code</label><input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" className="input-base tracking-widest" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></div>}
          {(mode === 'login' || codeSent) && <div><label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Password</label><input required minLength={8} maxLength={128} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="input-base" value={password} onChange={(e) => setPassword(e.target.value)} /></div>}
          {mode === 'register' && !codeSent && <p className="text-xs text-dim">Your matric number must exist in class records, and the email address must reflect the name stored for it.</p>}
          {mode === 'register' && codeSent && <p className="text-xs text-dim">Enter the 6-digit code sent to {email}. It expires in 10 minutes.</p>}
          <button disabled={loading || (mode === 'register' && codeSent && code.length !== 6)} className="btn-primary w-full">{loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : codeSent ? 'Verify and create account' : 'Send verification code'}</button>
          {mode === 'register' && codeSent && <button type="button" className="btn-ghost w-full" onClick={() => { setCodeSent(false); setCode(''); setPassword(''); setError(''); }}>Change details</button>}
        </form>
      </div>
    </div>
  );
}
