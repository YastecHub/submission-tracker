import { useCallback } from 'react';
import { useRemoteData } from '../../../hooks/useRemoteData';
import { getPublicPaymentEvent } from '../api/receipts';

export function usePublicPaymentEvent(slug: string) {
  const load = useCallback((signal: AbortSignal) => getPublicPaymentEvent(slug, signal), [slug]);
  return useRemoteData(load);
}
