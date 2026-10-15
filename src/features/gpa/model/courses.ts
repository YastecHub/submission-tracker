import { compareSlots, courseKey, courseRowKey } from './gpa';
import type { CatalogCourse, GpaCourse, Grade, SemesterView } from './types';

export function courseFromCatalog(course: CatalogCourse, previousGrade: Grade | null = null): GpaCourse {
  return {
    key: courseRowKey(course.code),
    catalogCourseId: course.id,
    code: course.code,
    title: course.title,
    units: course.units,
    grade: null,
    isCarryover: false,
    // Taking a course again after failing it is a retake; the student can untick it.
    isRetake: previousGrade === 'F',
  };
}

export function catalogForSlot(catalog: CatalogCourse[], level: number, semester: number): CatalogCourse[] {
  return catalog.filter((course) => course.level === level && course.semester === semester);
}

/** The latest grade for this course in an earlier semester, if the student took it before. */
export function previousAttempt(
  semesters: SemesterView[],
  code: string,
  before: { level: number; semester: number },
): { grade: Grade | null; level: number; semester: number } | null {
  const key = courseKey(code);
  const earlier = semesters
    .filter((semester) => compareSlots(semester, before) < 0)
    .sort(compareSlots)
    .reverse();
  for (const semester of earlier) {
    const course = semester.courses.find((item) => courseKey(item.code) === key);
    if (course) return { grade: course.grade, level: semester.level, semester: semester.semester };
  }
  return null;
}

/** Simple ranked search: code prefix matches first, then code/title substring matches. */
export function searchCatalog(catalog: CatalogCourse[], query: string, limit = 20): CatalogCourse[] {
  const text = query.trim().toLowerCase();
  if (!text) return [];
  const compact = text.replace(/\s+/g, '');
  const scored: Array<{ course: CatalogCourse; score: number }> = [];
  for (const course of catalog) {
    const code = course.code.toLowerCase().replace(/\s+/g, '');
    const title = course.title.toLowerCase();
    let score = -1;
    if (code.startsWith(compact)) score = 0;
    else if (code.includes(compact)) score = 1;
    else if (title.startsWith(text)) score = 2;
    else if (title.includes(text)) score = 3;
    if (score >= 0) scored.push({ course, score });
  }
  return scored
    .sort((a, b) => a.score - b.score || a.course.level - b.course.level || a.course.code.localeCompare(b.course.code))
    .slice(0, limit)
    .map((item) => item.course);
}
