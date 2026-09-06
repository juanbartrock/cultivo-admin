import { useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { useCreateSectionMutation } from '../queries/useSalaQueries';
import { Button, Modal } from '@/components/ui';

interface CreateSectionModalProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function CreateSectionModal({ roomId, isOpen, onClose, onCreated }: CreateSectionModalProps) {
  const { toast } = useToast();
  const createSectionMutation = useCreateSectionMutation();

  const [form, setForm] = useState({
    name: '',
    dimensions: '',
    description: '',
  });

  async function handleCreate() {
    if (!form.name.trim()) return;

    try {
      await createSectionMutation.mutateAsync({
        name: form.name.trim(),
        dimensions: form.dimensions.trim() || undefined,
        description: form.description.trim() || undefined,
        roomId,
      });
      toast.success('Unidad de cultivo creada exitosamente');
      setForm({ name: '', dimensions: '', description: '' });
      onCreated?.();
      onClose();
    } catch (error) {
      console.error('Error creando unidad:', error);
      toast.error('Error al crear la unidad de cultivo');
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nueva Unidad de Cultivo" maxWidthClassName="max-w-md">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-fg-muted">
            Nombre <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Ej: Carpa Floración, Invernadero..."
            className="w-full rounded-md border border-edge bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-fg-muted">Dimensiones (opcional)</label>
          <input
            type="text"
            value={form.dimensions}
            onChange={(event) => setForm((current) => ({ ...current, dimensions: event.target.value }))}
            placeholder="Ej: 120x120x200cm"
            className="w-full rounded-md border border-edge bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-fg-muted">Descripción (opcional)</label>
          <textarea
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            rows={2}
            placeholder="Descripción de la unidad..."
            className="w-full resize-none rounded-md border border-edge bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          onClick={handleCreate}
          disabled={!form.name.trim() || createSectionMutation.isPending}
        >
          {createSectionMutation.isPending ? 'Creando...' : 'Crear'}
        </Button>
      </div>
    </Modal>
  );
}
