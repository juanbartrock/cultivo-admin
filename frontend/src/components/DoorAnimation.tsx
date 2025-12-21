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
      // Pasar el roomId como query param para que la página de sala lo use
      const url = roomId ? `/sala?roomId=${roomId}` : '/sala';
      router.push(url);
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

      {/* Contenido principal - Layout de dos columnas */}
      <AnimatePresence>
        {!isOpening && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative z-30 h-screen flex"
          >
            {/* === PUERTA IZQUIERDA: Info y bienvenida === */}
            <div className="w-1/2 h-full flex flex-col justify-center items-center px-8 lg:px-12">
              {/* Logo */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-8"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cultivo-green-600 to-cultivo-green-800 flex items-center justify-center shadow-xl shadow-cultivo-green-900/30">
                  <Leaf className="w-12 h-12 text-white" />
                </div>
              </motion.div>

              {/* Saludo */}
              <motion.h1
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-2xl lg:text-3xl font-bold text-center text-white mb-4"
              >
                Bienvenido, <span className="text-cultivo-green-400">{displayName}</span>
              </motion.h1>
              
              {/* Pregunta */}
              <motion.p
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-zinc-400 text-lg text-center mb-2"
              >
                ¿A qué sala quieres ingresar?
              </motion.p>
              
              {/* Fecha */}
              <motion.p
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="text-zinc-500 text-sm capitalize"
              >
                {currentDate}
              </motion.p>

              {/* Plan del usuario - en la parte inferior izquierda */}
              {user && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-8"
                >
                  <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                    user.subscriptionTier === 'PREMIUM' 
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
                      : user.subscriptionTier === 'PRO'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-zinc-700/50 text-zinc-400 border border-zinc-600/30'
                  }`}>
                    Plan {user.subscriptionTier}
                  </span>
                </motion.div>
              )}
            </div>

            {/* === PUERTA DERECHA: Lista de salas === */}
            <div className="w-1/2 h-full flex flex-col justify-center px-8 lg:px-12">
              {/* Header con botones de usuario */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="absolute top-4 right-4 flex gap-2"
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

              {/* Lista de salas */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="w-full max-w-md mx-auto"
              >
                {isLoadingRooms ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 text-cultivo-green-500 animate-spin" />
                  </div>
                ) : rooms.length > 0 ? (
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                    {rooms.map((room, index) => (
                      <motion.button
                        key={room.id}
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.6 + index * 0.1 }}
                        onClick={() => handleEnterRoom(room.id)}
                        className="w-full group flex items-center gap-4 p-4 bg-zinc-800/60 hover:bg-cultivo-green-600/15 border border-zinc-700/50 hover:border-cultivo-green-500/50 rounded-xl transition-all duration-300"
                      >
                        {/* Icono */}
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cultivo-green-600/30 to-cultivo-green-800/20 flex items-center justify-center group-hover:from-cultivo-green-600/40 group-hover:to-cultivo-green-700/30 transition-all border border-cultivo-green-600/20 flex-shrink-0">
                          <Home className="w-6 h-6 text-cultivo-green-400" />
                        </div>
                        
                        {/* Contenido */}
                        <div className="flex-1 text-left min-w-0">
                          <h3 className="text-base font-semibold text-white group-hover:text-cultivo-green-400 transition-colors truncate">
                            {room.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            {room.description && (
                              <p className="text-xs text-zinc-500 truncate max-w-[150px]">{room.description}</p>
                            )}
                            <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                              <Sprout className="w-3 h-3 text-cultivo-green-500" />
                              {room.sections?.length || 0}
                            </span>
                          </div>
                        </div>
                        
                        {/* Flecha */}
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-700/30 group-hover:bg-cultivo-green-600/20 flex items-center justify-center transition-all">
                          <Sprout className="w-4 h-4 text-zinc-500 group-hover:text-cultivo-green-400 transition-colors" />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-center py-6"
                  >
                    <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-zinc-800/50 flex items-center justify-center">
                      <Home className="w-7 h-7 text-zinc-500" />
                    </div>
                    <h3 className="text-base font-semibold text-white mb-1">
                      No tienes salas creadas
                    </h3>
                    <p className="text-zinc-400 text-sm">
                      Crea tu primera sala para comenzar
                    </p>
                  </motion.div>
                )}

                {/* Botón crear sala */}
                <motion.button
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  onClick={handleCreateRoom}
                  className="w-full mt-3 flex items-center justify-center gap-2 p-3 bg-zinc-800/30 hover:bg-cultivo-green-600/20 border border-dashed border-zinc-700/50 hover:border-cultivo-green-500/50 rounded-xl text-zinc-400 hover:text-cultivo-green-400 transition-all duration-300 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>{rooms.length > 0 ? 'Crear otra sala' : 'Crear mi primera sala'}</span>
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

