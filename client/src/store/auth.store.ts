import { create } from 'zustand';
import { AUTH_API_URL } from '../config/api';

interface User {
    id: number;
    nombre: string;
    nombreCompleto?: string;
    email: string;
    rol: string;
    zona: string | null;
    sedeId: number | null;
    sedeNombre?: string | null;
    sedeCodigo?: string | null;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: !!localStorage.getItem('token'),
    isLoading: false,
    error: null,

    login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
            const response = await fetch(`${AUTH_API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al iniciar sesión');
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            set({
                user: data.user,
                token: data.token,
                isAuthenticated: true,
                isLoading: false
            });
        } catch (err: any) {
            set({
                error: err.message,
                isLoading: false,
                isAuthenticated: false
            });
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, token: null, isAuthenticated: false });
    },

    checkAuth: () => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        if (token && userStr) {
            set({ token, user: JSON.parse(userStr), isAuthenticated: true });
        } else {
            set({ token: null, user: null, isAuthenticated: false });
        }
    }
}));
