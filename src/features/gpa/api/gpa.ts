import api from '../../../api/axios';
import { studentAuthHeader } from '../../student-auth/api/studentAuth';
import type { CatalogCourse, GpaRecordDto, GpaSemesterDto, ImportResult } from '../model/types';
import { toPayloadCourses } from '../model/drafts';
import type { GpaCourse } from '../model/types';

export async function getGpaRecord(token: string, signal?: AbortSignal) {
  return (await api.get<GpaRecordDto>('/api/gpa', { signal, headers: studentAuthHeader(token) })).data;
}

export async function getCourseCatalog(token: string, signal?: AbortSignal) {
  return (await api.get<{ courses: CatalogCourse[] }>('/api/gpa/catalog', { signal, headers: studentAuthHeader(token) })).data.courses;
}

export async function createGpaSemester(token: string, input: {
  id: string; level: number; semester: number; sessionLabel: string | null; courses: GpaCourse[];
}) {
  return (await api.post<GpaSemesterDto>('/api/gpa/semesters', {
    ...input,
    courses: toPayloadCourses(input.courses),
  }, { headers: studentAuthHeader(token) })).data;
}

export async function updateGpaSemester(token: string, id: string, input: {
  expectedVersion: number; sessionLabel: string | null; courses: GpaCourse[];
}) {
  return (await api.put<GpaSemesterDto>(`/api/gpa/semesters/${id}`, {
    ...input,
    courses: toPayloadCourses(input.courses),
  }, { headers: studentAuthHeader(token) })).data;
}

export async function finalizeGpaSemester(token: string, id: string, expectedVersion: number) {
  return (await api.post<GpaSemesterDto>(`/api/gpa/semesters/${id}/finalize`, { expectedVersion }, { headers: studentAuthHeader(token) })).data;
}

export async function unlockGpaSemester(token: string, id: string, expectedVersion: number) {
  return (await api.post<GpaSemesterDto>(`/api/gpa/semesters/${id}/unlock`, { expectedVersion }, { headers: studentAuthHeader(token) })).data;
}

export async function deleteGpaSemester(token: string, id: string) {
  await api.delete(`/api/gpa/semesters/${id}`, { headers: studentAuthHeader(token) });
}

export async function importGpaCsv(token: string, input: { csv: string; dryRun: boolean; finalize: boolean }) {
  return (await api.post<ImportResult>('/api/gpa/import', input, { headers: studentAuthHeader(token) })).data;
}
