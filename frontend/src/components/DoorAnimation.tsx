'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Leaf } from 'lucide-react';

export default function DoorAnimation() {
  const [isOpening, setIsOpening] = useState(false);
  const router = useRouter();

  const handleEnter = () => {
    setIsOpening(true);
    // Navegar después de que la animación comience
    setTimeout(() => {
      router.push('/sala');
    }, 800);
  };

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

      {/* Contenido principal (mensaje y botón) */}
      <AnimatePresence>
        {!isOpening && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative z-30 min-h-screen flex flex-col items-center justify-center px-4"
          >
            {/* Logo/Icono */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cultivo-green-600 to-cultivo-green-800 flex items-center justify-center shadow-lg shadow-cultivo-green-900/50">
                <Leaf className="w-12 h-12 text-white" />
              </div>
            </motion.div>

            {/* Título */}
            <motion.h1
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl font-bold text-center mb-4 text-white"
            >
              Bienvenido
            </motion.h1>

            {/* Mensaje principal */}
            <motion.p
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-2xl md:text-3xl text-cultivo-green-400 text-center mb-12 font-light"
            >
              Ingresa a la Sala de Cultivo
            </motion.p>

            {/* Botón de entrada */}
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleEnter}
              className="group relative px-12 py-4 bg-gradient-to-r from-cultivo-green-600 to-cultivo-green-700 rounded-full text-white text-xl font-semibold shadow-lg shadow-cultivo-green-900/50 hover:shadow-xl hover:shadow-cultivo-green-800/50 transition-all duration-300 overflow-hidden"
            >
              {/* Efecto de brillo */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span className="relative flex items-center gap-3">
                <Leaf className="w-6 h-6" />
                Entrar
              </span>
            </motion.button>

            {/* Indicador sutil */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-8 text-zinc-500 text-sm"
            >
              Haz clic para abrir las puertas
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

