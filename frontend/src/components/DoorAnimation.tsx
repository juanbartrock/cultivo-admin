'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Leaf, Sprout, Plus, Home, Loader2, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { roomService } from '@/services/locationService';
import { Room } from '@/types';

export default function DoorAnimation() {
  const [isOpening, setIsOpening] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, signOut, isAdmin } = useAuth();
  
  // Estado para las salas del usuario
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  
  // Estado para mostrar info contextual (fecha/hora)
  const [currentDate, setCurrentDate] = useState('');
  
  useEffect(() => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    };
    setCurrentDate(now.toLocaleDateString('es-AR', options));
  }, []);

  // Cargar salas del usuario
  useEffect(() => {
    async function loadRooms() {
      if (!isAuthenticated) return;
      
      setIsLoadingRooms(true);
      try {
        const roomsData = await roomService.getAll();
        setRooms(roomsData);
      } catch (error) {
        console.error('Error loading rooms:', error);
      } finally {
        setIsLoadingRooms(false);
      }
    }

    if (isAuthenticated && !authLoading) {
      loadRooms();
    }
  }, [isAuthenticated, authLoading]);

  // Redirigir a login si no está autenticado
  // Solo redirigir UNA VEZ cuando authLoading pasa a false
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  
  useEffect(() => {
    // Solo verificar una vez después de que termine de cargar
    if (!authLoading && !hasCheckedAuth) {
      setHasCheckedAuth(true);
      
      // Si hay token local, no redirigir (el AuthContext cargará el usuario)
      const localToken = localStorage.getItem('access_token');
      if (!localToken && !isAuthenticated) {
        router.push('/login');
      }
    }
  }, [authLoading, isAuthenticated, hasCheckedAuth, router]);

  const handleEnterRoom = (roomId?: string) => {
    setIsOpening(true);
    setSelectedRoomId(roomId || null);
    // Navegar después de que la animación comience
    setTimeout(() => {
      router.push('/sala');
    }, 800);
  };

  const handleCreateRoom = () => {
    router.push('/sala');
  };

  // Mostrar loading mientras carga auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-cultivo-darker flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-cultivo-green-500 animate-spin" />
      </div>
    );
  }

  // Nombre de usuario a mostrar
  const displayName = user?.name || 'Cultivador';

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-cultivo-darker">
      {/* Contenido detrás de las puertas (la sala) */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-cultivo-green-900/20 to-cultivo-darker">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: isOpening ? 1 : 0, scale: isOpening ? 1 : 0.9 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center"
        >
          <Leaf className="w-20 h-20 text-cultivo-green-500 mx-auto mb-4" />
          <p className="text-cultivo-green-400 text-xl">Entrando a la sala...</p>
        </motion.div>
      </div>

      {/* Puertas corredizas */}
      <AnimatePresence>
        {!isOpening && (
          <>
            {/* Puerta izquierda */}
            <motion.div
              initial={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-zinc-900 to-zinc-800 border-r border-cultivo-green-900/50 shadow-2xl z-20"
            >
              {/* Textura de puerta */}
              <div className="absolute inset-0 opacity-10">
                <div className="h-full w-full" style={{
                  backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(255,255,255,0.03) 50px, rgba(255,255,255,0.03) 51px)'
                }} />
              </div>
              {/* Manija */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-24 bg-cultivo-green-700 rounded-full shadow-lg" />
            </motion.div>

            {/* Puerta derecha */}
            <motion.div
              initial={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-zinc-900 to-zinc-800 border-l border-cultivo-green-900/50 shadow-2xl z-20"
            >
              {/* Textura de puerta */}
              <div className="absolute inset-0 opacity-10">
                <div className="h-full w-full" style={{
                  backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(255,255,255,0.03) 50px, rgba(255,255,255,0.03) 51px)'
                }} />
              </div>
              {/* Manija */}
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-24 bg-cultivo-green-700 rounded-full shadow-lg" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Contenido principal */}
      <AnimatePresence>
        {!isOpening && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative z-30 min-h-screen flex flex-col items-center px-4 py-8"
          >
            {/* Header con opciones de usuario */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="w-full max-w-2xl flex justify-end gap-2 mb-4"
            >
              {isAdmin && (
                <button
                  onClick={() => router.push('/admin/usuarios')}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400 hover:text-white rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Admin
                </button>
              )}
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-zinc-800/50 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Salir
              </button>
            </motion.div>

            {/* Sección superior - Logo y saludo */}
            <div className="flex flex-col items-center mt-4">
              {/* Logo/Icono */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-6"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cultivo-green-600 to-cultivo-green-800 flex items-center justify-center shadow-lg shadow-cultivo-green-900/50">
                  <Leaf className="w-10 h-10 text-white" />
                </div>
              </motion.div>

              {/* Saludo personalizado */}
              <motion.h1
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-3xl md:text-4xl font-bold text-center text-white mb-2"
              >
                Bienvenido, <span className="text-cultivo-green-400">{displayName}</span>
              </motion.h1>
              
              {/* Pregunta */}
              <motion.p
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-zinc-400 text-lg text-center"
              >
                ¿A qué sala quieres ingresar?
              </motion.p>
              
              {/* Fecha */}
              <motion.p
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="text-zinc-500 text-sm capitalize mt-1"
              >
                {currentDate}
              </motion.p>
            </div>

            {/* Lista de salas */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="w-full max-w-md mt-10 flex-1"
            >
              {isLoadingRooms ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 text-cultivo-green-500 animate-spin" />
                </div>
              ) : rooms.length > 0 ? (
                <div className="space-y-3">
                  {rooms.map((room, index) => (
                    <motion.button
                      key={room.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      onClick={() => handleEnterRoom(room.id)}
                      className="w-full group flex items-center gap-4 p-4 bg-zinc-800/50 hover:bg-cultivo-green-600/20 border border-zinc-700/50 hover:border-cultivo-green-500/50 rounded-xl transition-all duration-300"
                    >
                      <div className="w-12 h-12 rounded-lg bg-cultivo-green-600/20 flex items-center justify-center group-hover:bg-cultivo-green-600/30 transition-colors">
                        <Home className="w-6 h-6 text-cultivo-green-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="text-lg font-semibold text-white group-hover:text-cultivo-green-400 transition-colors">
                          {room.name}
                        </h3>
                        {room.description && (
                          <p className="text-sm text-zinc-400">{room.description}</p>
                        )}
                        <p className="text-xs text-zinc-500 mt-1">
                          {room.sections?.length || 0} unidad(es) de cultivo
                        </p>
                      </div>
                      <Sprout className="w-5 h-5 text-zinc-500 group-hover:text-cultivo-green-400 transition-colors" />
                    </motion.button>
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-center py-8"
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800/50 flex items-center justify-center">
                    <Home className="w-8 h-8 text-zinc-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    No tienes salas creadas
                  </h3>
                  <p className="text-zinc-400 mb-4">
                    Crea tu primera sala para comenzar a gestionar tu cultivo
                  </p>
                </motion.div>
              )}

              {/* Botón crear sala */}
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                onClick={handleCreateRoom}
                className="w-full mt-4 flex items-center justify-center gap-3 p-4 bg-zinc-800/30 hover:bg-cultivo-green-600/20 border border-dashed border-zinc-700/50 hover:border-cultivo-green-500/50 rounded-xl text-zinc-400 hover:text-cultivo-green-400 transition-all duration-300"
              >
                <Plus className="w-5 h-5" />
                <span>{rooms.length > 0 ? 'Crear otra sala' : 'Crear mi primera sala'}</span>
              </motion.button>
            </motion.div>

            {/* Suscripción del usuario */}
            {user && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-6 text-center"
              >
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  user.subscriptionTier === 'PREMIUM' 
                    ? 'bg-yellow-500/20 text-yellow-400' 
                    : user.subscriptionTier === 'PRO'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-zinc-700/50 text-zinc-400'
                }`}>
                  Plan {user.subscriptionTier}
                </span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

