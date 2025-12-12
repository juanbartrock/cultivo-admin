'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Thermometer, Droplets, Activity, Tent, MapPin, Loader2, AlertCircle, Plus, RefreshCw, Home, ChevronRight, Building2, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import SensorCard from '@/components/SensorCard';
import CarpaCard from '@/components/CarpaCard';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import { roomService, sectionService } from '@/services/locationService';
import { useWeather } from '@/hooks/useWeather';
import { useDevicesStatus } from '@/hooks/useDeviceStatus';
import { Room, Section, Device, DeviceStatus } from '@/types';

export default function SalaPage() {
  // Estado de datos
  const { toast } = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Obtener datos del clima real
  const weather = useWeather('Buenos Aires');

  // Obtener todos los dispositivos de todas las secciones para consultar su estado
  const allDevices = useMemo(() => {
    return sections.flatMap(s => s.devices || []);
  }, [sections]);

  // Obtener estados en tiempo real de todos los dispositivos
  const { statuses: deviceStatuses, getStatus, loading: statusLoading, refresh: refreshStatuses } = useDevicesStatus(
    allDevices,
    { pollingInterval: 30000, autoRefresh: true }
  );

  // Cargar datos
  useEffect(() => {
    loadData();
  }, []);

  // Cargar secciones cuando cambia la sala seleccionada
  useEffect(() => {
    if (selectedRoom) {
      loadSectionsForRoom(selectedRoom.id);
    } else {
      setSections([]);
    }
  }, [selectedRoom?.id]);

  async function loadData() {
    setIsLoading(true);
    setError(null);

    try {
      // Obtener todas las salas
      const roomsData = await roomService.getAll();
      setRooms(roomsData);

      if (roomsData.length > 0) {
        // Seleccionar la primera sala por defecto
        const firstRoom = await roomService.getById(roomsData[0].id);
        setSelectedRoom(firstRoom);
      } else {
        setSelectedRoom(null);
        setSections([]);
      }
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('No se pudieron cargar los datos. Verifica que el backend esté corriendo.');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadSectionsForRoom(roomId: string) {
    try {
      const sectionsData = await sectionService.getAll();
      setSections(sectionsData.filter(s => s.roomId === roomId));
    } catch (err) {
      console.error('Error cargando secciones:', err);
    }
  }

  async function handleSelectRoom(roomId: string) {
    try {
      const room = await roomService.getById(roomId);
      setSelectedRoom(room);
    } catch (err) {
      console.error('Error seleccionando sala:', err);
    }
  }

  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; roomId: string | null }>({
    isOpen: false,
    roomId: null
  });

  function confirmDeleteRoom(roomId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setDeleteConfirm({ isOpen: true, roomId });
  }

  async function handleDeleteRoom() {
    if (!deleteConfirm.roomId) return;

    const roomId = deleteConfirm.roomId;
    setDeleteConfirm({ isOpen: false, roomId: null });

    try {
      await roomService.delete(roomId);
      const newRooms = rooms.filter(r => r.id !== roomId);
      setRooms(newRooms);

      if (selectedRoom?.id === roomId) {
        if (newRooms.length > 0) {
          const firstRoom = await roomService.getById(newRooms[0].id);
          setSelectedRoom(firstRoom);
        } else {
          setSelectedRoom(null);
          setSections([]);
        }
      }
      toast.success('Espacio eliminado correctamente');
    } catch (err) {
      console.error('Error eliminando sala:', err);
      // Here we should use a Toast in the future
      toast.error('Error al eliminar el espacio de cultivo');
    }
  }

  async function handleRefresh() {
    await loadData();
    await refreshStatuses();
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-12 h-12 text-cultivo-green-500 animate-spin mb-4" />
        <p className="text-zinc-400">Cargando sala de cultivo...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Error de conexión</h1>
        <p className="text-zinc-400 mb-4 max-w-md">{error}</p>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-cultivo-green-600 hover:bg-cultivo-green-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </button>
      </div>
    );
  }

  // Empty state - No rooms configured at all
  if (!isLoading && rooms.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="Configura tu primer espacio"
        description="Crea tu primer espacio de cultivo (sala, invernadero, etc.) para comenzar."
        className="mt-8"
      >
        <CreateRoomButton onCreated={loadData} />
      </EmptyState>
    );
    // Note: We need to trigger the modal. Since the modal is inside CreateRoomButton, 
    // we'll refactor slightly to render CreateRoomButton here or expose the modal state.
    // For simplicity, let's render the button wrapper inside EmptyState or render the page normally 
    // but showing EmptyState instead of list.
  }

  return (
    <div className="space-y-8">
      {/* Header con selector de espacios */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4"
      >
        {/* Selector de espacios de cultivo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-cultivo-green-500" />
            <h2 className="text-lg font-semibold text-white">Espacios de cultivo</h2>
          </div>
          <CreateRoomButton onCreated={loadData} variant="secondary" />
        </div>

        {/* Lista de espacios como tabs/cards */}
        <div className="flex flex-wrap gap-3">
          {rooms.map((room) => (
            <motion.div
              key={room.id}
              whileHover={{ scale: 1.02 }}
              onClick={() => handleSelectRoom(room.id)}
              className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all ${selectedRoom?.id === room.id
                ? 'bg-cultivo-green-600/20 border-2 border-cultivo-green-500'
                : 'bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600'
                }`}
            >
              <Home className={`w-5 h-5 ${selectedRoom?.id === room.id ? 'text-cultivo-green-400' : 'text-zinc-400'}`} />
              <div>
                <span className={`font-medium ${selectedRoom?.id === room.id ? 'text-cultivo-green-400' : 'text-white'}`}>
                  {room.name}
                </span>
                {room.description && (
                  <p className="text-xs text-zinc-400 max-w-[200px] truncate">{room.description}</p>
                )}
              </div>
              {selectedRoom?.id === room.id && (
                <ChevronRight className="w-4 h-4 text-cultivo-green-400 ml-2" />
              )}
              {/* Botón de eliminar */}
              <button
                onClick={(e) => confirmDeleteRoom(room.id, e)}
                className="absolute -top-2 -right-2 p-1 bg-zinc-700 hover:bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                title="Eliminar espacio"
              >
                <Trash2 className="w-3 h-3 text-zinc-300" />
              </button>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Contenido del espacio seleccionado */}
      {selectedRoom && (
        <>
          {/* Header de la sala */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-zinc-700/50"
          >
            <div>
              <h1 className="text-3xl font-bold text-white">{selectedRoom.name}</h1>
              <p className="text-zinc-400 mt-1">
                {selectedRoom.description || 'Monitoreo y control de tu espacio de cultivo'}
              </p>
            </div>

            {/* Indicadores principales */}
            <div className="flex items-center gap-4">
              {/* Ubicación */}
              <div className="flex items-center gap-2 bg-zinc-800/50 px-4 py-2 rounded-xl border border-zinc-700/50">
                <MapPin className="w-5 h-5 text-cultivo-green-400" />
                <div className="flex flex-col">
                  {weather.loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
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

              {/* Temperatura */}
              <div className="flex items-center gap-2 bg-zinc-800/50 px-4 py-2 rounded-xl border border-zinc-700/50">
                <Thermometer className="w-5 h-5 text-orange-400" />
                <span className="text-xl font-bold text-white">
                  {weather.loading ? '...' : weather.temperature}°C
                </span>
              </div>

              {/* Humedad */}
              <div className="flex items-center gap-2 bg-zinc-800/50 px-4 py-2 rounded-xl border border-zinc-700/50">
                <Droplets className="w-5 h-5 text-blue-400" />
                <span className="text-xl font-bold text-white">
                  {weather.loading ? '...' : weather.humidity}%
                </span>
              </div>
            </div>
          </motion.div>

          {/* Sección de unidades de cultivo */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Tent className="w-5 h-5 text-cultivo-green-500" />
                <h2 className="text-xl font-semibold text-white">Unidades de cultivo</h2>
              </div>
              <CreateSectionButton roomId={selectedRoom.id} onCreated={() => loadSectionsForRoom(selectedRoom.id)} />
            </div>
            <p className="text-zinc-400 text-sm mb-6">
              Selecciona una unidad para ver sus detalles, dispositivos y plantas
            </p>

            {sections.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <div className="bg-zinc-800/30 rounded-xl p-12 text-center border border-zinc-700/50">
                <Tent className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Sin unidades de cultivo</h3>
                <p className="text-zinc-400 mb-4">
                  Agrega carpas o invernaderos para organizar tu cultivo
                </p>
                <CreateSectionButton roomId={selectedRoom.id} onCreated={() => loadSectionsForRoom(selectedRoom.id)} variant="primary" />
              </div>
            )}
          </motion.section>
        </>
      )}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Eliminar espacio de cultivo"
        message="¿Estás seguro de que deseas eliminar este espacio? Esta acción no se puede deshacer y eliminará todas las unidades (carpas) y dispositivos asociados."
        confirmText="Sí, eliminar"
        onConfirm={handleDeleteRoom}
        onCancel={() => setDeleteConfirm({ isOpen: false, roomId: null })}
        variant="danger"
      />
    </div>
  );
}

// Componente para crear sala/espacio de cultivo
function CreateRoomButton({ onCreated, variant = 'primary' }: { onCreated: () => void; variant?: 'primary' | 'secondary' }) {
  const [isCreating, setIsCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();

  async function handleCreate() {
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      await roomService.create({ name, description: description || undefined });
      setShowModal(false);
      setName('');
      setDescription('');
      onCreated();
      toast.success('Espacio de cultivo creado exitosamente');
    } catch (err) {
      console.error('Error creando espacio:', err);
      toast.error('Error al crear el espacio de cultivo');
    } finally {
      setIsCreating(false);
    }
  }

  const buttonClass = variant === 'primary'
    ? 'flex items-center gap-2 px-6 py-3 bg-cultivo-green-600 hover:bg-cultivo-green-700 text-white rounded-xl transition-colors'
    : 'flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors';

  return (
    <>
      <button onClick={() => setShowModal(true)} className={buttonClass}>
        <Plus className={variant === 'primary' ? 'w-5 h-5' : 'w-4 h-4'} />
        {variant === 'primary' ? 'Crear Espacio' : 'Nuevo espacio'}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-zinc-800 rounded-2xl border border-zinc-700 p-6 w-full max-w-md"
          >
            <h2 className="text-xl font-bold text-white mb-4">Nuevo Espacio de Cultivo</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Nombre <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Sala Principal, Invernadero, Terraza..."
                  className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cultivo-green-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Descripción (opcional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe el espacio..."
                  className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cultivo-green-600 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-zinc-400 hover:text-white">
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={!name.trim() || isCreating}
                className="px-4 py-2 bg-cultivo-green-600 hover:bg-cultivo-green-700 disabled:bg-zinc-700 text-white rounded-lg"
              >
                {isCreating ? 'Creando...' : 'Crear'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

// Componente para crear sección/unidad de cultivo
function CreateSectionButton({
  roomId,
  onCreated,
  variant = 'secondary'
}: {
  roomId: string;
  onCreated: () => void;
  variant?: 'primary' | 'secondary';
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    dimensions: '',
    description: '',
  });
  const { toast } = useToast();

  async function handleCreate() {
    if (!form.name.trim()) return;

    setIsCreating(true);
    try {
      await sectionService.create({
        name: form.name,
        dimensions: form.dimensions || undefined,
        description: form.description || undefined,
        roomId,
      });
      setShowModal(false);
      setForm({ name: '', dimensions: '', description: '' });
      onCreated();
      toast.success('Unidad de cultivo creada exitosamente');
    } catch (err) {
      console.error('Error creando unidad:', err);
      toast.error('Error al crear la unidad de cultivo');
    } finally {
      setIsCreating(false);
    }
  }

  const buttonClass = variant === 'primary'
    ? 'flex items-center gap-2 px-4 py-2 bg-cultivo-green-600 hover:bg-cultivo-green-700 text-white rounded-lg transition-colors'
    : 'flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors';

  return (
    <>
      <button onClick={() => setShowModal(true)} className={buttonClass}>
        <Plus className="w-4 h-4" />
        {variant === 'primary' ? 'Agregar Unidad' : 'Nueva'}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-zinc-800 rounded-2xl border border-zinc-700 p-6 w-full max-w-md"
          >
            <h2 className="text-xl font-bold text-white mb-4">Nueva Unidad de Cultivo</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Nombre <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Carpa Floración, Invernadero..."
                  className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cultivo-green-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Dimensiones (opcional)</label>
                <input
                  type="text"
                  value={form.dimensions}
                  onChange={(e) => setForm({ ...form, dimensions: e.target.value })}
                  placeholder="Ej: 120x120x200cm"
                  className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cultivo-green-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Descripción (opcional)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="Descripción de la unidad..."
                  className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cultivo-green-600 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-zinc-400 hover:text-white">
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.name.trim() || isCreating}
                className="px-4 py-2 bg-cultivo-green-600 hover:bg-cultivo-green-700 disabled:bg-zinc-700 text-white rounded-lg"
              >
                {isCreating ? 'Creando...' : 'Crear'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
