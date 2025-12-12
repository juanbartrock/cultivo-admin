
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authService, User } from '@/services/authService';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (token: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    login: () => { },
    logout: () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            const isPublicRoute = pathname === '/login';

            if (!token) {
                if (!isPublicRoute) {
                    router.push('/login');
                }
                setIsLoading(false);
                return;
            }

            // Si ya tenemos usuario, no necesitamos volver a cargarlo
            // a menos que queramos revalidar en cada navegación (opcional)
            if (user) {
                setIsLoading(false);
                return;
            }

            try {
                const profile = await authService.getProfile();
                setUser(profile);
            } catch (error) {
                console.error('Auth check failed:', error);
                localStorage.removeItem('token');
                setUser(null);
                router.push('/login');
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, [pathname]); // Ejecutar cuando cambia la ruta

    const login = (token: string) => {
        localStorage.setItem('token', token);
        // Fetch profile immediately or reload?
        // For simplicity, let's fetch profile
        authService.getProfile().then(profile => {
            setUser(profile);
            router.push('/');
        }).catch(console.error);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
