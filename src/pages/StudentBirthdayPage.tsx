import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useToast } from '../context/ToastContext';
import { useRemoteData } from '../hooks/useRemoteData';
import { getMyBirthday, saveMyBirthday } from '../features/birthdays/api/birthdays';
import { DAYS_IN_MONTH, MONTHS, type MyBirthday } from '../features/birthdays/model/types';
import { errorMessage } from '../features/elections/model/election';

const MAX_PHOTO = 5 * 1024 * 1024;

function Question({ number, title, required, help, children }: { number: number; title: string; required?: boolean; help?: string; children: ReactNode }) {
  return (
    <fieldset className="card-base p-5 sm:p-6">
      <legend className="sr-only">{title}</legend>
      <p className="font-medium" aria-hidden="true">
        <span className="text-dim mr-1.5">{number}.</span>{title}{required && <span className="text-danger ml-1">*</span>}
      </p>
      {help && <p className="text-xs text-dim mt-1">{help}</p>}
      <div className="mt-4">{children}</div>
    </fieldset>
  );
}

function Done({ data, onEdit }: { data: MyBirthday; onEdit: () => void }) {
  const birthday = data.birthday!;
  return (
    <div className="card-base overflow-hidden">
      <div className="h-2 bg-[color:var(--nx-accent)]" />
      <div className="p-6 sm:p-8 text-center">
        <p className="text-5xl" aria-hidden="true">🎉</p>
        <h1 className="text-2xl font-semibold mt-3">You&apos;re all set, {data.greetingName}!</h1>
        <p className="text-muted mt-2">We&apos;ll celebrate you on <span className="font-semibold text-[color:var(--nx-text)]">{birthday.label}</span>.</p>
        <p className="text-sm text-dim mt-1">
          {birthday.shareWithClass ? 'Your classmates will be reminded on the day.' : 'Classmates won’t be told; only class reps and the media team can see it.'}
          {!birthday.photoUrl && ' No photo yet: the media team will reach out on your birthday.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center mt-6">
          <Link to="/student" className="btn-primary justify-center">Back to home</Link>
          <button type="button" className="btn-secondary justify-center" onClick={onEdit}>Edit my answer</button>
        </div>
      </div>
    </div>
  );
}

/** The birthday form: looks and feels like a short form, saved straight to the student's account. */
export default function StudentBirthdayPage() {
  const { token } = useStudentAuth();
  const { toast } = useToast();
  const load = useCallback((signal: AbortSignal) => getMyBirthday(token!, signal), [token]);
  const { data, loading, error, refresh } = useRemoteData(load, 0, !!token);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState<MyBirthday | null>(null);
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [share, setShare] = useState<'yes' | 'no'>('yes');
  const [photo, setPhoto] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  const current = saved ?? data;
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  // Start the form from the saved answer when editing.
  useEffect(() => {
    const birthday = current?.birthday;
    if (!birthday) return;
    setMonth(String(birthday.month));
    setDay(String(birthday.day));
    setPreferredName(birthday.preferredName ?? '');
    setShare(birthday.shareWithClass ? 'yes' : 'no');
  }, [current?.birthday]);

  const days = month ? DAYS_IN_MONTH[Number(month) - 1] : 31;
  useEffect(() => { if (day && Number(day) > days) setDay(''); }, [day, days]);

  function choosePhoto(file: File | undefined) {
    setProblem('');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setProblem('Choose a JPG, PNG or WEBP photo.'); return; }
    if (file.size > MAX_PHOTO) { setProblem('The photo must be under 5 MB.'); return; }
    setPhoto(file);
    setRemovePhoto(false);
  }

  function clearForm() {
    setMonth(''); setDay(''); setPreferredName(''); setShare('yes'); setPhoto(null); setProblem('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!month || !day) { setProblem('Choose your birth month and day.'); return; }
    setBusy(true);
    setProblem('');
    try {
      const next = await saveMyBirthday(token!, { month: Number(month), day: Number(day), preferredName, shareWithClass: share === 'yes', photo, removePhoto });
      setSaved(next);
      setEditing(false);
      setPhoto(null);
      setRemovePhoto(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (caught) {
      setProblem(errorMessage(caught, 'Your answer could not be saved. Please try again.'));
      toast('Your answer could not be saved.', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return <main className="max-w-2xl mx-auto px-4 py-8"><div role="alert" className="alert-danger">We couldn&apos;t load the birthday form. <button type="button" className="underline font-semibold" onClick={() => void refresh()}>Try again</button></div></main>;
  }
  if (loading && !current) return <main className="max-w-2xl mx-auto px-4 py-8"><div className="card-base h-64 animate-pulse" /></main>;

  if (current?.birthday && !editing) {
    return <main className="max-w-2xl mx-auto px-4 py-8"><Done data={current} onEdit={() => setEditing(true)} /></main>;
  }

  const existingPhoto = !removePhoto && !photo ? current?.birthday?.photoUrl : null;
  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="card-base overflow-hidden">
          <div className="h-2 bg-[color:var(--nx-accent)]" />
          <div className="p-5 sm:p-6">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">🎂 NEXIUM Birthday Form</h1>
            <p className="text-sm text-muted mt-2">Tell us your birthday so Class Nexium can celebrate you: flowers in the app, a birthday email, and a reminder to your classmates. We only ask for the day and month, never the year.</p>
            <p className="text-xs text-danger mt-3">* Required</p>
          </div>
        </div>

        <Question number={1} title="When is your birthday?" required>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="birthday-month" className="block text-xs text-muted mb-1.5">Month</label>
              <select id="birthday-month" required className="input-base" value={month} onChange={(event) => setMonth(event.target.value)}>
                <option value="">Choose</option>
                {MONTHS.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="birthday-day" className="block text-xs text-muted mb-1.5">Day</label>
              <select id="birthday-day" required className="input-base" value={day} onChange={(event) => setDay(event.target.value)}>
                <option value="">Choose</option>
                {Array.from({ length: days }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
              </select>
            </div>
          </div>
        </Question>

        <Question number={2} title="What should we call you?" help="Optional. Used for birthday wishes and the media team's flyer, e.g. Emmy. Leave it empty to use your name.">
          <label htmlFor="birthday-name" className="sr-only">Preferred name</label>
          <input id="birthday-name" maxLength={40} className="input-base" placeholder="Your answer" value={preferredName} onChange={(event) => setPreferredName(event.target.value)} />
        </Question>

        <Question number={3} title="A photo for your birthday flyer" help="Optional. If you skip it, the media team will reach out for a picture on your birthday.">
          <div className="flex items-center gap-4">
            {(preview || existingPhoto) && <img src={preview ?? existingPhoto!} alt="Your photo" className="w-20 h-20 rounded-xl object-cover border border-nx" />}
            <div className="flex flex-col gap-2">
              <label className="btn-secondary !py-2 cursor-pointer w-fit">
                {preview || existingPhoto ? 'Change photo' : 'Add photo'}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => choosePhoto(event.target.files?.[0])} />
              </label>
              {(preview || existingPhoto) && (
                <button type="button" className="text-xs text-danger text-left min-h-8" onClick={() => { setPhoto(null); setRemovePhoto(!!current?.birthday?.photoUrl); }}>Remove photo</button>
              )}
              <p className="text-[11px] text-dim">JPG, PNG or WEBP, under 5 MB.</p>
            </div>
          </div>
        </Question>

        <Question number={4} title="Tell your classmates on your birthday?" required help="Classmates get a notification and see it on their home page. If you choose No, only class reps and the media team will see it.">
          <div className="space-y-2">
            {([['yes', 'Yes, let them celebrate me 🎉'], ['no', 'No, keep it low-key']] as const).map(([value, label]) => (
              <label key={value} className={`flex items-center gap-3 rounded-lg border px-3 py-3 min-h-11 cursor-pointer ${share === value ? 'border-[color:var(--nx-accent)] bg-[color:var(--nx-accent-soft)]' : 'border-nx'}`}>
                <input type="radio" name="share" value={value} checked={share === value} onChange={() => setShare(value)} className="accent-[color:var(--nx-accent)]" />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </Question>

        {problem && <p role="alert" className="alert-danger">{problem}</p>}

        <div className="flex items-center justify-between gap-3">
          <button type="submit" className="btn-primary min-w-32 justify-center" disabled={busy}>{busy ? 'Saving…' : current?.birthday ? 'Save changes' : 'Submit'}</button>
          {current?.birthday
            ? <button type="button" className="btn-ghost text-sm" onClick={() => setEditing(false)}>Cancel</button>
            : <button type="button" className="btn-ghost text-sm" onClick={clearForm}>Clear form</button>}
        </div>
        <p className="text-[11px] text-dim">Saved to your NEXIUM account. Your birthday is shown to class reps and the media team for the celebrations.</p>
      </form>
    </main>
  );
}
