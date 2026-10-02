import axios from 'axios';
import i18n from '@/i18n';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    config.headers['accept-language'] = i18n.language;

    return config;
});

let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string) => void,
    reject: (err: unknown) => void,
}> = [];

function processQueue(error: unknown, token: string | null) {
    failedQueue.forEach((p) => {
        if (error) {
            p.reject(error);
        } else {
            p.resolve(token!);
        }
    });
    failedQueue = [];
}

api.interceptors.response.use(
    (response) => response,

    async (error) => {
        const originalRequest = error.config;

        const isAuthRoute =
            originalRequest.url?.includes('/auth/login') ||
            originalRequest.url?.includes('/auth/refresh');

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                .then ((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                })
                .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = localStorage.getItem('refreshToken');

            if (!refreshToken) {
                handleLogout();
                return Promise.reject(error);
            }

            try {
                const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
                    refreshToken,
                });

                const newAccessToken = data.accessToken;

                localStorage.setItem('accessToken', newAccessToken);

                api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;

                processQueue(null, newAccessToken);

                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                handleLogout();
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

function handleLogout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
}