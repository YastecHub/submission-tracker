import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRemoteData } from '../../../hooks/useRemoteData';
import { getMyBirthday } from '../api/birthdays';
import FlowerShower from './FlowerShower';

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * Birthday cards on the student home page:
 *  - the student's own birthday: a banner (the flowers themselves pop up from the student shell);
 *  - classmates celebrating today (those who agreed to share it);
 *  - a prompt to fill in the birthday form, until it is filled in.
 */
export default function BirthdayHomeCards({ token }: { token: string }) {
  const load = useCallback((signal: AbortSignal) => getMyBirthday(token, signal), [token]);
  const { data } = useRemoteData(load);
  // The flowers pop up by themselves from the student shell; this button brings them back.
  const [showFlowers, setShowFlowers] = useState(false);

  if (!data) return null;

  return (
    <>
      {showFlowers && <FlowerShower name={data.greetingName} onDone={() => setShowFlowers(false)} />}

      {data.isMyBirthday && (
        <section className="card-base p-5 mb-6 border-[color:var(--nx-accent)] bg-[color:var(--nx-accent-soft)]" aria-label="Your birthday">
          <div className="flex items-center gap-4">
            <span className="text-4xl shrink-0" aria-hidden="true">💐</span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold">Happy birthday, {data.greetingName}! 🎂</h2>
              <p className="text-sm text-muted mt-0.5">The whole class is celebrating you today.</p>
            </div>
            <button type="button" className="btn-ghost !py-1 text-sm shrink-0" onClick={() => setShowFlowers(true)}>Flowers 🌸</button>
          </div>
        </section>
      )}

      {data.today.length > 0 && (
        <section className="card-base p-5 mb-6" aria-label="Birthdays today">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3 shrink-0">
              {data.today.slice(0, 3).map((person) => person.photoUrl
                ? <img key={person.name} src={person.photoUrl} alt="" className="w-11 h-11 rounded-full object-cover border-2 border-[color:var(--nx-surface)]" />
                : <span key={person.name} className="w-11 h-11 rounded-full bg-surface-2 border-2 border-[color:var(--nx-surface)] flex items-center justify-center text-xl" aria-hidden="true">🎂</span>)}
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold">🎉 Today is {joinNames(data.today.map((person) => person.name))}&apos;s birthday!</h2>
              <p className="text-sm text-muted mt-0.5">Send {data.today.length === 1 ? 'them' : 'them all'} your wishes today 🎂</p>
            </div>
          </div>
        </section>
      )}

      {!data.birthday && (
        <section className="card-base p-5 mb-6 border-dashed" aria-label="Birthday form">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-3xl" aria-hidden="true">🎂</span>
            <div className="flex-1">
              <h2 className="font-semibold">When&apos;s your birthday?</h2>
              <p className="text-sm text-muted mt-0.5">Fill in the 30-second birthday form so the class can celebrate you. Day and month only.</p>
            </div>
            <Link to="/student/birthday" className="btn-primary !py-2 text-center justify-center">Fill the form</Link>
          </div>
        </section>
      )}
    </>
  );
}
