import api from '../../../api/axios';
import { studentAuthHeader } from '../../student-auth/api/studentAuth';
import type {
  AdminAnnouncement,
  AdminAnnouncementListResponse,
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementStatus,
  AnnouncementWriteInput,
  BulletinArticle,
  BulletinAiOrganizationResponse,
  BulletinFeedResponse,
  PaymentOption,
} from '../model/types';

export interface FeedQuery {
  page: number;
  limit: number;
  search?: string;
  category?: AnnouncementCategory;
  priority?: AnnouncementPriority;
}

export async function listBulletinFeed(query: FeedQuery, studentToken: string, signal?: AbortSignal) {
  return (await api.get<BulletinFeedResponse>('/api/bulletin/feed', {
    params: query,
    signal,
    headers: studentAuthHeader(studentToken),
  })).data;
}

export async function getBulletinArticle(slug: string, studentToken: string, signal?: AbortSignal) {
  return (await api.get<BulletinArticle>(`/api/bulletin/feed/${slug}`, {
    signal,
    headers: studentAuthHeader(studentToken),
  })).data;
}

export async function getBulletinUnreadCount(studentToken: string, signal?: AbortSignal) {
  return (await api.get<{ count: number }>('/api/bulletin/feed/unread-count', {
    signal,
    headers: studentAuthHeader(studentToken),
  })).data.count;
}

export async function markBulletinArticleRead(id: string, studentToken: string) {
  return (await api.post<{ id: string; version: number; read: true }>(
    `/api/bulletin/feed/${id}/read`,
    {},
    { headers: studentAuthHeader(studentToken) },
  )).data;
}

export async function listAdminAnnouncements(
  query: { page: number; limit: number; search?: string; status?: AnnouncementStatus; category?: AnnouncementCategory },
  signal?: AbortSignal,
) {
  return (await api.get<AdminAnnouncementListResponse>('/api/bulletin/admin', { params: query, signal })).data;
}

export async function getAdminAnnouncement(id: string, signal?: AbortSignal) {
  return (await api.get<AdminAnnouncement>(`/api/bulletin/admin/${id}`, { signal })).data;
}

export async function createAdminAnnouncement(input: AnnouncementWriteInput) {
  return (await api.post<AdminAnnouncement>('/api/bulletin/admin', input)).data;
}

export async function updateAdminAnnouncement(id: string, input: AnnouncementWriteInput) {
  return (await api.patch<AdminAnnouncement>(`/api/bulletin/admin/${id}`, input)).data;
}

export async function publishAdminAnnouncement(id: string, expectedVersion: number, changeNote?: string) {
  return (await api.post<AdminAnnouncement>(`/api/bulletin/admin/${id}/publish`, { expectedVersion, changeNote })).data;
}

export async function archiveAdminAnnouncement(id: string, expectedVersion: number) {
  return (await api.post<AdminAnnouncement>(`/api/bulletin/admin/${id}/archive`, { expectedVersion })).data;
}

export async function listBulletinPaymentOptions(signal?: AbortSignal) {
  return (await api.get<PaymentOption[]>('/api/bulletin/admin/payment-options', { signal })).data;
}

export async function organizeBulletinSource(input: { rawSource: string; announcementId?: string }) {
  return (await api.post<BulletinAiOrganizationResponse>('/api/bulletin/admin/organize', input)).data;
}
