import api from '../../../api/axios';
import type { PaymentEvent } from '../../../types';

export async function listPaymentEvents(signal: AbortSignal) {
  return (await api.get<{ events: PaymentEvent[] }>('/api/payment-events', { signal })).data.events;
}

export const createPaymentEvent = async (input: object) =>
  (await api.post<PaymentEvent>('/api/payment-events', input)).data;

export const extendPaymentEvent = async (id: string, deadline: string) =>
  (await api.patch<{ deadline: string; isClosed: boolean }>(`/api/payment-events/${id}/extend`, { deadline })).data;

export const togglePaymentEvent = async (id: string) =>
  (await api.patch<{ isClosed: boolean }>(`/api/payment-events/${id}/close`)).data;

export const deletePaymentEvent = (id: string) => api.delete(`/api/payment-events/${id}`);
