'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

// Helper para obtener la URL de la API (misma lógica que apiService)
const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    // Si estamos en el navegador, usar el mismo hostname pero con el puerto 4000
    return `${window.location.protocol}//${window.location.hostname}:4000/api`;
  }
  return 'http://localhost:4000/api';
};

// Tipos
export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  subscriptionTier: 'BASIC' | 'PRO' | 'PREMIUM';
  isActive: boolean;
}

interface AuthContextType {
  // Estado
  user: AppUser | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  supabaseConfigured: boolean;
  
  // Acciones
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  
  // Helpers
  isAdmin: boolean;
  isPremium: boolean;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [localToken, setLocalToken] = useState<string | null>(null);

  // Verificar si Supabase est? configurado
  const supabaseConfigured = !!supabase;

  // Obtener datos del usuario desde nuestro backend
  const fetchUserProfile = useCallback(async (accessToken: string) => {
    try {
      const apiUrl = getApiUrl();
      console.log('[AuthContext] Fetching profile from:', apiUrl);
      const response = await fetch(`${apiUrl}/auth/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log('[AuthContext] Profile response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[AuthContext] Profile data:', data);
        if (data.authenticated && data.user) {
          setUser(data.user);
          return data.user;
        }
      } else {
        console.error('[AuthContext] Profile fetch failed:', response.status, await response.text());
      }
      return null;
    } catch (error) {
      console.error('[AuthContext] Error fetching user profile:', error);
      return null;
    }
  }, []);

  // Inicializar sesi?n
  useEffect(() => {
    const initSession = async () => {
      try {
        // Primero verificar si hay un token local (login sin Supabase)
        if (typeof window !== 'undefined') {
          const storedToken = localStorage.getItem('access_token');
          if (storedToken) {
            console.log('[AuthContext] Found local token, fetching profile...');
            setLocalToken(storedToken);
            const userProfile = await fetchUserProfile(storedToken);
            
            // Si no se pudo cargar el perfil, el token puede ser inv?lido
            if (!userProfile) {
              console.warn('[AuthContext] Could not load user profile, token may be invalid');
              // No limpiamos el token aqu?, dejamos que el usuario intente de nuevo
            }
            setIsLoading(false);
            return;
          }
        }

        // Si Supabase est? configurado, intentar obtener sesi?n
        if (supabase) {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          
          if (currentSession) {
            setSession(currentSession);
            setSupabaseUser(currentSession.user);
            await fetchUserProfile(currentSession.access_token);
          }
        }
      } catch (error) {
        console.error('Error initializing session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initSession();

    // Listener para cambios de sesi?n (solo si Supabase est? configurado)
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          console.log('Auth state change:', event);
          
          setSession(newSession);
          setSupabaseUser(newSession?.user ?? null);
          
          if (newSession) {
            await fetchUserProfile(newSession.access_token);
          } else {
            setUser(null);
          }
          
          setIsLoading(false);
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [fetchUserProfile]);

  // Sign In
  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      if (!supabase) {
        return { error: 'Supabase no est? configurado. Usa el login de admin.' };
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      if (data.session) {
        setSession(data.session);
        setSupabaseUser(data.user);
        await fetchUserProfile(data.session.access_token);
      }

      return {};
    } catch (error: any) {
      return { error: error.message || 'Error al iniciar sesi?n' };
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Up
  const signUp = async (email: string, password: string, name: string) => {
    try {
      setIsLoading(true);
      
      if (!supabase) {
        return { error: 'Supabase no est? configurado. Contacta al administrador.' };
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            full_name: name,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      // Si requiere confirmaci?n de email
      if (!data.session) {
        return { error: 'Por favor verifica tu email para completar el registro' };
      }

      if (data.session) {
        setSession(data.session);
        setSupabaseUser(data.user);
        await fetchUserProfile(data.session.access_token);
      }

      return {};
    } catch (error: any) {
      return { error: error.message || 'Error al registrarse' };
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Out
  const signOut = async () => {
    try {
      // Limpiar token local
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
      }
      setLocalToken(null);
      
      // Sign out de Supabase si est? configurado
      if (supabase) {
        await supabase.auth.signOut();
      }
      
      setUser(null);
      setSession(null);
      setSupabaseUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    // Primero intentar el token de localStorage (puede ser más reciente)
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const token = storedToken || session?.access_token || localToken;
    
    if (token) {
      console.log('[AuthContext] refreshUser called, fetching profile...');
      // Actualizar el localToken si viene de localStorage
      if (storedToken && storedToken !== localToken) {
        setLocalToken(storedToken);
      }
      await fetchUserProfile(token);
    } else {
      console.log('[AuthContext] refreshUser: no token available');
    }
  };

  // Get access token for API calls
  const getAccessToken = async () => {
    // Primero verificar token local
    if (localToken) {
      return localToken;
    }
    
    // Luego intentar Supabase
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    }
    
    return null;
  };

  // isAuthenticated es true si tenemos un usuario O si tenemos un token local (a?n cargando usuario)
  const hasLocalToken = typeof window !== 'undefined' && !!localStorage.getItem('access_token');
  const isAuthenticatedValue = !!user || (hasLocalToken && !!localToken);
  
  const value: AuthContextType = {
    user,
    supabaseUser,
    session,
    isLoading,
    isAuthenticated: isAuthenticatedValue,
    supabaseConfigured,
    signIn,
    signUp,
    signOut,
    refreshUser,
    isAdmin: user?.role === 'ADMIN',
    isPremium: user?.subscriptionTier === 'PREMIUM',
    getAccessToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
