import { useMemo } from 'react';
import { courseFromCatalog, previousAttempt } from '../model/courses';
import { compareSlots, semesterTitle, sessionForLevel, slotKey } from '../model/gpa';
import type { CatalogCourse, GpaCourse, SemesterView } from '../model/types';

interface ListedSlot {
  level: number;
  semester: number;
  courses: CatalogCourse[];
  units: number;
}

/**
 * One tap per semester whose courses are on the course list but not added yet: the
 * semester is created with every listed course and its units, so the student only
 * picks grades.
 */
export default function ListedSemesters({
  catalog,
  semesters,
  onCreate,
}: {
  catalog: CatalogCourse[];
  semesters: SemesterView[];
  onCreate: (input: { level: number; semester: number; courses: GpaCourse[] }) => void;
}) {
  const slots = useMemo(() => {
    const taken = new Set(semesters.map((semester) => slotKey(semester.level, semester.semester)));
    const bySlot = new Map<string, ListedSlot>();
    for (const course of catalog) {
      const key = slotKey(course.level, course.semester);
      if (taken.has(key)) continue;
      const slot = bySlot.get(key) ?? { level: course.level, semester: course.semester, courses: [], units: 0 };
      slot.courses.push(course);
      slot.units += course.units;
      bySlot.set(key, slot);
    }
    return [...bySlot.values()].sort(compareSlots);
  }, [catalog, semesters]);

  if (slots.length === 0) return null;

  return (
    <section aria-labelledby="listed-semesters-heading">
      <h2 id="listed-semesters-heading" className="text-sm font-semibold text-muted uppercase tracking-wider mb-2">Start a semester</h2>
      <div className="grid sm:grid-cols-2 gap-2">
        {slots.map((slot) => (
          <button
            key={slotKey(slot.level, slot.semester)}
            type="button"
            className="card-interactive p-4 text-left"
            onClick={() => onCreate({
              level: slot.level,
              semester: slot.semester,
              courses: slot.courses.map((course) => courseFromCatalog(course, previousAttempt(semesters, course.code, slot)?.grade ?? null)),
            })}
          >
            <span className="block font-semibold">{semesterTitle(slot.level, slot.semester)}</span>
            <span className="block text-sm text-muted mt-1">
              {slot.courses.length} course{slot.courses.length === 1 ? '' : 's'} · {slot.units} units · {sessionForLevel(slot.level)}
            </span>
            <span className="block text-sm text-accent font-medium mt-2">Fill in my grades →</span>
          </button>
        ))}
      </div>
    </section>
  );
}
