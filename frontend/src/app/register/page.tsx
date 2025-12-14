'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Leaf, Mail, Lock, User, Loader2, AlertCircle, Eye, EyeOff, CheckCircle, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, isAuthenticated, isLoading: authLoading, supabaseConfigured } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.push('/');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);

    const result = await signUp(email, password, name);
    
    if (result.error) {
      if (result.error.includes('verifica')) {
        setSuccess(true);
      } else {
        setError(result.error);
      }
      setIsLoading(false);
    } else {
      router.push('/');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-cultivo-darker flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cultivo-green-500 animate-spin" />
      </div>
    );
  }

  // Si Supabase no está configurado, mostrar mensaje
  if (!supabaseConfigured) {
    return (
      <div className="min-h-screen bg-cultivo-darker flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/20 mb-4">
            <Info className="w-8 h-8 text-yellow-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Registro no disponible</h1>
          <p className="text-zinc-400 mb-6">
            El sistema de registro de usuarios requiere configurar Supabase Auth. 
            Contacta al administrador para obtener una cuenta.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-cultivo-green-600 hover:bg-cultivo-green-700 text-white font-semibold rounded-lg transition-colors"
          >
            Ir a iniciar sesión
          </Link>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-cultivo-darker flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cultivo-green-600/20 mb-4">
            <CheckCircle className="w-8 h-8 text-cultivo-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">¡Registro exitoso!</h1>
          <p className="text-zinc-400 mb-6">
            Te hemos enviado un email de confirmación. Por favor verifica tu correo para activar tu cuenta.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-cultivo-green-600 hover:bg-cultivo-green-700 text-white font-semibold rounded-lg transition-colors"
          >
            Ir a iniciar sesión
          </Link>
        </motion.div>
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
          <h1 className="text-2xl font-bold text-white">Crear cuenta</h1>
          <p className="text-zinc-400 mt-1">Comienza a gestionar tu cultivo</p>
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
              Nombre
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                required
                className="w-full pl-10 pr-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cultivo-green-600 transition-colors"
              />
            </div>
          </div>

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
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
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

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Confirmar contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite tu contraseña"
                required
                className="w-full pl-10 pr-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cultivo-green-600 transition-colors"
              />
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
                Creando cuenta...
              </>
            ) : (
              'Crear cuenta'
            )}
          </button>
        </form>

        {/* Link a login */}
        <p className="text-center text-zinc-400 mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link
            href="/login"
            className="text-cultivo-green-400 hover:text-cultivo-green-300 font-medium"
          >
            Inicia sesión
          </Link>
        </p>

        {/* Info de plan */}
        <div className="mt-6 p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
          <p className="text-sm text-zinc-400 text-center">
            Al registrarte obtienes el plan <span className="text-cultivo-green-400 font-medium">Básico</span> gratis:
          </p>
          <ul className="mt-2 text-sm text-zinc-500 space-y-1">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-cultivo-green-500" />
              1 sala de cultivo
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-cultivo-green-500" />
              Seguimiento de ciclos y plantas
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-cultivo-green-500" />
              Hasta 3 dispositivos IoT
            </li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}
