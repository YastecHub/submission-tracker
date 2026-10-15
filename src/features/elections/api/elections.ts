import api from '../../../api/axios';
import { studentAuthHeader } from '../../student-auth/api/studentAuth';
import type {
  AdminElection, AdminElectionSummary, AuditEntry, BallotChoice, ElectionResults, Registration, StudentElection,
} from '../model/types';

// ---- Students --------------------------------------------------------------

export async function listStudentElections(token: string, signal?: AbortSignal) {
  return (await api.get<StudentElection[]>('/api/elections', { signal, headers: studentAuthHeader(token) })).data;
}

export async function getStudentElection(token: string, id: string, signal?: AbortSignal) {
  return (await api.get<StudentElection>(`/api/elections/${id}`, { signal, headers: studentAuthHeader(token) })).data;
}

export async function castBallot(token: string, id: string, body: { requestId: string; receiptCode: string; choices: BallotChoice[] }) {
  return (await api.post<{ recorded: boolean; repeated: boolean; votedAt: string }>(`/api/elections/${id}/ballot`, body, {
    headers: studentAuthHeader(token),
    timeout: 25_000,
  })).data;
}

export async function getStudentResults(token: string, id: string, signal?: AbortSignal) {
  return (await api.get<ElectionResults>(`/api/elections/${id}/results`, { signal, headers: studentAuthHeader(token) })).data;
}

export async function checkReceipt(token: string, id: string, receiptCode: string) {
  return (await api.post<{ counted: boolean }>(`/api/elections/${id}/receipt`, { receiptCode }, { headers: studentAuthHeader(token) })).data;
}

// ---- Developer + electoral committee ------------------------------------------

const base = '/api/election-admin';

export async function listAdminElections(signal?: AbortSignal) {
  return (await api.get<AdminElectionSummary[]>(base, { signal })).data;
}

export async function getAdminElection(id: string, signal?: AbortSignal) {
  return (await api.get<AdminElection>(`${base}/${id}`, { signal })).data;
}

export async function createElection(body: Record<string, unknown>) {
  return (await api.post<AdminElection>(base, body)).data;
}

export async function updateElection(id: string, body: Record<string, unknown>) {
  return (await api.patch<AdminElection>(`${base}/${id}`, body)).data;
}

export async function deleteElection(id: string): Promise<true> {
  await api.delete(`${base}/${id}`);
  return true;
}

export async function addPosition(id: string, title: string) {
  return (await api.post<AdminElection>(`${base}/${id}/positions`, { title })).data;
}

export async function updatePosition(id: string, positionId: string, body: { title?: string; move?: 'up' | 'down' }) {
  return (await api.patch<AdminElection>(`${base}/${id}/positions/${positionId}`, body)).data;
}

export async function removePosition(id: string, positionId: string) {
  return (await api.delete<AdminElection>(`${base}/${id}/positions/${positionId}`)).data;
}

function candidateForm(fields: Record<string, string | undefined>, photo: File | null, removePhoto = false) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) if (value !== undefined) form.append(key, value);
  if (photo) form.append('photo', photo);
  if (removePhoto) form.append('removePhoto', 'true');
  return form;
}

export async function addCandidate(id: string, fields: Record<string, string | undefined>, photo: File | null) {
  return (await api.post<AdminElection>(`${base}/${id}/candidates`, candidateForm(fields, photo), { headers: { 'Content-Type': 'multipart/form-data' } })).data;
}

export async function updateCandidate(id: string, candidateId: string, fields: Record<string, string | undefined>, photo: File | null, removePhoto = false) {
  return (await api.patch<AdminElection>(`${base}/${id}/candidates/${candidateId}`, candidateForm(fields, photo, removePhoto), { headers: { 'Content-Type': 'multipart/form-data' } })).data;
}

export async function removeCandidate(id: string, candidateId: string) {
  return (await api.delete<AdminElection>(`${base}/${id}/candidates/${candidateId}`)).data;
}

export async function getRegistrations(id: string, signal?: AbortSignal) {
  return (await api.get<Registration[]>(`${base}/${id}/registrations`, { signal })).data;
}

export async function setSuspension(id: string, studentId: string, suspend: boolean, reason?: string) {
  return (await api.post<{ ok: boolean }>(`${base}/${id}/students/${studentId}/suspension`, { suspend, reason })).data;
}

export type ElectionCommand = 'ready' | 'draft' | 'open' | 'pause' | 'resume' | 'close';

export async function runCommand(id: string, command: ElectionCommand) {
  return (await api.post<AdminElection>(`${base}/${id}/${command}`)).data;
}

export async function extendElection(id: string, closesAt: string) {
  return (await api.post<AdminElection>(`${base}/${id}/extend`, { closesAt })).data;
}

export async function approvePublish(id: string) {
  return (await api.post<{ published: boolean; decision: string; detail: AdminElection }>(`${base}/${id}/publish`)).data;
}

export async function getAdminResults(id: string, signal?: AbortSignal) {
  return (await api.get<ElectionResults>(`${base}/${id}/results`, { signal })).data;
}

export async function getAuditLog(id: string, signal?: AbortSignal) {
  return (await api.get<AuditEntry[]>(`${base}/${id}/audit`, { signal })).data;
}

export async function getTurnoutTimeline(id: string, signal?: AbortSignal) {
  return (await api.get<Array<{ at: string; count: number }>>(`${base}/${id}/timeline`, { signal })).data;
}

export async function listCommittee(signal?: AbortSignal) {
  return (await api.get<Array<{ id: string; name: string; email: string; createdAt: string }>>(`${base}/committee`, { signal })).data;
}

export async function createCommitteeMember(body: { name: string; email: string; password: string }) {
  return (await api.post('/api/auth/users', { ...body, role: 'electoral_committee' })).data;
}
