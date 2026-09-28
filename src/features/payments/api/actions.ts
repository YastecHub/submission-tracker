import api from '../../../api/axios';
import type { PaymentReceipt } from '../../../types';

export function reviewReceipt(id: string, action: 'confirm' | 'reject', note: string) {
  return api.patch<PaymentReceipt>(`/api/payment-receipts/${id}/${action}`, { note: note.trim() || undefined });
}

export async function claimTicket(code: string) {
  return (await api.post<{
    alreadyClaimed: boolean;
    receipt: { fullName: string; matricNumber: string; claimedBy: string | null; claimedAt: string | null };
  }>('/api/payment-receipts/scan', { code })).data;
}
