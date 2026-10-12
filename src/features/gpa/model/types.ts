export type Grade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type SemesterStatus = 'draft' | 'finalized';

export interface GpaCourse {
  /** Server id; absent for courses only saved on this device. */
  id?: string;
  /** Stable key for React lists and editing. */
  key: string;
  catalogCourseId: string | null;
  code: string;
  title: string;
  units: number;
  grade: Grade | null;
  isCarryover: boolean;
  isRetake: boolean;
}

export interface GpaTotals {
  units: number;
  points: number;
  gpa: number | null;
  gradedCourses: number;
  pendingCourses: number;
  pendingUnits: number;
}

export interface GpaSemesterDto {
  id: string;
  level: number;
  semester: number;
  sessionLabel: string | null;
  status: SemesterStatus;
  finalizedAt: string | null;
  version: number;
  updatedAt: string;
  courses: Array<Omit<GpaCourse, 'key'> & { id: string; sortOrder: number }>;
  totals: GpaTotals;
}

export interface GpaSummary {
  cgpa: number | null;
  units: number;
  points: number;
  degreeClass: string | null;
  projectedCgpa: number | null;
  projectedUnits: number;
  finalizedSemesters: number;
  draftSemesters: number;
  pendingCourses: number;
}

export interface GpaRecordDto {
  semesters: GpaSemesterDto[];
  summary: GpaSummary;
}

export interface CatalogCourse {
  id: string;
  code: string;
  title: string;
  units: number;
  level: number;
  semester: number;
  isElective: boolean;
}

export type SyncState = 'synced' | 'pending' | 'syncing' | 'conflict' | 'error';

/** A semester as the student sees it: the saved copy, or their unsynced edits on this device. */
export interface SemesterView {
  id: string;
  level: number;
  semester: number;
  sessionLabel: string | null;
  status: SemesterStatus;
  finalizedAt: string | null;
  /** Version on the server (null if never saved there). */
  version: number | null;
  courses: GpaCourse[];
  totals: GpaTotals;
  sync: SyncState;
  syncMessage: string | null;
}

export interface ImportIssue {
  line: number;
  column?: string;
  message: string;
}

export interface ImportPreviewSemester {
  level: number;
  semester: number;
  isNew: boolean;
  added: number;
  updated: number;
  totalCourses: number;
  gpa: number | null;
  willFinalize: boolean;
  pendingCourses: number;
}

export interface ImportResult {
  valid: boolean;
  rowCount: number;
  issues: ImportIssue[];
  semesters: ImportPreviewSemester[];
  summaryAfterImport: GpaSummary;
  imported: boolean;
  record?: GpaRecordDto;
}
