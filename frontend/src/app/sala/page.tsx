'use client';

import { Suspense, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  ChevronRight,
  Droplets,
  Loader2,
  MapPin,
  RefreshCw,
  Tent,
  Thermometer,
} from 'lucide-react';
import CarpaCard from '@/components/CarpaCard';
import { Button, ConfirmDialog, EmptyState } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import { useWeather } from '@/hooks/useWeather';

import {
  CreateRoomModal,
  CreateSectionModal,
  RoomSelector,
  SalaErrorState,
  SalaLoadingState,
  useDeleteRoomMutation,
  useSalaDashboard,
} from '@/features/sala';

function SalaPageContent() {
  const { toast } = useToast();
  const weather = useWeather('Buenos Aires');
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

  if (isLoading) {
    return <SalaLoadingState />;
  }

  if (error) {
    return (
      <SalaErrorState
        message="No se pudieron cargar los datos. Verifica que el backend esté corriendo."
        onRetry={refreshAll}
      />
    );
  }

  if (!rooms.length) {
    return (
      <>
        <EmptyState
          icon={Building2}
          title="Configura tu primer espacio"
          description="Crea tu primer espacio de cultivo (sala, invernadero, etc.) para comenzar."
          className="mt-8"
        >
          <Button onClick={() => setIsCreateRoomOpen(true)}>Crear espacio</Button>
        </EmptyState>
        <CreateRoomModal
          isOpen={isCreateRoomOpen}
          onClose={() => setIsCreateRoomOpen(false)}
          onCreated={(room) => setSelectedRoomId(room.id)}
        />
      </>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-md border border-edge bg-surface flex flex-col gap-4 p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-cultivo-green-500" />
            <h2 className="font-display text-lg font-semibold text-white">Espacios de cultivo</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setIsCreateRoomOpen(true)}>
              Nuevo espacio
            </Button>
            <Button variant="ghost" size="sm" onClick={refreshAll}>
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
          </div>
        </div>

        <RoomSelector
          rooms={rooms}
          selectedRoomId={selectedRoomId}
          onSelect={setSelectedRoomId}
          onDelete={setRoomToDelete}
        />
      </motion.div>

      {selectedRoom ? (
        <>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4 border-t border-zinc-700/50 pt-4 lg:flex-row lg:items-center lg:justify-between"
          >
            <div>
              <h1 className="font-display text-3xl font-semibold text-white">{selectedRoom.name}</h1>
              <p className="mt-1 text-zinc-400">
                {selectedRoom.description || 'Monitoreo y control de tu espacio de cultivo'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-zinc-700/50 bg-zinc-800/50 px-4 py-2">
                <MapPin className="h-5 w-5 text-cultivo-green-400" />
                <div className="flex flex-col">
                  {weather.loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                      <span className="text-sm text-zinc-400">Cargando...</span>
                    </div>
                  ) : weather.error ? (
                    <span className="text-sm text-red-400">{weather.error}</span>
                  ) : (
                    <>
                      <span className="text-sm font-semibold text-white">{weather.city}</span>
                      <span className="text-xs text-zinc-400">{weather.country}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-zinc-700/50 bg-zinc-800/50 px-4 py-2">
                <Thermometer className="h-5 w-5 text-orange-400" />
                <span className="text-xl font-bold text-white">
                  {weather.loading ? '...' : `${weather.temperature}°C`}
                </span>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-zinc-700/50 bg-zinc-800/50 px-4 py-2">
                <Droplets className="h-5 w-5 text-blue-400" />
                <span className="text-xl font-bold text-white">
                  {weather.loading ? '...' : `${weather.humidity}%`}
                </span>
              </div>
            </div>
          </motion.div>

          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="rounded-md border border-edge bg-surface p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Tent className="h-5 w-5 text-cultivo-green-500" />
                <h2 className="text-xl font-semibold text-white">Unidades de cultivo</h2>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setIsCreateSectionOpen(true)}>
                Nueva
              </Button>
            </div>
            <p className="mb-6 text-sm text-zinc-400">
              Selecciona una unidad para ver sus detalles, dispositivos y plantas
            </p>

            {sections.length ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
              <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-12 text-center">
                <Tent className="mx-auto mb-4 h-16 w-16 text-zinc-600" />
                <h3 className="mb-2 text-lg font-semibold text-white">Sin unidades de cultivo</h3>
                <p className="mb-4 text-zinc-400">
                  Agrega carpas o invernaderos para organizar tu cultivo
                </p>
                <Button onClick={() => setIsCreateSectionOpen(true)}>
                  <ChevronRight className="h-4 w-4" />
                  Agregar unidad
                </Button>
              </div>
            )}
          </motion.section>
        </>
      ) : null}

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
        message="¿Estás seguro de que deseas eliminar este espacio? Esta acción no se puede deshacer y eliminará todas las unidades (carpas) y dispositivos asociados."
        confirmText="Sí, eliminar"
        onConfirm={handleDeleteRoom}
        onCancel={() => setRoomToDelete(null)}
        variant="danger"
      />
    </div>
  );
}

export default function SalaPage() {
  const content = (
    <Suspense fallback={<SalaLoadingState />}>
      <SalaPageContent />
    </Suspense>
  );

  return content;
}
