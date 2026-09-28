import { useCallback } from 'react';
import { fetchAdminTransactions, type AdminLedgerQuery } from '../../../api/transactions';
import { useRemoteData } from '../../../hooks/useRemoteData';

export function useAdminLedger({ page, limit, type, search, includeDeleted }: AdminLedgerQuery) {
  const load = useCallback((signal: AbortSignal) => fetchAdminTransactions({ page, limit, type, search, includeDeleted }, signal),
    [page, limit, type, search, includeDeleted]);
  return useRemoteData(load);
}
