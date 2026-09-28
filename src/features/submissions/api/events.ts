import api from '../../../api/axios';
import type { SubmissionEvent } from '../../../types';

export const listSubmissionEvents = async (signal: AbortSignal) =>
  (await api.get<{ events: SubmissionEvent[] }>('/api/events', { signal })).data.events;

export const createSubmissionEvent = async (input: object) =>
  (await api.post<SubmissionEvent>('/api/events', input)).data;

export const extendSubmissionEvent = async (id: string, deadline: string) =>
  (await api.patch<{ deadline: string; isClosed: boolean }>(`/api/events/${id}/extend`, { deadline })).data;

export const toggleSubmissionEvent = async (id: string) =>
  (await api.patch<{ isClosed: boolean }>(`/api/events/${id}/close`)).data;

export const deleteSubmissionEvent = (id: string) => api.delete(`/api/events/${id}`);
