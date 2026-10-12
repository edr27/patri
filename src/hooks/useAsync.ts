import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface UseAsyncOptions {
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useAsync<T>(
  asyncFn: (...args: unknown[]) => Promise<T>,
  options?: UseAsyncOptions
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (...args: unknown[]) => {
    setLoading(true);
    setError(null);
    try {
      const result = await asyncFn(...args);
      if (options?.successMessage) {
        toast.success(options.successMessage);
      }
      options?.onSuccess?.();
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      toast.error(options?.errorMessage || error.message || 'Erro inesperado');
      options?.onError?.(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [asyncFn, options]);

  return { execute, loading, error };
}
