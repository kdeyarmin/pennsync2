const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map() } : window;
const storage = windowObj.localStorage;

const toSnakeCase = (str) => {
	return str.replace(/([A-Z])/g, '_$1').toLowerCase();
};

const sanitizeValue = (value) => {
	if (typeof value !== 'string') {
		return value;
	}
	const trimmed = value.trim();
	return trimmed.length ? trimmed : undefined;
};

const sanitizeServerUrl = (value) => {
	const sanitized = sanitizeValue(value);
	if (!sanitized) {
		return undefined;
	}

	try {
		const url = new URL(sanitized);
		return url.origin;
	} catch {
		console.warn(`[app-params] Ignoring invalid server URL: ${sanitized}`);
		return undefined;
	}
};

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false, sanitize = sanitizeValue } = {}) => {
	if (isNode) {
		return sanitize(defaultValue);
	}
	const storageKey = `base44_${toSnakeCase(paramName)}`;
	const urlParams = new URLSearchParams(window.location.search);
	const searchParam = sanitize(urlParams.get(paramName));
	if (removeFromUrl) {
		urlParams.delete(paramName);
		const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ''}${window.location.hash}`;
		window.history.replaceState({}, document.title, newUrl);
	}
	if (searchParam) {
		storage.setItem(storageKey, searchParam);
		return searchParam;
	}
	const storedValue = sanitize(storage.getItem(storageKey));
	if (storedValue) {
		return storedValue;
	}
	const sanitizedDefault = sanitize(defaultValue);
	if (sanitizedDefault !== undefined) {
		storage.setItem(storageKey, sanitizedDefault);
		return sanitizedDefault;
	}
	return null;
};

const getAppParams = () => {
	const currentUrl = isNode ? undefined : window.location.href;
	if (getAppParamValue('clear_access_token') === 'true') {
		storage.removeItem('base44_access_token');
		storage.removeItem('token');
	}

	const appId = getAppParamValue('app_id', { defaultValue: import.meta.env.VITE_BASE44_APP_ID });
	const serverUrl = getAppParamValue('server_url', {
		defaultValue: import.meta.env.VITE_BASE44_BACKEND_URL,
		sanitize: sanitizeServerUrl
	});

	if (!appId || !serverUrl) {
		console.warn('[app-params] Missing Base44 app configuration. Set VITE_BASE44_APP_ID and VITE_BASE44_BACKEND_URL.');
	}

	return {
		appId,
		serverUrl,
		token: getAppParamValue('access_token', { removeFromUrl: true }),
		fromUrl: getAppParamValue('from_url', { defaultValue: currentUrl }),
		functionsVersion: getAppParamValue('functions_version')
	};
};

export const appParams = {
	...getAppParams()
};
