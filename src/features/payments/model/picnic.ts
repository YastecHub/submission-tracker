import type { PaymentReceipt } from '../../../types';

export type DisplayPaymentReceipt = PaymentReceipt & {
  sourceEventTitle?: string;
  sourceEventId?: string;
  sourceEventIds?: string[];
};

// Existing legacy reconciliation contract; do not generalize to other events.
export const PICNIC_PAYMENT_EVENT_ID = 'cafd3826-985d-42d5-96bd-7c0cfd0b623d';
export const PICNIC_LEGACY_EVENT_ID = '7d4b6050-9681-4917-989c-82ae015b755e';
export const PICNIC_LEGACY_EVENT_TITLE = 'Picnic & Class dues';
export const PICNIC_EXPORT_AMOUNT = '4000';

export function isPicnicPaymentEvent(eventId: string | undefined): boolean {
  return eventId === PICNIC_PAYMENT_EVENT_ID;
}

function getPaidAt(receipt: DisplayPaymentReceipt): number {
  return new Date(receipt.confirmedAt ?? receipt.submittedAt).getTime();
}

function statusPriority(receipt: DisplayPaymentReceipt): number {
  if (receipt.status === 'confirmed') return 3;
  if (receipt.status === 'pending') return 2;
  return 1;
}

export function dedupePicnicReceipts(receipts: DisplayPaymentReceipt[]): DisplayPaymentReceipt[] {
  const byMatric = new Map<string, DisplayPaymentReceipt>();
  for (const receipt of receipts) {
    const key = receipt.matricNumber.trim().toUpperCase();
    const existing = byMatric.get(key);
    if (!existing) {
      byMatric.set(key, receipt);
      continue;
    }
    const preferred = statusPriority(receipt) === statusPriority(existing)
      ? (getPaidAt(receipt) < getPaidAt(existing) ? receipt : existing)
      : (statusPriority(receipt) > statusPriority(existing) ? receipt : existing);
    const sources = [existing.sourceEventTitle, receipt.sourceEventTitle].filter(Boolean);
    const sourceEventIds = [
      ...(existing.sourceEventIds ?? (existing.sourceEventId ? [existing.sourceEventId] : [])),
      ...(receipt.sourceEventIds ?? (receipt.sourceEventId ? [receipt.sourceEventId] : [])),
    ];
    byMatric.set(key, {
      ...preferred,
      sourceEventTitle: Array.from(new Set(sources)).join(' + ') || undefined,
      sourceEventIds: Array.from(new Set(sourceEventIds)),
      isClaimed: Boolean(existing.isClaimed || receipt.isClaimed),
      claimedAt: existing.claimedAt ?? receipt.claimedAt,
      claimedBy: existing.claimedBy ?? receipt.claimedBy,
    });
  }
  return Array.from(byMatric.values()).sort((a, b) => getPaidAt(a) - getPaidAt(b));
}
