import { useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Room } from '@/types';
import { useCreateRoomMutation } from '../queries/useSalaQueries';
import { Button, Modal } from '@/components/ui';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (room: Room) => void;
}

export function CreateRoomModal({ isOpen, onClose, onCreated }: CreateRoomModalProps) {
  const { toast } = useToast();
  const createRoomMutation = useCreateRoomMutation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  async function handleCreate() {
    if (!name.trim()) return;

    try {
      const room = await createRoomMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast.success('Espacio de cultivo creado exitosamente');
      setName('');
      setDescription('');
      onCreated?.(room);
      onClose();
    } catch (error) {
      console.error('Error creando espacio:', error);
      toast.error('Error al crear el espacio de cultivo');
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo espacio de cultivo" maxWidthClassName="max-w-md">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-fg-muted">
            Nombre <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej: Sala Principal, Invernadero, Terraza..."
            className="w-full rounded-md border border-edge bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-fg-muted">Descripción (opcional)</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="Describe el espacio..."
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
          disabled={!name.trim() || createRoomMutation.isPending}
        >
          {createRoomMutation.isPending ? 'Creando...' : 'Crear'}
        </Button>
      </div>
    </Modal>
  );
}
