import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      refetchInterval: false,
      retry: (failureCount, error) => {
        const status = error?.status || error?.response?.status;
        if ([400, 401, 403, 404, 422].includes(Number(status))) return false;
        return failureCount < 1;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
