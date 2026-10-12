import type { SemesterView } from './types';

export const IMPORT_HEADER = 'level,semester,code,title,units,grade,carryover,retake,session';
export const MAX_IMPORT_CHARACTERS = 500_000;

function cell(value: string | number | boolean | null | undefined): string {
  const raw = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

export function importTemplate(): string {
  return [
    '# NEXIUM GPA tracker - import template. One row per course. Lines starting with # are ignored.',
    '# level: 100, 200, 300, 400, 500 or 600   semester: 1 or 2',
    '# grade: A, B, C, D, E or F - leave it blank if the result is not out yet',
    '# carryover / retake: yes or no (optional)   session: e.g. 2025/2026 (optional)',
    '# title and units can be left blank for courses that are in the NEXIUM course list.',
    IMPORT_HEADER,
    '# Example (delete the # to use it): 200,1,ABC 201,Example Course Title,3,A,no,no,2025/2026',
    '',
  ].join('\n');
}

/** The student's courses in the import format: a backup they can re-import later. */
export function exportRecordCsv(semesters: SemesterView[]): string {
  const rows = semesters.flatMap((semester) => semester.courses.map((course) => [
    semester.level, semester.semester, course.code, course.title, course.units, course.grade ?? '',
    course.isCarryover ? 'yes' : 'no', course.isRetake ? 'yes' : 'no', semester.sessionLabel ?? '',
  ].map(cell).join(',')));
  return [IMPORT_HEADER, ...rows].join('\n') + '\n';
}

export function downloadText(filename: string, text: string, type = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
