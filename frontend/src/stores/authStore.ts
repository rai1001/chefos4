import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/config/constants';

interface User {
    id: string;
    email: string;
    name: string;
}

interface AuthStore {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    setAuth: (user: User, token: string) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,

            setAuth: (user, token) =>
                set({
                    user,
                    token,
                    isAuthenticated: true,
                }),

            logout: () =>
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                }),
        }),
        {
            name: STORAGE_KEYS.AUTH_TOKEN,
            storage: createJSONStorage(() =>
                import.meta.env.VITE_E2E === 'true' ? sessionStorage : localStorage
            ),
            partialize: (state) => ({
                user: state.user,
                token: state.token,
            }),
            onRehydrateStorage: () => (state) => {
                if (!state) return;
                const hasToken = Boolean(state.token);
                state.isAuthenticated = hasToken;
                if (!hasToken) {
                    state.user = null;
                }
            },
        }
    )
);
