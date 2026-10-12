import { useRef, useState, type DragEvent } from 'react';
import { useDialogFocus } from '../../../hooks/useDialogFocus';
import { downloadText, importTemplate, MAX_IMPORT_CHARACTERS } from '../model/csv';
import { formatGpa, semesterTitle } from '../model/gpa';
import type { ImportResult } from '../model/types';
import { DegreeBadge } from './CgpaHero';

type Step = 'choose' | 'checking' | 'preview' | 'importing';

export default function ImportDialog({
  online,
  onCheck,
  onImport,
  onClose,
}: {
  online: boolean;
  onCheck: (csv: string, finalize: boolean) => Promise<ImportResult>;
  onImport: (csv: string, finalize: boolean) => Promise<ImportResult>;
  onClose: () => void;
}) {
  const panelRef = useDialogFocus(onClose);
  const fileInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('choose');
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [finalize, setFinalize] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<ImportResult | null>(null);

  async function readFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_IMPORT_CHARACTERS) {
      setError('That file is too large. Split it into smaller files.');
      return;
    }
    if (!/\.(csv|txt)$/i.test(file.name) && file.type && !/csv|text/.test(file.type)) {
      setError('Choose a .csv file. In Excel or Google Sheets use "Save as / Download as CSV".');
      return;
    }
    setCsv(await file.text());
    setFileName(file.name);
    setError('');
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    void readFile(event.dataTransfer.files[0]);
  }

  async function check() {
    if (!csv.trim()) {
      setError('Choose a CSV file or paste your courses first.');
      return;
    }
    setStep('checking');
    setError('');
    try {
      setPreview(await onCheck(csv, finalize));
      setStep('preview');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The file could not be checked.');
      setStep('choose');
    }
  }

  async function confirm() {
    setStep('importing');
    setError('');
    try {
      const result = await onImport(csv, finalize);
      if (!result.imported) {
        setPreview(result);
        setStep('preview');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Nothing was imported. Please try again.');
      setStep('preview');
    }
  }

  const busy = step === 'checking' || step === 'importing';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4" role="dialog" aria-modal="true" aria-labelledby="import-title">
      <div className="absolute inset-0 bg-black/70" onClick={busy ? undefined : onClose} />
      <div ref={panelRef} className="relative card-base w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto p-5 sm:p-6 rounded-b-none sm:rounded-b-[0.875rem] animate-fade-up">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="import-title" className="text-lg font-semibold">Import from CSV</h2>
            <p className="text-sm text-muted mt-1">Add many courses at once from a spreadsheet. You will see a preview before anything is saved.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="text-2xl leading-none text-dim hover:text-[color:var(--nx-text)] w-10 h-10 shrink-0">&times;</button>
        </div>

        {!online && <div role="alert" className="alert-danger mt-4 text-sm">Importing needs an internet connection.</div>}
        {error && <div role="alert" className="alert-danger mt-4 text-sm">{error}</div>}

        {(step === 'choose' || step === 'checking') && (
          <div className="mt-5 space-y-4">
            <button type="button" className="btn-ghost !px-0 text-sm" onClick={() => downloadText('nexium-gpa-template.csv', importTemplate())}>
              ↓ Download the template
            </button>
            <div
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`rounded-xl border border-dashed px-4 py-6 text-center transition-colors ${dragging ? 'border-[color:var(--nx-accent)] bg-[color:var(--nx-accent-soft)]' : 'border-nx bg-surface-2'}`}
            >
              <input ref={fileInput} type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={(event) => void readFile(event.target.files?.[0])} />
              <p className="text-sm font-medium">{fileName ?? 'Drop your CSV file here'}</p>
              <button type="button" className="btn-secondary !py-2 mt-3" onClick={() => fileInput.current?.click()}>Choose file</button>
            </div>
            <div>
              <label htmlFor="import-paste" className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Or paste the rows</label>
              <textarea
                id="import-paste"
                rows={5}
                className="input-base font-mono text-xs"
                placeholder={'level,semester,code,title,units,grade\n200,1,ABC 201,Example Course,3,A'}
                value={csv}
                onChange={(event) => { setCsv(event.target.value); setFileName(null); }}
              />
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-1 accent-[color:var(--nx-accent)]" checked={finalize} onChange={(event) => setFinalize(event.target.checked)} />
              <span className="text-sm">
                Mark semesters as final results when every course has a grade
                <span className="block text-xs text-dim mt-0.5">Leave this on for results that are already out.</span>
              </span>
            </label>
            <button type="button" className="btn-primary w-full justify-center" disabled={busy || !online} onClick={() => void check()}>
              {step === 'checking' ? 'Checking…' : 'Check file'}
            </button>
          </div>
        )}

        {(step === 'preview' || step === 'importing') && preview && (
          <div className="mt-5 space-y-4">
            {preview.valid ? (
              <>
                <p className="text-sm">
                  {preview.rowCount} course{preview.rowCount === 1 ? '' : 's'} ready to import into {preview.semesters.length} semester{preview.semesters.length === 1 ? '' : 's'}:
                </p>
                <ul className="space-y-2">
                  {preview.semesters.map((semester) => (
                    <li key={`${semester.level}-${semester.semester}`} className="bg-surface-2 border border-nx rounded-lg px-3 py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{semesterTitle(semester.level, semester.semester)}</p>
                        <p className="text-xs text-dim">
                          {semester.isNew ? 'New' : 'Existing draft'} · {semester.added} added{semester.updated ? ` · ${semester.updated} updated` : ''}
                          {' · '}{semester.willFinalize ? 'Final' : semester.pendingCourses ? `Draft (${semester.pendingCourses} without grade)` : 'Draft'}
                        </p>
                      </div>
                      <p className="text-lg font-semibold tabular-nums">{formatGpa(semester.gpa)}</p>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between gap-3 border-t border-nx pt-4">
                  <p className="text-sm text-muted">CGPA after import</p>
                  <div className="flex items-center gap-2">
                    <DegreeBadge cgpa={preview.summaryAfterImport.cgpa ?? preview.summaryAfterImport.projectedCgpa} />
                    <span className="text-2xl font-semibold tabular-nums">{formatGpa(preview.summaryAfterImport.cgpa ?? preview.summaryAfterImport.projectedCgpa)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn-secondary flex-1" disabled={busy} onClick={() => setStep('choose')}>Back</button>
                  <button type="button" className="btn-primary flex-1" disabled={busy || !online} onClick={() => void confirm()}>
                    {step === 'importing' ? 'Importing…' : `Import ${preview.rowCount} course${preview.rowCount === 1 ? '' : 's'}`}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div role="alert" className="alert-danger text-sm">
                  {preview.issues.length} problem{preview.issues.length === 1 ? '' : 's'} found. Nothing was imported. Fix the file and check it again.
                </div>
                <ul className="max-h-72 overflow-y-auto divide-y divide-[color:var(--nx-border)] border border-nx rounded-lg">
                  {preview.issues.slice(0, 100).map((issue, index) => (
                    <li key={index} className="px-3 py-2 text-sm">
                      <span className="font-mono text-xs text-dim">{issue.line > 0 ? `Line ${issue.line}` : 'File'}{issue.column ? ` · ${issue.column}` : ''}</span>
                      <p className="mt-0.5">{issue.message}</p>
                    </li>
                  ))}
                </ul>
                <button type="button" className="btn-primary w-full justify-center" onClick={() => setStep('choose')}>Fix and check again</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
