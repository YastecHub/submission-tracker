export type EventType = 'assignment' | 'attendance' | 'lab' | 'other';
export type Level = '100L' | '200L' | '300L' | '400L' | '500L' | 'Postgrad';

export type UserRole = 'cr' | 'acr' | 'dev';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt?: string;
}

export interface SubmissionEvent {
  id: string;
  slug: string;
  title: string;
  courseCode: string;
  type: EventType;
  description?: string | null;
  deadline: string;
  isClosed: boolean;
  isDeleted: boolean;
  createdBy?: string;
  createdAt?: string;
  totalSubmissions?: number;
  confirmedCount?: number;
  pendingCount?: number;
}

export interface Submission {
  id: string;
  eventId: string;
  fullName: string;
  matricNumber: string;
  level?: string | null;
  qrCode: string;
  submittedAt: string;
  isConfirmed: boolean;
  confirmedAt?: string | null;
  confirmedBy?: string | null;
}
