
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    onConfirm,
    onCancel,
    variant = 'danger'
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    const colors = {
        danger: {
            bg: 'bg-red-500/10',
            border: 'border-red-500/20',
            icon: 'text-red-500',
            button: 'bg-red-600 hover:bg-red-700',
        },
        warning: {
            bg: 'bg-yellow-500/10',
            border: 'border-yellow-500/20',
            icon: 'text-yellow-500',
            button: 'bg-yellow-600 hover:bg-yellow-700',
        },
        info: {
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20',
            icon: 'text-blue-500',
            button: 'bg-blue-600 hover:bg-blue-700',
        },
    };

    const style = colors[variant];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onCancel}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className={`relative w-full max-w-md bg-zinc-900 border ${style.border} rounded-2xl shadow-2xl overflow-hidden`}
                >
                    <div className="p-6">
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-full ${style.bg}`}>
                                <AlertCircle className={`w-6 h-6 ${style.icon}`} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                                <p className="text-zinc-400 leading-relaxed">{message}</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 mt-8">
                            <button
                                onClick={onCancel}
                                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={onConfirm}
                                className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${style.button}`}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={onCancel}
                        className="absolute top-4 right-4 text-zinc-500 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
