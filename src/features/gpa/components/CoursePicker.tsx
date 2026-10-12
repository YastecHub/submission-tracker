import { useMemo, useState, type FormEvent } from 'react';
import { newCourseKey } from '../model/drafts';
import { catalogForSlot, searchCatalog } from '../model/courses';
import { courseKey, MAX_UNITS_PER_COURSE, normalizeCourseCode, shortSemesterTitle } from '../model/gpa';
import type { CatalogCourse, GpaCourse } from '../model/types';

/**
 * Add courses by typing a code or title (typeahead over the course list), add every
 * listed course for this semester in one tap, or add a course that isn't listed.
 */
export default function CoursePicker({
  catalog,
  level,
  semester,
  existingCodes,
  onAddFromCatalog,
  onAddCustom,
  full,
}: {
  catalog: CatalogCourse[];
  level: number;
  semester: number;
  existingCodes: Set<string>;
  onAddFromCatalog: (courses: CatalogCourse[]) => void;
  onAddCustom: (course: GpaCourse) => void;
  full: boolean;
}) {
  const [query, setQuery] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [custom, setCustom] = useState({ code: '', title: '', units: '3' });
  const [customError, setCustomError] = useState('');

  const missingListed = useMemo(
    () => catalogForSlot(catalog, level, semester).filter((course) => !existingCodes.has(courseKey(course.code))),
    [catalog, level, semester, existingCodes],
  );
  const results = useMemo(() => searchCatalog(catalog, query, 12), [catalog, query]);

  function addCustom(event: FormEvent) {
    event.preventDefault();
    const code = normalizeCourseCode(custom.code);
    const units = Number(custom.units);
    if (!code) return setCustomError('Enter the course code.');
    if (code.length > 20) return setCustomError('That course code is too long.');
    if (existingCodes.has(courseKey(code))) return setCustomError(`${code} is already in this semester.`);
    if (!Number.isInteger(units) || units < 1 || units > MAX_UNITS_PER_COURSE) return setCustomError(`Units must be between 1 and ${MAX_UNITS_PER_COURSE}.`);
    onAddCustom({
      key: newCourseKey(), catalogCourseId: null, code, title: custom.title.trim() || code, units,
      grade: null, isCarryover: false, isRetake: false,
    });
    setCustom({ code: '', title: '', units: '3' });
    setCustomError('');
    setShowCustom(false);
  }

  if (full) {
    return <p className="text-sm text-dim">This semester has the maximum of 30 courses.</p>;
  }

  return (
    <div className="space-y-3">
      {missingListed.length > 0 && (
        <button type="button" className="btn-secondary w-full justify-center" onClick={() => onAddFromCatalog(missingListed)}>
          + Add {missingListed.length === 1 ? missingListed[0].code : `all ${missingListed.length} listed courses`} for this semester
        </button>
      )}

      <div>
        <label htmlFor="course-search" className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Find a course</label>
        <input
          id="course-search"
          type="search"
          className="input-base"
          placeholder={catalog.length ? 'Type a course code or title, e.g. PCT' : 'No course list yet - add courses below'}
          value={query}
          disabled={catalog.length === 0}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
        />
        {query.trim() && (
          <ul className="mt-2 border border-nx rounded-lg divide-y divide-[color:var(--nx-border)] overflow-hidden" aria-label="Matching courses">
            {results.length === 0 && <li className="px-3 py-3 text-sm text-dim">No listed course matches “{query.trim()}”.</li>}
            {results.map((course) => {
              const added = existingCodes.has(courseKey(course.code));
              const otherSlot = course.level !== level || course.semester !== semester;
              return (
                <li key={course.id}>
                  <button
                    type="button"
                    disabled={added}
                    onClick={() => { onAddFromCatalog([course]); setQuery(''); }}
                    className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-surface-2 disabled:opacity-50 min-h-11"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{course.code} <span className="text-dim font-normal">· {course.units} units</span></span>
                      <span className="block text-xs text-muted truncate">{course.title}</span>
                    </span>
                    <span className="text-[11px] text-dim shrink-0">{added ? 'Added' : otherSlot ? shortSemesterTitle(course.level, course.semester) : 'Add'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showCustom ? (
        <form onSubmit={addCustom} className="bg-surface-2 border border-nx rounded-lg p-3 space-y-3" aria-label="Add a course that is not listed">
          <div className="grid grid-cols-[1fr_5rem] gap-2">
            <div>
              <label htmlFor="custom-code" className="block text-xs font-medium text-muted mb-1">Code</label>
              <input id="custom-code" className="input-base uppercase" placeholder="ABC 201" value={custom.code} onChange={(event) => setCustom({ ...custom, code: event.target.value })} autoComplete="off" />
            </div>
            <div>
              <label htmlFor="custom-units" className="block text-xs font-medium text-muted mb-1">Units</label>
              <input id="custom-units" type="number" inputMode="numeric" min={1} max={MAX_UNITS_PER_COURSE} className="input-base" value={custom.units} onChange={(event) => setCustom({ ...custom, units: event.target.value })} />
            </div>
          </div>
          <div>
            <label htmlFor="custom-title" className="block text-xs font-medium text-muted mb-1">Title <span className="text-dim">(optional)</span></label>
            <input id="custom-title" className="input-base" maxLength={150} value={custom.title} onChange={(event) => setCustom({ ...custom, title: event.target.value })} />
          </div>
          {customError && <p role="alert" className="text-xs text-danger">{customError}</p>}
          <div className="flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={() => { setShowCustom(false); setCustomError(''); }}>Cancel</button>
            <button type="submit" className="btn-primary flex-1">Add course</button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn-ghost w-full justify-center text-sm" onClick={() => setShowCustom(true)}>
          + Add a course that isn&apos;t listed
        </button>
      )}
    </div>
  );
}
