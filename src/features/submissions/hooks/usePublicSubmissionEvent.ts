import { useCallback } from 'react';
import { useRemoteData } from '../../../hooks/useRemoteData';
import { getPublicSubmissionEvent } from '../api/submissions';

export function usePublicSubmissionEvent(slug: string) {
  const load = useCallback((signal: AbortSignal) => getPublicSubmissionEvent(slug, signal), [slug]);
  return useRemoteData(load);
}
