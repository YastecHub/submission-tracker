import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useGpa } from '../features/gpa/hooks/GpaProvider';
import AddSemesterDialog from '../features/gpa/components/AddSemesterDialog';
import CgpaHero from '../features/gpa/components/CgpaHero';
import GpaPlanner from '../features/gpa/components/GpaPlanner';
import ImportDialog from '../features/gpa/components/ImportDialog';
import ListedSemesters from '../features/gpa/components/ListedSemesters';
import SemesterCard from '../features/gpa/components/SemesterCard';
import { catalogForSlot } from '../features/gpa/model/courses';
import { downloadText, exportRecordCsv } from '../features/gpa/model/csv';
import { LEVELS, nextOpenSlot } from '../features/gpa/model/gpa';

function SyncStatus() {
  const { online, pendingSyncCount, semesters } = useGpa();
  const conflicts = semesters.filter((semester) => semester.sync === 'conflict' || semester.sync === 'error').length;
  if (conflicts) return <span className="badge badge-danger">{conflicts} semester{conflicts === 1 ? ' needs' : 's need'} attention</span>;
  if (!online) return <span className="badge" style={{ background: 'var(--nx-accent-soft)', color: 'var(--nx-accent)' }}>Offline - changes saved on this device</span>;
  if (pendingSyncCount) return <span className="badge">Saving…</span>;
  return null;
}

export default function GpaOverviewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { student } = useStudentAuth();
  const gpa = useGpa();
  const { semesters, summary, catalog, loading, loadError } = gpa;
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);

  const nextUnits = useMemo(() => {
    const slot = nextOpenSlot(semesters);
    const listed = catalogForSlot(catalog, slot.level, slot.semester).reduce((sum, course) => sum + course.units, 0);
    if (listed) return listed;
    const withUnits = semesters.filter((semester) => semester.totals.units + semester.totals.pendingUnits > 0);
    if (!withUnits.length) return 20;
    return Math.round(withUnits.reduce((sum, semester) => sum + semester.totals.units + semester.totals.pendingUnits, 0) / withUnits.length);
  }, [semesters, catalog]);

  const byLevel = useMemo(() => LEVELS
    .map((level) => ({ level, items: semesters.filter((semester) => semester.level === level) }))
    .filter((group) => group.items.length > 0), [semesters]);

  function createSemester(input: Parameters<typeof gpa.createSemester>[0]) {
    const id = gpa.createSemester(input);
    setAdding(false);
    navigate(`/student/gpa/semester/${id}`);
  }

  const dialogs = (
    <>
      {adding && (
        <AddSemesterDialog
          semesters={semesters}
          catalog={catalog}
          onCreate={createSemester}
          onOpenExisting={(id) => { setAdding(false); navigate(`/student/gpa/semester/${id}`); }}
          onClose={() => setAdding(false)}
        />
      )}
      {importing && (
        <ImportDialog
          online={gpa.online}
          onCheck={(csv, finalize) => gpa.importCsv(csv, { dryRun: true, finalize })}
          onImport={async (csv, finalize) => {
            const result = await gpa.importCsv(csv, { dryRun: false, finalize });
            if (result.imported) {
              setImporting(false);
              toast(`Imported ${result.rowCount} course${result.rowCount === 1 ? '' : 's'}.`, 'success');
            }
            return result;
          }}
          onClose={() => setImporting(false)}
        />
      )}
    </>
  );

  const header = (
    <div className="mb-6">
      <p className="text-xs uppercase tracking-wider text-accent font-semibold">Private to you</p>
      <div className="flex flex-wrap items-center gap-3 mt-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">GPA tracker</h1>
        <SyncStatus />
      </div>
      <p className="text-sm text-muted mt-2">5.0 scale. Only you can see your results. Class reps can&apos;t.</p>
    </div>
  );

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-8">
        {header}
        <div className="card-base h-48 animate-pulse" aria-label="Loading your GPA" />
      </main>
    );
  }

  if (loadError && semesters.length === 0) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-8">
        {header}
        <div role="alert" className="alert-danger">
          We couldn&apos;t load your GPA record{gpa.online ? '' : ' while offline'}.{' '}
          <button type="button" className="underline font-semibold" onClick={() => void gpa.refresh()}>Try again</button>
        </div>
      </main>
    );
  }

  if (semesters.length === 0) {
    const firstName = student?.fullName.split(/\s+/)[0] ?? 'there';
    return (
      <main className="max-w-3xl mx-auto px-4 py-8">
        {header}
        <section className="card-base p-5 sm:p-7" aria-labelledby="gpa-welcome">
          <h2 id="gpa-welcome" className="text-xl font-semibold tracking-tight">Hi {firstName}, let&apos;s set up your GPA</h2>
          <p className="text-sm text-muted mt-2">Add each semester as results come out. Your CGPA updates instantly and your history is kept safe.</p>
          <ol className="mt-5 space-y-3">
            {[
              ['Pick a semester', 'Its courses and units are filled in for you.'],
              ['Pick your grades', 'Choose A to F for each course. Leave a grade blank if the result isn’t out yet; your GPA counts the rest.'],
              ['Finalize when official', 'Final semesters count towards your CGPA. You can unlock them to fix mistakes.'],
            ].map(([title, body], index) => (
              <li key={title} className="flex gap-3">
                <span className="w-7 h-7 rounded-full bg-[color:var(--nx-accent-soft)] text-accent text-sm font-semibold flex items-center justify-center shrink-0">{index + 1}</span>
                <span>
                  <span className="block text-sm font-medium">{title}</span>
                  <span className="block text-sm text-muted">{body}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-6"><ListedSemesters catalog={catalog} semesters={semesters} onCreate={createSemester} /></div>
          <div className="flex flex-col sm:flex-row gap-2 mt-6">
            <button type="button" className={catalog.length ? 'btn-secondary justify-center' : 'btn-primary justify-center'} onClick={() => setAdding(true)}>{catalog.length ? 'Choose another semester' : 'Add your first semester'}</button>
            <button type="button" className="btn-secondary justify-center" onClick={() => setImporting(true)}>Import from a spreadsheet</button>
          </div>
        </section>
        {dialogs}
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {header}
      <CgpaHero summary={summary} semesters={semesters} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button type="button" className="btn-primary justify-center col-span-2 sm:col-span-1" onClick={() => setAdding(true)}>+ Add semester</button>
        <button type="button" className="btn-secondary justify-center" onClick={() => setImporting(true)}>Import CSV</button>
        <Link to="/student/gpa/transcript" className="btn-secondary justify-center text-center">Transcript</Link>
        <button type="button" className="btn-secondary justify-center col-span-2 sm:col-span-1" onClick={() => downloadText('my-gpa-courses.csv', exportRecordCsv(semesters))}>Download CSV</button>
      </div>

      {byLevel.map((group) => (
        <section key={group.level} aria-labelledby={`level-${group.level}`}>
          <h2 id={`level-${group.level}`} className="text-sm font-semibold text-muted uppercase tracking-wider mb-2">{group.level} Level</h2>
          <div className="space-y-2">
            {group.items.map((semester) => <SemesterCard key={semester.id} semester={semester} />)}
          </div>
        </section>
      ))}

      <ListedSemesters catalog={catalog} semesters={semesters} onCreate={createSemester} />

      <GpaPlanner semesters={semesters} nextSemesterUnits={nextUnits} />
      {dialogs}
    </main>
  );
}
