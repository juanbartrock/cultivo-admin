'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Leaf, Home, Settings, ArrowLeft, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Header() {
  const pathname = usePathname();
  const isHome = pathname === '/sala';

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 bg-cultivo-darker/80 backdrop-blur-lg border-b border-zinc-800"
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo y navegación */}
          <div className="flex items-center gap-4">
            {!isHome && (
              <Link 
                href="/sala"
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-zinc-400" />
              </Link>
            )}
            <Link href="/sala" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cultivo-green-600 to-cultivo-green-800 flex items-center justify-center">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white">Seguimiento de cultivo</h1>
              </div>
            </Link>
          </div>

          {/* Navegación principal */}
          <nav className="flex items-center gap-2">
            <Link
              href="/sala"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                pathname === '/sala'
                  ? 'bg-cultivo-green-600/20 text-cultivo-green-400'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Sala</span>
            </Link>
            <Link
              href="/seguimientos"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                pathname === '/seguimientos'
                  ? 'bg-cultivo-green-600/20 text-cultivo-green-400'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Ciclos</span>
            </Link>
            <Link
              href="/artefactos"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                pathname === '/artefactos'
                  ? 'bg-cultivo-green-600/20 text-cultivo-green-400'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Dispositivos</span>
            </Link>
          </nav>
        </div>
      </div>
    </motion.header>
  );
}

