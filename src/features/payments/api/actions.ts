import api from '../../../api/axios';
import type { PaymentReceipt } from '../../../types';

export function reviewReceipt(id: string, action: 'confirm' | 'reject', note: string) {
  return api.patch<PaymentReceipt>(`/api/payment-receipts/${id}/${action}`, { note: note.trim() || undefined });
}

/** Confirms several receipts at once (only pending ones are confirmed). */
export async function confirmSelectedReceipts(ids: string[]) {
  return (await api.post<{ confirmed: number; skipped: number; failed: number }>('/api/payment-receipts/confirm-selected', { ids }, { timeout: 120_000 })).data;
}

export async function claimTicket(code: string) {
  return (await api.post<{
    alreadyClaimed: boolean;
    receipt: { fullName: string; matricNumber: string; claimedBy: string | null; claimedAt: string | null };
  }>('/api/payment-receipts/scan', { code })).data;
}
