import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			staleTime: 60000,       // 1 min global default — prevents redundant refetches on remount
			gcTime: 300000,         // 5 min garbage collection
		},
	},
});