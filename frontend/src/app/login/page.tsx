
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, User, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';

export default function LoginPage() {
    const [username, setUsername] = useState('admin');
    const [password, setPassword] = useState('admin');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const { access_token } = await authService.login(username, password);
            login(access_token);
        } catch (err) {
            console.error(err);
            let errorMessage = 'Error al iniciar sesión. Intenta nuevamente.';

            if (err instanceof Error) {
                // Si es un error de conexión (fetch failed) o similar
                if (err.message.includes('Failed to fetch') || err.message.includes('Network request failed')) {
                    errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión.';
                } else if (err.message.includes('401') || err.message.includes('Credenciales')) {
                    errorMessage = 'Credenciales inválidas. Intenta nuevamente.';
                } else {
                    errorMessage = err.message;
                }
            }

            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-cultivo-darker flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
                    {/* Header */}
                    <div className="p-8 bg-zinc-900/50 text-center border-b border-zinc-800">
                        <div className="w-16 h-16 bg-cultivo-green-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-8 h-8 text-cultivo-green-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Bienvenido</h1>
                        <p className="text-zinc-400 text-sm">Ingresa tus credenciales para continuar</p>
                    </div>

                    {/* Form */}
                    <div className="p-8">
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-1">
                                    Usuario
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-zinc-500" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-2 border border-zinc-700 rounded-lg focus:ring-cultivo-green-500 focus:border-cultivo-green-500 bg-zinc-800 text-white placeholder-zinc-500"
                                        placeholder="Usuario"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-1">
                                    Contraseña
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-zinc-500" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-2 border border-zinc-700 rounded-lg focus:ring-cultivo-green-500 focus:border-cultivo-green-500 bg-zinc-800 text-white placeholder-zinc-500"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="text-red-400 text-sm text-center"
                                >
                                    {error}
                                </motion.div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-cultivo-green-600 hover:bg-cultivo-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-cultivo-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <span className="mr-2">Ingresar</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <div className="px-8 py-4 bg-zinc-900/50 border-t border-zinc-800 text-center">
                        <p className="text-xs text-zinc-500">
                            Credenciales Demo: admin / admin
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
