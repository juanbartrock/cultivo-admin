'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Leaf, Mail, Lock, Loader2, AlertCircle, Eye, EyeOff, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isAuthenticated, isLoading: authLoading, supabaseConfigured, refreshUser } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Flag para evitar doble redirección
  const [hasRedirected, setHasRedirected] = useState(false);
  
  // Helper para obtener la URL de la API
  const getApiUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    if (typeof window !== 'undefined') {
      return `${window.location.protocol}//${window.location.hostname}:4000/api`;
    }
    return 'http://localhost:4000/api';
  };
  
  // Login local (sin Supabase)
  const handleLocalLogin = async (username: string, pass: string) => {
    if (hasRedirected) return;
    
    setIsLoading(true);
    setError('');
    try {
      const apiUrl = getApiUrl();
      console.log('[Login] Calling API:', apiUrl);
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: pass }),
      });
      if (response.ok) {
        const data = await response.json();
        console.log('[Login] Success, saving token');
        localStorage.setItem('access_token', data.access_token);
        
        // Importante: cargar el perfil del usuario ANTES de redirigir
        console.log('[Login] Loading user profile...');
        await refreshUser();
        console.log('[Login] Profile loaded, redirecting...');
        
        setHasRedirected(true);
        // Usar replace en lugar de push para evitar volver atrás al login
        router.replace('/');
      } else {
        setError('Credenciales incorrectas');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('[Login] Error:', err);
      setError('Error de conexión con el servidor');
      setIsLoading(false);
    }
  };

  // Redirigir si ya está autenticado (solo una vez)
  useEffect(() => {
    if (isAuthenticated && !authLoading && !hasRedirected) {
      const token = localStorage.getItem('access_token');
      if (token) {
        console.log('[Login] Already authenticated, redirecting...');
        setHasRedirected(true);
        router.replace('/');
      }
    }
  }, [isAuthenticated, authLoading, hasRedirected, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Siempre intentar login local primero (funciona para todos los usuarios con password)
    await handleLocalLogin(email, password);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-cultivo-darker flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cultivo-green-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cultivo-darker flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-cultivo-green-600 to-cultivo-green-800 mb-4">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Bienvenido</h1>
          <p className="text-zinc-400 mt-1">Inicia sesión en tu cuenta</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </motion.div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full pl-10 pr-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cultivo-green-600 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-12 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cultivo-green-600 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-cultivo-green-600 hover:bg-cultivo-green-700 disabled:bg-zinc-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Iniciando sesión...
              </>
            ) : (
              'Iniciar sesión'
            )}
          </button>
        </form>

        {/* Link a registro - solo si Supabase está configurado */}
        {supabaseConfigured && (
          <p className="text-center text-zinc-400 mt-6">
            ¿No tienes cuenta?{' '}
            <Link
              href="/register"
              className="text-cultivo-green-400 hover:text-cultivo-green-300 font-medium"
            >
              Regístrate
            </Link>
          </p>
        )}

        {/* Separador y acceso rápido admin */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-cultivo-darker text-zinc-500">
              {supabaseConfigured ? 'o' : 'acceso rápido'}
            </span>
          </div>
        </div>

        {/* Login de admin */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => handleLocalLogin('admin', 'admin')}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 w-full py-3 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 text-zinc-300 rounded-lg transition-colors"
          >
            <User className="w-5 h-5" />
            Entrar como Administrador
          </button>
          {!supabaseConfigured && (
            <p className="text-xs text-zinc-500 mt-2">
              Usuario: admin / Contraseña: admin
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
