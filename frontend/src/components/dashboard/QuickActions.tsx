import { motion } from 'framer-motion';
import { Power, Moon, Sun, AlertOctagon, StickyNote } from 'lucide-react';

interface QuickActionsProps {
    onMasterOff: () => void;
    // onNightMode: () => void; // Future feature
    // onAddNote: () => void; // Future feature
    isProcessing?: boolean;
}

export default function QuickActions({ onMasterOff, isProcessing }: QuickActionsProps) {
    return (
        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
            <h3 className="font-semibold text-white text-sm mb-3">Acciones Rápidas</h3>

            <div className="grid grid-cols-2 gap-3">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onMasterOff}
                    disabled={isProcessing}
                    className="flex flex-col items-center justify-center gap-2 p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                >
                    <Power className="w-5 h-5" />
                    <span className="text-xs font-medium">Apagar Todo</span>
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    // Placeholder logic
                    onClick={() => { }}
                    className="flex flex-col items-center justify-center gap-2 p-3 bg-zinc-700/30 hover:bg-zinc-700/50 text-zinc-400 border border-zinc-700/30 rounded-lg transition-colors cursor-not-allowed opacity-60"
                >
                    <Moon className="w-5 h-5" />
                    <span className="text-xs font-medium">Modo Noche (Pronto)</span>
                </motion.button>
            </div>
        </div>
    );
}
