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
		},
	},
});