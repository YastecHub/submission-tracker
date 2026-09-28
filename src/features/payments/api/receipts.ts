import api from '../../../api/axios';
import type { PaymentEvent, PaymentReceipt } from '../../../types';
import { type DisplayPaymentReceipt, PICNIC_LEGACY_EVENT_ID, PICNIC_LEGACY_EVENT_TITLE } from '../model/picnic';
import { studentAuthHeader } from '../../student-auth/api/studentAuth';

export interface ReceiptsResponse {
  receipts: PaymentReceipt[];
  total: number;
  confirmedTotal: number;
  rejectedTotal: number;
  pendingTotal: number;
  claimedTotal: number;
  page: number;
  totalPages: number;
}

export async function listReceipts(eventId: string, params: { page: number; limit: number; search?: string; status?: string }, signal?: AbortSignal) {
  return (await api.get<ReceiptsResponse>(`/api/payment-receipts/${eventId}`, { params, signal })).data;
}

/** Legacy combined exports need all rows. Keep requests sequential and cancellable. */
export async function listLegacyReceipts(eventId: string, title: string | undefined, signal: AbortSignal, status?: string): Promise<DisplayPaymentReceipt[]> {
  const first = await listReceipts(eventId, { page: 1, limit: 100, status }, signal);
  const rows = [...first.receipts];
  for (let page = 2; page <= first.totalPages; page++) {
    rows.push(...(await listReceipts(eventId, { page, limit: 100, status }, signal)).receipts);
  }
  return rows.map((receipt) => ({ ...receipt, sourceEventId: eventId,
    sourceEventTitle: eventId === PICNIC_LEGACY_EVENT_ID ? PICNIC_LEGACY_EVENT_TITLE : title }));
}

export const getPublicPaymentEvent = async (slug: string, signal: AbortSignal) =>
  (await api.get<PaymentEvent>(`/api/payment-events/slug/${slug}`, { signal })).data;

export async function createPaymentReceipt(input: {
  eventId: string; level?: string; receipt: File; studentToken: string;
}) {
  const form = new FormData();
  form.append('eventId', input.eventId);
  if (input.level) form.append('level', input.level);
  form.append('receipt', input.receipt);
  return (await api.post<{ receipt: PaymentReceipt }>('/api/payment-receipts', form, { headers: studentAuthHeader(input.studentToken) })).data.receipt;
}

export function getPaymentReceiptStatus<T>(id: string, studentToken: string, signal?: AbortSignal) {
  return api.get<T>(`/api/payment-receipts/status/${id}`, { signal, headers: studentAuthHeader(studentToken) });
}

export function getStudentTickets<T>(studentToken: string, signal?: AbortSignal) {
  return api.get<T>('/api/payment-receipts/my-tickets', { signal, headers: studentAuthHeader(studentToken) });
}
