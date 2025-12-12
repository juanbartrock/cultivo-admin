
'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, X, Info, AlertTriangle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
    title?: string;
}

interface ToastContextType {
    toast: {
        success: (message: string, title?: string) => void;
        error: (message: string, title?: string) => void;
        info: (message: string, title?: string) => void;
        warning: (message: string, title?: string) => void;
    };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((type: ToastType, message: string, title?: string) => {
        const id = Math.random().toString(36).substring(7);
        setToasts((prev) => [...prev, { id, type, message, title }]);

        // Auto remove after 5s
        setTimeout(() => {
            removeToast(id);
        }, 5000);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const toast = {
        success: (msg: string, title?: string) => addToast('success', msg, title),
        error: (msg: string, title?: string) => addToast('error', msg, title),
        info: (msg: string, title?: string) => addToast('info', msg, title),
        warning: (msg: string, title?: string) => addToast('warning', msg, title),
    };

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map((t) => (
                        <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
};

const styles = {
    success: 'bg-zinc-900 border-cultivo-green-500/50 text-white',
    error: 'bg-zinc-900 border-red-500/50 text-white',
    info: 'bg-zinc-900 border-blue-500/50 text-white',
    warning: 'bg-zinc-900 border-yellow-500/50 text-white',
};

const iconColors = {
    success: 'text-cultivo-green-500',
    error: 'text-red-500',
    info: 'text-blue-500',
    warning: 'text-yellow-500',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
    const Icon = icons[toast.type];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className={cn(
                'pointer-events-auto flex items-start w-full max-w-sm gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md',
                styles[toast.type]
            )}
        >
            <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', iconColors[toast.type])} />
            <div className="flex-1 min-w-0">
                {toast.title && <h3 className="font-semibold text-sm">{toast.title}</h3>}
                <p className="text-sm text-zinc-300 leading-relaxed">{toast.message}</p>
            </div>
            <button
                onClick={onDismiss}
                className="shrink-0 text-zinc-500 hover:text-white transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </motion.div>
    );
}
