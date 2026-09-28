import { useCallback, useEffect, useState } from 'react';
import { useRemoteData } from '../../../hooks/useRemoteData';
import { getSubmissionEvent, listSubmissions } from '../api/submissions';

export function useSubmissionDetail(id: string) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState({ page: 1, search: '' });
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = search.trim();
      setQuery({ page: 1, search: trimmed.length >= 2 ? trimmed : '' });
    }, 400);
    return () => clearTimeout(timer);
  }, [search, id]);

  const loadEvent = useCallback((signal: AbortSignal) => getSubmissionEvent(id, signal), [id]);
  const loadPage = useCallback((signal: AbortSignal) => listSubmissions(id, query.page, query.search, signal), [id, query]);
  const eventState = useRemoteData(loadEvent);
  const pageState = useRemoteData(loadPage, 30_000);
  useEffect(() => {
    if (pageState.data && !pageState.loading && query.page > Math.max(1, pageState.data.totalPages)) {
      setQuery((previous) => ({ ...previous, page: Math.max(1, pageState.data!.totalPages) }));
    }
  }, [pageState.data, pageState.loading, query.page]);
  const setCurrentPage = (update: number | ((page: number) => number)) =>
    setQuery((previous) => ({ ...previous, page: typeof update === 'function' ? update(previous.page) : update }));

  const refresh = useCallback(() => pageState.refresh(true), [pageState.refresh]);
  return {
    event: eventState.data,
    submissions: pageState.data?.submissions ?? [],
    submissionStats: {
      total: pageState.data?.total ?? 0,
      confirmed: pageState.data?.confirmedTotal ?? 0,
      pending: pageState.data?.pendingTotal ?? 0,
      totalPages: Math.max(1, pageState.data?.totalPages ?? 1),
    },
    loading: eventState.loading,
    tableLoading: pageState.loading,
    error: eventState.error || pageState.error,
    retry: () => Promise.all([eventState.refresh(), pageState.refresh()]),
    refresh, search, setSearch, currentPage: query.page, setCurrentPage,
  };
}
