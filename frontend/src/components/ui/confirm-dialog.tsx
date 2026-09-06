'use client';

import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';

type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: ConfirmVariant;
}

const variantConfig: Record<
  ConfirmVariant,
  { icon: typeof AlertTriangle; tone: string; button: 'danger' | 'primary' }
> = {
  danger: { icon: ShieldAlert, tone: 'text-danger', button: 'danger' },
  warning: { icon: AlertTriangle, tone: 'text-warn', button: 'primary' },
  info: { icon: Info, tone: 'text-info', button: 'primary' },
};

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  variant = 'danger',
}: ConfirmDialogProps) {
  const { icon: Icon, tone, button } = variantConfig[variant];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? undefined : onCancel())}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 font-display text-lg font-semibold text-fg">
            <Icon className={`h-5 w-5 shrink-0 ${tone}`} />
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-fg-muted">{message}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button variant={button} onClick={onConfirm}>
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
