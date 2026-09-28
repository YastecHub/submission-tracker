import { useCallback } from 'react';
import { useRemoteData } from '../../../hooks/useRemoteData';
import { listLegacyReceipts, listReceipts } from '../api/receipts';
import { dedupePicnicReceipts, PICNIC_LEGACY_EVENT_ID } from '../model/picnic';

export function useReceiptList(id: string, combined: boolean, page: number, search: string, status: string) {
  // Combined mode filters locally, so a page/filter change must not refetch all rows.
  const remotePage = combined ? 1 : page;
  const remoteSearch = combined ? '' : search;
  const remoteStatus = combined ? '' : status;
  const load = useCallback(async (signal: AbortSignal) => {
    if (!combined) return listReceipts(id, { page: remotePage, limit: 50, search: remoteSearch || undefined, status: remoteStatus || undefined }, signal);
    const current = await listLegacyReceipts(id, undefined, signal);
    const legacy = await listLegacyReceipts(PICNIC_LEGACY_EVENT_ID, undefined, signal);
    const receipts = dedupePicnicReceipts([...current, ...legacy.filter((row) => row.status === 'confirmed')]);
    return { receipts, total: receipts.length,
      confirmedTotal: receipts.filter((row) => row.status === 'confirmed').length,
      rejectedTotal: receipts.filter((row) => row.status === 'rejected').length,
      pendingTotal: receipts.filter((row) => row.status === 'pending').length,
      claimedTotal: receipts.filter((row) => row.isClaimed).length,
      page: 1, totalPages: Math.ceil(receipts.length / 50) };
  }, [id, combined, remotePage, remoteSearch, remoteStatus]);
  return useRemoteData(load, 30_000);
}
