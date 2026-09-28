import { useCallback } from 'react';
import { useRemoteData } from '../../../hooks/useRemoteData';
import { listBulletinFeed, type FeedQuery } from '../api/bulletin';

export function useBulletinFeed(query: FeedQuery, token: string | null) {
  const { page, limit, search, category, priority } = query;
  const load = useCallback(
    (signal: AbortSignal) => listBulletinFeed({ page, limit, search, category, priority }, token!, signal),
    [page, limit, search, category, priority, token],
  );
  return useRemoteData(load, 0, Boolean(token));
}
