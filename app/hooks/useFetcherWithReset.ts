import { useFetcher } from '@remix-run/react';
import { useCallback, useEffect, useState } from 'react';

export default function useFetcherWithReset<T>() {
  const fetcher = useFetcher<T>();
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    if (fetcher.state === 'idle') {
      setData(fetcher.data as T);
    }
  }, [fetcher.state, fetcher.data]);

  const reset = useCallback(() => {
    setData(null);
  }, []);

  return {
    ...fetcher,
    data,
    reset,
  };
}
