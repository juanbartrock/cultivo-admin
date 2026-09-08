'use client';

import { Suspense, useState } from 'react';
import { Building2, MoreVertical, Plus, RefreshCw, Tent, Trash2 } from 'lucide-react';
import CarpaCard from '@/components/CarpaCard';
import { PageHeader } from '@/components/shell';
import { Button, ConfirmDialog, EmptyState } from '@/components/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/contexts/ToastContext';
import {
  CreateRoomModal,
  CreateSectionModal,
  SalaErrorState,
  SalaLoadingState,
  useDeleteRoomMutation,
  useSalaDashboard,
} from '@/features/sala';

function SalaPageContent() {
  const { toast } = useToast();
  const deleteRoomMutation = useDeleteRoomMutation();

  const {
    rooms,
    sections,
    selectedRoom,
    selectedRoomId,
    setSelectedRoomId,
    getStatus,
    statusLoading,
    isLoading,
    error,
    refreshAll,
    refetchRooms,
    refetchSections,
  } = useSalaDashboard();

  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [isCreateSectionOpen, setIsCreateSectionOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);

  async function handleDeleteRoom() {
    if (!roomToDelete) return;

    try {
      await deleteRoomMutation.mutateAsync(roomToDelete);
      toast.success('Espacio eliminado correctamente');
      setRoomToDelete(null);
      await refetchRooms();
    } catch (deleteError) {
      console.error('Error eliminando sala:', deleteError);
      toast.error('Error al eliminar el espacio de cultivo');
    }
  }

  // Los estados previos a los datos también montan `PageHeader`: es el que registra el título
  // en el shell y el que pone el único <h1> del documento.
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Salas" />
        <SalaLoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Salas" />
        <SalaErrorState
          message="No se pudieron cargar los datos. Verifica que el backend esté corriendo."
          onRetry={refreshAll}
        />
      </div>
    );
  }

  if (!rooms.length) {
    return (
      <div className="space-y-6">
        <PageHeader title="Salas" />
        <EmptyState
          icon={Building2}
          title="Sin espacios de cultivo"
          actionLabel="Crear espacio"
          onAction={() => setIsCreateRoomOpen(true)}
        />
        <CreateRoomModal
          isOpen={isCreateRoomOpen}
          onClose={() => setIsCreateRoomOpen(false)}
          onCreated={(room) => setSelectedRoomId(room.id)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={selectedRoom?.name ?? 'Salas'}
        subtitle={selectedRoom?.description}
        breadcrumb={selectedRoom ? [{ label: 'Salas' }, { label: selectedRoom.name }] : undefined}
        actions={
          <>
            <Select value={selectedRoomId ?? undefined} onValueChange={setSelectedRoomId}>
              <SelectTrigger className="h-9 w-full min-w-[10rem] sm:w-auto">
                <SelectValue placeholder="Elegir sala" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" onClick={() => setIsCreateSectionOpen(true)} disabled={!selectedRoom}>
              <Plus className="h-4 w-4" />
              Nueva carpa
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Acciones de la sala">
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={() => setIsCreateRoomOpen(true)}
                >
                  <Building2 className="h-4 w-4" />
                  Nueva sala
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onSelect={() => void refreshAll()}>
                  <RefreshCw className={`h-4 w-4 ${statusLoading ? 'animate-spin' : ''}`} />
                  Actualizar
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer text-danger focus:text-danger"
                  disabled={!selectedRoomId}
                  onSelect={() => setRoomToDelete(selectedRoomId)}
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar sala
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {sections.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {sections.map((section, index) => (
            <CarpaCard
              key={section.id}
              section={section}
              delay={index}
              getDeviceStatus={getStatus}
              statusLoading={statusLoading}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Tent}
          title="Sin carpas en esta sala"
          actionLabel="Agregar carpa"
          onAction={() => setIsCreateSectionOpen(true)}
        />
      )}

      <CreateRoomModal
        isOpen={isCreateRoomOpen}
        onClose={() => setIsCreateRoomOpen(false)}
        onCreated={(room) => setSelectedRoomId(room.id)}
      />

      {selectedRoom ? (
        <CreateSectionModal
          roomId={selectedRoom.id}
          isOpen={isCreateSectionOpen}
          onClose={() => setIsCreateSectionOpen(false)}
          onCreated={() => {
            void refetchSections();
          }}
        />
      ) : null}

      <ConfirmDialog
        isOpen={Boolean(roomToDelete)}
        title="Eliminar espacio de cultivo"
        message="Se eliminan también todas sus carpas y los dispositivos asociados. La acción no se puede deshacer."
        confirmText="Sí, eliminar"
        onConfirm={handleDeleteRoom}
        onCancel={() => setRoomToDelete(null)}
        variant="danger"
      />
    </div>
  );
}

export default function SalaPage() {
  return (
    <Suspense fallback={<SalaLoadingState />}>
      <SalaPageContent />
    </Suspense>
  );
}
