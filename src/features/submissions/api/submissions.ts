import api from '../../../api/axios';
import type { Submission, SubmissionEvent } from '../../../types';

export interface SubmissionsPage {
  submissions: Submission[];
  total: number;
  confirmedTotal: number;
  pendingTotal: number;
  page: number;
  totalPages: number;
}

export const getSubmissionEvent = async (id: string, signal: AbortSignal) =>
  (await api.get<SubmissionEvent>(`/api/events/id/${id}`, { signal })).data;

export const listSubmissions = async (id: string, page: number, search: string, signal: AbortSignal) =>
  (await api.get<SubmissionsPage>(`/api/submissions/${id}`, {
    signal, params: { page, limit: 50, ...(search ? { search } : {}) },
  })).data;

export const confirmAllSubmissions = async (id: string) =>
  (await api.patch<{ confirmedCount: number }>(`/api/submissions/${id}/confirm-all`)).data;

/** Confirms the selected submissions (only pending ones are confirmed). */
export const confirmSelectedSubmissions = async (ids: string[]) =>
  (await api.post<{ confirmed: number; skipped: number }>('/api/submissions/confirm-selected', { ids })).data;

export const exportSubmissions = (id: string) =>
  api.get<Blob>(`/api/submissions/${id}/export`, { responseType: 'blob' });

export const getPublicSubmissionEvent = async (slug: string, signal: AbortSignal) =>
  (await api.get<SubmissionEvent>(`/api/events/${slug}`, { signal })).data;

export async function createSubmission(input: { eventId: string; fullName: string; matricNumber: string; level?: string }) {
  return (await api.post<{ submission: Submission }>('/api/submissions', input)).data.submission;
}
