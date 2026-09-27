export const config = {
    apiBaseUrl:
        window.__ENV__?.API_BASE_URL ??
        'http://localhost:5006/api',
} as const;