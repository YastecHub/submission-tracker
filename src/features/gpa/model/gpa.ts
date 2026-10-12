import type { Grade, GpaSummary, GpaTotals, SemesterStatus } from './types';

/**
 * UNILAG 5.0 scale. Mirrors server/src/modules/gpa/domain (grades.ts + gpaCalculator.ts);
 * both sides are tested with the same examples.
 */
export const GRADES: readonly Grade[] = ['A', 'B', 'C', 'D', 'E', 'F'];
export const GRADE_POINTS: Record<Grade, number> = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };
/** Pharm. D. is a six-year programme: 100L to 600L. */
export const LEVELS = [100, 200, 300, 400, 500, 600] as const;
/** The set's first session (100L). Each level after it is one session later. */
export const FIRST_SESSION_START_YEAR = 2025;

export function sessionForLevel(level: number): string {
  const start = FIRST_SESSION_START_YEAR + Math.max(0, Math.round(level / 100) - 1);
  return `${start}/${start + 1}`;
}

/** 2025/2026 (100L) to 2030/2031 (600L). */
export const SESSIONS: readonly string[] = LEVELS.map(sessionForLevel);
export const SEMESTERS = [1, 2] as const;
export const MAX_UNITS_PER_COURSE = 12;
export const MAX_COURSES_PER_SEMESTER = 30;
export const MAX_GPA = 5;

export const DEGREE_CLASSES = [
  { min: 4.5, label: 'First Class', tone: 'first' },
  { min: 3.5, label: 'Second Class Upper', tone: 'upper' },
  { min: 2.4, label: 'Second Class Lower', tone: 'lower' },
  { min: 1.5, label: 'Third Class', tone: 'third' },
  { min: 1.0, label: 'Pass', tone: 'pass' },
] as const;

export type DegreeTone = (typeof DEGREE_CLASSES)[number]['tone'] | 'below' | 'none';

export function degreeClass(cgpa: number | null): { label: string; tone: DegreeTone } | null {
  if (cgpa === null) return null;
  const band = DEGREE_CLASSES.find((item) => cgpa >= item.min);
  return band ? { label: band.label, tone: band.tone } : { label: 'Below Pass', tone: 'below' };
}

export function roundGpa(points: number, units: number): number | null {
  if (units <= 0) return null;
  return Math.round((points * 100) / units) / 100;
}

export function formatGpa(value: number | null): string {
  return value === null ? '–' : value.toFixed(2);
}

export function courseTotals(courses: Array<{ units: number; grade: Grade | null }>): GpaTotals {
  let units = 0;
  let points = 0;
  let gradedCourses = 0;
  let pendingCourses = 0;
  let pendingUnits = 0;
  for (const course of courses) {
    if (course.grade === null) {
      pendingCourses += 1;
      pendingUnits += course.units;
      continue;
    }
    units += course.units;
    points += GRADE_POINTS[course.grade] * course.units;
    gradedCourses += 1;
  }
  return { units, points, gpa: roundGpa(points, units), gradedCourses, pendingCourses, pendingUnits };
}

export function summarize(semesters: Array<{ status: SemesterStatus; courses: Array<{ units: number; grade: Grade | null }> }>): GpaSummary {
  let units = 0;
  let points = 0;
  let projectedUnits = 0;
  let projectedPoints = 0;
  let finalizedSemesters = 0;
  let draftSemesters = 0;
  let pendingCourses = 0;
  for (const semester of semesters) {
    const totals = courseTotals(semester.courses);
    projectedUnits += totals.units;
    projectedPoints += totals.points;
    pendingCourses += totals.pendingCourses;
    if (semester.status === 'finalized') {
      finalizedSemesters += 1;
      units += totals.units;
      points += totals.points;
    } else {
      draftSemesters += 1;
    }
  }
  const cgpa = roundGpa(points, units);
  return {
    cgpa,
    units,
    points,
    degreeClass: degreeClass(cgpa)?.label ?? null,
    projectedCgpa: roundGpa(projectedPoints, projectedUnits),
    projectedUnits,
    finalizedSemesters,
    draftSemesters,
    pendingCourses,
  };
}

/**
 * GPA needed over the next `units` to reach `target` CGPA.
 * Returns null when there are no units to plan for.
 */
export function requiredGpa(currentPoints: number, currentUnits: number, target: number, units: number): number | null {
  if (units <= 0) return null;
  const needed = (target * (currentUnits + units) - currentPoints) / units;
  return Math.ceil(Math.max(0, needed) * 100) / 100;
}

export function normalizeCourseCode(value: string): string {
  const compact = value.trim().toUpperCase().replace(/\s+/g, ' ');
  const match = compact.replace(/\s+/g, '').match(/^([A-Z]{2,5}(?:-[A-Z]{1,5})?)(\d{3,4}[A-Z]?)$/);
  return match ? `${match[1]} ${match[2]}` : compact;
}

export function courseKey(code: string): string {
  return code.replace(/\s+/g, '').toUpperCase();
}

export function semesterTitle(level: number, semester: number): string {
  return `${level} Level · ${semester === 1 ? 'First' : 'Second'} semester`;
}

export function shortSemesterTitle(level: number, semester: number): string {
  return `${level}L ${semester === 1 ? '1st' : '2nd'} sem`;
}

export function slotKey(level: number, semester: number): string {
  return `${level}-${semester}`;
}

export function compareSlots(a: { level: number; semester: number }, b: { level: number; semester: number }): number {
  return a.level - b.level || a.semester - b.semester;
}

/** The first level/semester the student has not added yet (200L first semester by default). */
export function nextOpenSlot(taken: Array<{ level: number; semester: number }>, startLevel = 100): { level: number; semester: number } {
  const used = new Set(taken.map((slot) => slotKey(slot.level, slot.semester)));
  const sorted = [...taken].sort(compareSlots);
  const latest = sorted[sorted.length - 1];
  const levels = LEVELS.filter((level) => level >= Math.min(startLevel, latest?.level ?? startLevel));
  for (const level of levels) {
    for (const semester of SEMESTERS) {
      if (latest && compareSlots({ level, semester }, latest) < 0) continue;
      if (!used.has(slotKey(level, semester))) return { level, semester };
    }
  }
  for (const level of LEVELS) for (const semester of SEMESTERS) if (!used.has(slotKey(level, semester))) return { level, semester };
  return { level: startLevel, semester: 1 };
}
