import { useCallback, useState } from 'react';
import { useToast } from '../../../context/ToastContext';
import { errorMessage } from '../model/election';

/** Runs one staff action at a time, with a toast for the outcome. */
export function useAction() {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const run = useCallback(async <T,>(name: string, work: () => Promise<T>, success?: string): Promise<T | undefined> => {
    setBusy(name);
    try {
      const result = await work();
      if (success) toast(success, 'success');
      return result;
    } catch (error) {
      toast(errorMessage(error), 'error');
      return undefined;
    } finally {
      setBusy(null);
    }
  }, [toast]);
  return { busy, run };
}
