import api from '../../../api/axios';
import { studentAuthHeader } from '../../student-auth/api/studentAuth';
import type {
  AdminAnnouncement,
  AdminAnnouncementListResponse,
  AnnouncementAnalyticsResponse,
  AnnouncementMediaMutationResponse,
  AnnouncementOutstandingStudentsResponse,
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

export async function uploadAnnouncementMedia(id: string, form: FormData) {
  return (await api.post<AnnouncementMediaMutationResponse>(`/api/bulletin/admin/${id}/media`, form)).data;
}

export async function updateAnnouncementMedia(
  id: string,
  input: {
    expectedVersion: number;
    changeNote?: string;
    items: Array<{ id: string; altText: string; caption: string; sectionId: string | null }>;
  },
) {
  return (await api.patch<AnnouncementMediaMutationResponse>(`/api/bulletin/admin/${id}/media`, input)).data;
}

export async function deleteAnnouncementMedia(
  id: string,
  mediaId: string,
  expectedVersion: number,
  changeNote?: string,
) {
  return (await api.delete<AnnouncementMediaMutationResponse>(`/api/bulletin/admin/${id}/media/${mediaId}`, {
    data: { expectedVersion, changeNote },
  })).data;
}

export async function getStudentPushConfig(studentToken: string) {
  return (await api.get<{ configured: boolean; publicKey: string | null }>('/api/bulletin/push/config', {
    headers: studentAuthHeader(studentToken),
  })).data;
}

export async function getStudentPushSubscriptionStatus(endpoint: string, studentToken: string) {
  return (await api.post<{ subscribed: boolean }>('/api/bulletin/push/subscriptions/status', { endpoint }, {
    headers: studentAuthHeader(studentToken),
  })).data;
}

export async function saveStudentPushSubscription(subscription: PushSubscriptionJSON, studentToken: string) {
  return (await api.post<{ subscribed: true }>('/api/bulletin/push/subscriptions', { subscription }, {
    headers: studentAuthHeader(studentToken),
  })).data;
}

export async function deleteStudentPushSubscription(endpoint: string, studentToken: string) {
  return (await api.delete<{ subscribed: false }>('/api/bulletin/push/subscriptions', {
    headers: studentAuthHeader(studentToken),
    data: { endpoint },
  })).data;
}

export async function acknowledgeBulletinArticle(id: string, studentToken: string) {
  return (await api.post<{ id: string; version: number; acknowledged: true }>(
    `/api/bulletin/feed/${id}/acknowledge`,
    {},
    { headers: studentAuthHeader(studentToken) },
  )).data;
}

export async function getAnnouncementAnalytics(id: string, signal?: AbortSignal) {
  return (await api.get<AnnouncementAnalyticsResponse>(`/api/bulletin/admin/${id}/analytics`, { signal })).data;
}

export async function getAnnouncementOutstandingStudents(
  id: string,
  query: { page?: number; limit?: number; search?: string },
  signal?: AbortSignal,
) {
  return (await api.get<AnnouncementOutstandingStudentsResponse>(`/api/bulletin/admin/${id}/outstanding`, {
    params: query,
    signal,
  })).data;
}
