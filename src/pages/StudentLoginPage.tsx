import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useToast } from '../context/ToastContext';
import { safeStudentReturnTo } from '../features/student-auth/model/returnTo';

type Mode = 'login' | 'register' | 'reset';

const labelClass = 'block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider';

function errorMessage(caught: unknown): string {
  if (axios.isAxiosError(caught)) {
    if (!caught.response) return 'You appear to be offline. Connect to the internet and try again.';
    return caught.response.data?.error ?? 'Unable to continue.';
  }
  return 'Unable to continue.';
}

function PasswordField({ id, label, autoComplete, value, onChange, visible, onToggle }: {
  id: string;
  label: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <div className="relative">
        <input id={id} required minLength={8} maxLength={128} type={visible ? 'text' : 'password'} autoComplete={autoComplete} className="input-base pr-11" value={value} onChange={(e) => onChange(e.target.value)} />
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-dim hover:text-muted transition-colors min-w-11 justify-center"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          )}
        </button>
      </div>
    </div>
  );
}

export default function StudentLoginPage() {
  const { student, login, requestRegistrationCode, register, requestPasswordReset, resetPassword } = useStudentAuth();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [matric, setMatric] = useState('');
  // JUPEB students have no matric number yet: they register with the email seeded for them.
  const [noMatric, setNoMatric] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const returnTo = safeStudentReturnTo(params.get('returnTo'));

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = window.setTimeout(() => setResendIn((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  if (student) return <Navigate to={returnTo} replace />;

  function switchMode(next: Mode) {
    setMode(next);
    setCodeSent(false);
    setCode('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setError('');
    if (next === 'reset') setIdentifier((current) => current || matric.trim());
  }

  async function sendResetCode() {
    const result = await requestPasswordReset(identifier.trim());
    setCodeSent(true);
    setResendIn(result.resendAfterSeconds ?? 60);
  }

  async function resend() {
    if (loading || resendIn > 0) return;
    setLoading(true); setError('');
    try {
      await sendResetCode();
      toast('If an account matches, a new code is on its way.', 'success');
    } catch (caught: unknown) {
      setError(errorMessage(caught));
    } finally { setLoading(false); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError('');
    if (mode === 'reset' && codeSent && password !== confirmPassword) {
      setError('The two passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(matric, password);
        navigate(returnTo, { replace: true });
      } else if (mode === 'reset') {
        if (!codeSent) {
          await sendResetCode();
          return;
        }
        await resetPassword(identifier.trim(), code, password);
        toast('Password updated. You are signed in.', 'success');
        navigate(returnTo, { replace: true });
      } else if (!codeSent) {
        await requestRegistrationCode(noMatric ? '' : matric, email);
        setCodeSent(true);
        return;
      } else {
        await register(noMatric ? '' : matric, email, code, password);
        navigate(returnTo, { replace: true });
      }
    } catch (caught: unknown) {
      setError(errorMessage(caught));
    } finally { setLoading(false); }
  }

  const togglePassword = () => setShowPassword((visible) => !visible);

  return (
    <main className="page-base flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link to="/" className="btn-ghost !px-0 mb-4">← Back to NEXIUM home</Link>
      <div className="card-base p-5 sm:p-6">
        {mode === 'reset' ? (
          <>
            <h1 className="text-xl font-semibold">Reset your password</h1>
            <p className="text-sm text-muted mt-1">
              {codeSent
                ? 'Enter the code from your email and choose a new password.'
                : 'Enter your matric number or the email on your account. We will email you a 6-digit code.'}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Student account</h1>
            <p className="text-sm text-muted mt-1">Sign in to read Nexium Bulletin, manage payments, track your GPA and retrieve your tickets.</p>
            <div className="grid grid-cols-2 gap-1 bg-surface-2 p-1 rounded-lg mt-5">
              <button type="button" className={mode === 'login' ? 'btn-secondary' : 'btn-ghost'} onClick={() => switchMode('login')}>Sign in</button>
              <button type="button" className={mode === 'register' ? 'btn-secondary' : 'btn-ghost'} onClick={() => switchMode('register')}>Register</button>
            </div>
          </>
        )}
        {error && <div role="alert" className="alert-danger mt-4">{error}</div>}

        {mode === 'reset' ? (
          <form onSubmit={submit} className="space-y-4 mt-5">
            <div>
              <label htmlFor="student-reset-identifier" className={labelClass}>Matric number or email</label>
              <input id="student-reset-identifier" required disabled={codeSent} maxLength={254} autoComplete="username" placeholder="e.g. 251106026" className="input-base" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
            </div>
            {codeSent && (
              <>
                <div role="status" className="alert-success text-sm">
                  If an account matches, we sent a code to the email linked to it. It expires in 10 minutes. Check your spam folder if you can't see it.
                </div>
                <div>
                  <label htmlFor="student-reset-code" className={labelClass}>Reset code</label>
                  <input id="student-reset-code" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" className="input-base tracking-widest" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
                </div>
                <PasswordField id="student-new-password" label="New password" autoComplete="new-password" value={password} onChange={setPassword} visible={showPassword} onToggle={togglePassword} />
                <PasswordField id="student-confirm-password" label="Confirm new password" autoComplete="new-password" value={confirmPassword} onChange={setConfirmPassword} visible={showPassword} onToggle={togglePassword} />
                <p className="text-xs text-dim">At least 8 characters. Resetting signs you out on your other devices.</p>
              </>
            )}
            <button disabled={loading || (codeSent && code.length !== 6)} className="btn-primary w-full">
              {loading ? 'Please wait…' : codeSent ? 'Reset password and sign in' : 'Send reset code'}
            </button>
            {codeSent && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button type="button" className="btn-ghost !px-0 text-sm" disabled={loading || resendIn > 0} onClick={() => void resend()}>
                  {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                </button>
                <button type="button" className="btn-ghost !px-0 text-sm" onClick={() => { setCodeSent(false); setCode(''); setError(''); }}>
                  Use a different account
                </button>
              </div>
            )}
            <button type="button" className="btn-ghost w-full" onClick={() => switchMode('login')}>← Back to sign in</button>
          </form>
        ) : (
        <form onSubmit={submit} className="space-y-4 mt-5">
          {mode === 'login' ? (
            <div><label htmlFor="student-matric-number" className={labelClass}>Matric number or email</label><input id="student-matric-number" required name="studentMatricNumber" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="e.g. 251106026" className="input-base" value={matric} onChange={(e) => setMatric(e.target.value)} /></div>
          ) : !noMatric ? (
            <div>
              <label htmlFor="student-matric-number" className={labelClass}>Matric number</label>
              <input id="student-matric-number" required disabled={codeSent} name="studentMatricNumber" inputMode="numeric" autoComplete="off" placeholder="e.g. 251106026" className="input-base uppercase" value={matric} onChange={(e) => setMatric(e.target.value)} />
              {!codeSent && <button type="button" className="text-xs text-accent mt-1.5 min-h-8" onClick={() => { setNoMatric(true); setError(''); }}>No matric number yet (e.g. JUPEB)?</button>}
            </div>
          ) : (
            <div className="bg-surface-2 border border-nx rounded-lg px-3 py-2.5 text-sm">
              Registering with the email your class rep added for you.
              {!codeSent && <button type="button" className="block text-xs text-accent mt-1 min-h-8" onClick={() => { setNoMatric(false); setError(''); }}>I have a matric number</button>}
            </div>
          )}
          {mode === 'register' && <div><label htmlFor="student-email" className={labelClass}>Email</label><input id="student-email" required disabled={codeSent} type="email" autoComplete="email" className="input-base" value={email} onChange={(e) => setEmail(e.target.value)} /></div>}
          {mode === 'register' && codeSent && <div><label htmlFor="student-verification-code" className={labelClass}>Verification code</label><input id="student-verification-code" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" className="input-base tracking-widest" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></div>}
          {(mode === 'login' || codeSent) && (
            <div>
              <PasswordField id="student-password" label="Password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={setPassword} visible={showPassword} onToggle={togglePassword} />
              {mode === 'login' && (
                <div className="mt-2 text-right">
                  <button type="button" className="text-sm text-accent hover:underline" onClick={() => switchMode('reset')}>Forgot password?</button>
                </div>
              )}
            </div>
          )}
          {mode === 'register' && !codeSent && <p className="text-xs text-dim">{noMatric ? 'Use exactly the email your class rep registered for you. We will send a verification code there.' : 'Your matric number must exist in class records. We will send a verification code to your email.'}</p>}
          {mode === 'register' && codeSent && <p className="text-xs text-dim">Enter the 6-digit code sent to {email}. It expires in 10 minutes.</p>}
          <button type="submit" disabled={loading || (mode === 'register' && codeSent && code.length !== 6)} className="btn-primary w-full">{loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : codeSent ? 'Verify and create account' : 'Send verification code'}</button>
          {mode === 'register' && codeSent && <button type="button" className="btn-ghost w-full" onClick={() => { setCodeSent(false); setCode(''); setPassword(''); setShowPassword(false); setError(''); }}>Change details</button>}
        </form>
        )}
      </div>
      </div>
    </main>
  );
}
