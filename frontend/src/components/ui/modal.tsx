'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

interface ModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  maxWidthClassName?: string;
}

const modalSizeClasses: Record<ModalSize, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
};

/** Diálogo de la app sobre el `Dialog` de shadcn/ui (Radix): foco atrapado, Escape y overlay. */
export function Modal({
  isOpen,
  title,
  description,
  onClose,
  children,
  footer,
  size = 'md',
  maxWidthClassName,
}: ModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent
        className={cn(
          'max-h-[90vh] w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0',
          maxWidthClassName ?? modalSizeClasses[size]
        )}
        // Sin descripción no hay nada que enlazar: evita el aviso de Radix.
        {...(description ? {} : { 'aria-describedby': undefined })}
      >
        <DialogHeader className="border-b border-edge px-5 py-4 text-left">
          <DialogTitle className="font-display text-lg font-semibold text-fg">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-sm text-fg-muted">{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>

        {footer ? (
          <DialogFooter className="border-t border-edge px-5 py-4">{footer}</DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
