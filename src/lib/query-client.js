import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			// Don't retry auth/permission/not-found errors — retrying a 401 just
			// fires another failed PHI request and slows the logout redirect.
			retry: (failureCount, error) => {
				const status = error?.response?.status ?? error?.status;
				if (status === 401 || status === 403 || status === 404) return false;
				return failureCount < 1;
			},
			staleTime: 60000,       // 1 min global default — prevents redundant refetches on remount
			gcTime: 300000,         // 5 min garbage collection
			// Treat `initialData` as already stale. The app pervasively uses
			// `initialData: []` purely as an empty-render placeholder (e.g. patient
			// dropdowns). Without this, `initialData` is seeded as "fresh" and the
			// non-zero `staleTime` above suppresses the fetch-on-mount entirely, so
			// those lists/dropdowns stay permanently empty. Marking initialData's
			// timestamp as epoch (0) forces an immediate background fetch on mount
			// while still letting `staleTime` dedupe refetches once real data lands.
			initialDataUpdatedAt: 0,
		},
	},
});