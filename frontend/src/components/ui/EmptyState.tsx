'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import React from 'react';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
    imageSrc?: string; // Optional custom illustration if needed later
    children?: React.ReactNode;
}

export default function EmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    className = '',
    children,
}: EmptyStateProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-sm ${className}`}
        >
            <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-6 ring-1 ring-white/10 shadow-lg shadow-black/20">
                <Icon className="w-8 h-8 text-zinc-400" strokeWidth={1.5} />
            </div>

            <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">
                {title}
            </h3>

            <p className="text-zinc-400 max-w-sm mb-8 leading-relaxed">
                {description}
            </p>

            {children}

            {actionLabel && onAction && (
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onAction}
                    className="rounded-lg bg-gradient-to-r from-cultivo-green-600 to-cyan-600 px-6 py-2.5 font-medium text-white shadow-lg shadow-black/30 transition-all duration-200 hover:from-cultivo-green-500 hover:to-cyan-500"
                >
                    {actionLabel}
                </motion.button>
            )}
        </motion.div>
    );
}
