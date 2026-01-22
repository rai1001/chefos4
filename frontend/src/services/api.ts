import axios, { AxiosInstance } from 'axios';
import { APP_CONFIG } from '@/config/constants';
import { useAuthStore } from '@/stores/authStore';

class ApiService {
    private axiosInstance: AxiosInstance;

    constructor() {
        this.axiosInstance = axios.create({
            baseURL: APP_CONFIG.apiUrl,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Request interceptor: add token
        this.axiosInstance.interceptors.request.use(
            (config) => {
                const token = useAuthStore.getState().token;
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Response interceptor: handle errors
        this.axiosInstance.interceptors.response.use(
            (response) => response,
            (error) => {
                const url = error.config?.url || '';
                const isAuthEndpoint =
                    url.includes('/auth/login') || url.includes('/auth/register');

                if (error.response?.status === 401 && !isAuthEndpoint) {
                    useAuthStore.getState().logout();
                    window.location.href = '/login';
                }
                return Promise.reject(error);
            }
        );
    }

    get instance() {
        return this.axiosInstance;
    }
}

export const api = new ApiService().instance;
