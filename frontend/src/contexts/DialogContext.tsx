
'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface DialogOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
}

interface DialogContextType {
    confirm: (options: DialogOptions) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const useConfirm = () => {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useConfirm must be used within a DialogProvider');
    }
    return context.confirm;
};

export function DialogProvider({ children }: { children: ReactNode }) {
    const [options, setOptions] = useState<DialogOptions>({
        title: '',
        message: '',
    });
    const [isOpen, setIsOpen] = useState(false);
    const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

    const confirm = useCallback((opts: DialogOptions): Promise<boolean> => {
        setOptions(opts);
        setIsOpen(true);
        return new Promise((resolve) => {
            setResolver(() => resolve);
        });
    }, []);

    const handleConfirm = useCallback(() => {
        setIsOpen(false);
        if (resolver) resolver(true);
    }, [resolver]);

    const handleCancel = useCallback(() => {
        setIsOpen(false);
        if (resolver) resolver(false);
    }, [resolver]);

    return (
        <DialogContext.Provider value={{ confirm }}>
            {children}
            <ConfirmDialog
                isOpen={isOpen}
                title={options.title}
                message={options.message}
                confirmText={options.confirmText}
                cancelText={options.cancelText}
                variant={options.variant}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </DialogContext.Provider>
    );
}
