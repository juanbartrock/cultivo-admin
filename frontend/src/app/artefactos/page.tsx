'use client';

import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/DialogContext';

// ... imports

import { useState, useEffect } from 'react';
import {
  Plus,
  Wifi,
  WifiOff,
  Trash2,
  Settings,
  RotateCw,
  Loader2,
  Zap,
  Thermometer,
  Droplets,
  Wind,
  Lightbulb,
  Fan,
  Video,
  Power,
  Search,
  Check,
  X,
  Activity,
  Unplug,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { motion, AnimatePresence } from 'framer-motion';
import { deviceService } from '@/services/deviceService';
import { sectionService } from '@/services/locationService';
import {
  Device,
  ScannedDevice,
  DeviceType,
  Section,
  Connector
} from '@/types';

// Icono por tipo de dispositivo
const getDeviceIcon = (type: DeviceType) => {
  switch (type) {
    case 'LUZ': return Lightbulb;
    case 'EXTRACTOR': return Fan;
    case 'VENTILADOR': return Wind;
    case 'HUMIDIFICADOR': return Droplets;
    case 'DESHUMIDIFICADOR': return Droplets;
    case 'AIRE_ACONDICIONADO': return Thermometer;
    case 'BOMBA_RIEGO': return Droplets;
    case 'CALEFACTOR': return Thermometer;
    case 'CAMARA': return Video;
    default: return Zap;
  }
};

export default function ArtefactosPage() {
  const { toast } = useToast();
  const confirm = useConfirm();

  const [devices, setDevices] = useState<Device[]>([]);
  const [scannedDevices, setScannedDevices] = useState<ScannedDevice[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const [showAsignarModal, setShowAsignarModal] = useState(false);
  const [dispositivoSeleccionado, setDispositivoSeleccionado] = useState<ScannedDevice | null>(null);

  const [asignacionForm, setAsignacionForm] = useState<{
    nombre: string;
    tipo: DeviceType;
    sectionId: string;
  }>({
    nombre: '',
    tipo: 'SENSOR',
    sectionId: '',
  });

  // Estado para dispositivos virtuales
  const [showVirtualModal, setShowVirtualModal] = useState(false);
  const [virtualForm, setVirtualForm] = useState({
    name: '',
    type: 'SENSOR' as DeviceType,
    sectionId: '',
    controlledByDeviceId: '',
  });
  const [isCreatingVirtual, setIsCreatingVirtual] = useState(false);

  // Estado para control manual
  const [controllingDevice, setControllingDevice] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<DeviceType | 'ALL'>('ALL');

  // Helpers faltantes
  const deviceTypeLabels: Record<DeviceType, string> = {
    SENSOR: 'Sensor',
    LUZ: 'Luz',
    EXTRACTOR: 'Extractor',
    VENTILADOR: 'Ventilador',
    HUMIDIFICADOR: 'Humidificador',
    DESHUMIDIFICADOR: 'Deshumidificador',
    AIRE_ACONDICIONADO: 'Aire Acondicionado',
    BOMBA_RIEGO: 'Bomba de Riego',
    CALEFACTOR: 'Calefactor',
    CAMARA: 'Cámara',
  };

  const conectorColors: Record<Connector, string> = {
    TUYA: 'text-orange-400',
    SONOFF: 'text-blue-500',
    TAPO: 'text-cyan-400',
    VIRTUAL: 'text-purple-400',
    ESP32: 'text-yellow-400',
  };

  const iconMap: Record<DeviceType, any> = {
    SENSOR: Activity,
    LUZ: Lightbulb,
    EXTRACTOR: Fan,
    VENTILADOR: Wind,
    HUMIDIFICADOR: Droplets,
    DESHUMIDIFICADOR: Droplets,
    AIRE_ACONDICIONADO: Thermometer,
    BOMBA_RIEGO: Droplets,
    CALEFACTOR: Thermometer,
    CAMARA: Video,
  };

  const [scanResult, setScanResult] = useState<{
    dispositivos: ScannedDevice[];
    errores: { conector: string; error: string }[];
    timestamp: string;
  } | null>(null);

  // Derived variables
  const isLoadingDevices = isLoading;

  const devicesFiltrados = devices.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.connector.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterTipo === 'ALL' || d.type === filterTipo;
    return matchesSearch && matchesType;
  });

  const controllableDevices = devices.filter(d =>
    ['LUZ', 'EXTRACTOR', 'VENTILADOR', 'BOMBA_RIEGO', 'CALEFACTOR', 'HUMIDIFICADOR', 'DESHUMIDIFICADOR', 'AIRE_ACONDICIONADO'].includes(d.type)
  );

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      const [devicesData, sectionsData] = await Promise.all([
        deviceService.getAll(),
        sectionService.getAll()
      ]);
      setDevices(devicesData);
      setSections(sectionsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleScanDevices() {
    setIsScanning(true);
    setScannedDevices([]);
    try {
      const result = await deviceService.scan();
      setScannedDevices(result.dispositivos);
      setScanResult(result);

      if (result.dispositivos.length === 0) {
        toast.info('No se encontraron nuevos dispositivos');
      } else {
        toast.success(`Se encontraron ${result.dispositivos.length} dispositivos`);
      }
    } catch (error) {
      console.error('Error scanning:', error);
      toast.error('Error al escanear dispositivos');
    } finally {
      setIsScanning(false);
    }
  }

  // Filtrar dispositivos escaneados que no estén asignados
  // Nota: El backend ya debería marcar isAssigned, pero aseguramos visualmente
  const dispositivosDisponibles = scannedDevices.filter(d => !d.isAssigned);

  function handleAbrirAsignar(device: ScannedDevice) {
    setDispositivoSeleccionado(device);
    setAsignacionForm({
      nombre: device.name || '',
      tipo: 'SENSOR', // Default, debería inferirse
      sectionId: sections[0]?.id || '',
    });
    setShowAsignarModal(true);
  }

  // Asignar dispositivo a sección
  async function handleAsignarDispositivo() {
    if (!dispositivoSeleccionado || !asignacionForm.nombre.trim() || !asignacionForm.sectionId) return;

    setIsAssigning(true);
    try {
      const newDevice = await deviceService.assign({
        connector: dispositivoSeleccionado.connector,
        externalId: dispositivoSeleccionado.id,
        sectionId: asignacionForm.sectionId,
        name: asignacionForm.nombre,
        type: asignacionForm.tipo,
      });

      setDevices([...devices, newDevice]);
      setShowAsignarModal(false);
      setDispositivoSeleccionado(null);

      // Refrescar escaneo para actualizar isAssigned
      handleScanDevices();
      toast.success('Dispositivo asignado correctamente');
    } catch (error) {
      console.error('Error asignando dispositivo:', error);
      toast.error('Error al asignar dispositivo: ' + (error as Error).message);
    } finally {
      setIsAssigning(false);
    }
  }

  // Desasignar dispositivo
  async function handleDesasignar(deviceId: string) {
    const shouldDelete = await confirm({
      title: 'Desasignar dispositivo',
      message: '¿Estás seguro de desasignar este dispositivo? Dejará de estar disponible para automatizaciones.',
      variant: 'danger',
      confirmText: 'Desasignar',
    });

    if (!shouldDelete) return;

    try {
      await deviceService.delete(deviceId);
      setDevices(devices.filter(d => d.id !== deviceId));
      // Refrescar escaneo
      handleScanDevices();
      toast.success('Dispositivo desasignado');
    } catch (error) {
      console.error('Error desasignando:', error);
      toast.error('Error al desasignar: ' + (error as Error).message);
    }
  }

  // Crear dispositivo virtual
  async function handleCrearVirtual() {
    if (!virtualForm.name.trim() || !virtualForm.sectionId) return;

    setIsCreatingVirtual(true);
    try {
      // Generar un ID único para el dispositivo virtual
      const externalId = `virtual-${Date.now()}`;

      const newDevice = await deviceService.assign({
        connector: 'VIRTUAL' as Connector,
        externalId,
        sectionId: virtualForm.sectionId,
        name: virtualForm.name,
        type: virtualForm.type,
        controlledByDeviceId: virtualForm.controlledByDeviceId || undefined,
      });

      setDevices([...devices, newDevice]);
      setShowVirtualModal(false);
      setVirtualForm({
        name: '',
        type: 'EXTRACTOR',
        sectionId: '',
        controlledByDeviceId: '',
      });
      toast.success('Dispositivo virtual creado');
    } catch (error) {
      console.error('Error creando dispositivo virtual:', error);
      toast.error('Error al crear dispositivo: ' + (error as Error).message);
    } finally {
      setIsCreatingVirtual(false);
    }
  }

  // Controlar dispositivo (on/off)
  async function handleControl(deviceId: string, action: 'on' | 'off') {
    setControllingDevice(deviceId);
    try {
      await deviceService.control(deviceId, action);
      // Actualizar estado local (optimistic update)
      // En un escenario real, deberías refrescar el estado del dispositivo
      toast.success(`Dispositivo ${action === 'on' ? 'encendido' : 'apagado'}`);
    } catch (error) {
      console.error('Error controlando dispositivo:', error);
      toast.error('Error al controlar: ' + (error as Error).message);
    } finally {
      setControllingDevice(null);
    }
  }



  // A better approach: Render the header, but if list is empty, render EmptyState.
  // Let's modify the RETURN list part, not the whole component return.

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Settings className="w-8 h-8 text-cultivo-green-500" />
            Gestión de Dispositivos
          </h1>
          <p className="text-zinc-400 mt-1">
            Detecta dispositivos IoT y asígnalos a tu sistema de cultivo
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowVirtualModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Agregar Virtual
          </button>
          <button
            onClick={handleScanDevices}
            disabled={isScanning}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'Escaneando...' : 'Escanear'}
          </button>
        </div>
      </motion.div>

      {/* Panel de Dispositivos Disponibles */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-zinc-800/30 rounded-xl border border-zinc-700/50 p-4"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Wifi className="w-5 h-5 text-cultivo-green-400" />
            Dispositivos Disponibles
          </h2>
          {scanResult && (
            <span className="text-xs text-zinc-500">
              Última actualización: {new Date(scanResult.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Errores de conexión */}
        {scanResult?.errores && scanResult.errores.length > 0 && (
          <div className="mb-4 space-y-2">
            {scanResult.errores.map((err, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span className="capitalize">{err.conector}:</span>
                <span className="text-amber-300">{err.error}</span>
              </div>
            ))}
          </div>
        )}

        {/* Loading */}
        {isScanning && !scanResult && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-8 h-8 text-cultivo-green-400 animate-spin" />
            <span className="ml-3 text-zinc-400">Buscando dispositivos...</span>
          </div>
        )}

        {/* Lista de dispositivos disponibles */}
        {dispositivosDisponibles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {dispositivosDisponibles.map((dispositivo, index) => (
              <motion.div
                key={dispositivo.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="bg-zinc-800/50 rounded-lg border border-zinc-700/50 p-4 hover:border-cultivo-green-600/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {dispositivo.online ? (
                      <Wifi className="w-4 h-4 text-cultivo-green-400" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-zinc-500" />
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded border ${conectorColors[dispositivo.connector]}`}>
                      {dispositivo.connector}
                    </span>
                  </div>
                </div>

                <h3 className="font-medium text-white mb-1 truncate" title={dispositivo.name}>
                  {dispositivo.name}
                </h3>

                <div className="text-xs text-zinc-500 mb-3 space-y-1">
                  {dispositivo.model && <p>Modelo: {dispositivo.model}</p>}
                  {dispositivo.category && <p>Categoría: {dispositivo.category}</p>}
                  {dispositivo.ip && <p>IP: {dispositivo.ip}</p>}
                </div>

                <button
                  onClick={() => handleAbrirAsignar(dispositivo)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-cultivo-green-600 hover:bg-cultivo-green-700 text-white text-sm rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Asignar
                </button>
              </motion.div>
            ))}
          </div>
        ) : (
          !isScanning && (
            <div className="text-center py-8">
              <Activity className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
              <p className="text-zinc-500">
                {scanResult ? 'Todos los dispositivos están asignados' : 'No se detectaron dispositivos'}
              </p>
              <p className="text-xs text-zinc-600 mt-1">
                Asegurate que los servicios Sonoff, Tuya y Tapo estén corriendo
              </p>
            </div>
          )
        )}
      </motion.div>

      {/* Separador */}
      <div className="border-t border-zinc-700/50" />

      {/* Sección de Dispositivos Asignados */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Check className="w-5 h-5 text-cultivo-green-400" />
          Dispositivos Asignados ({devices.length})
        </h2>

        {/* Filtros */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 bg-zinc-800/50 rounded-lg flex items-center px-4 border border-zinc-700/50">
            <Search className="w-4 h-4 text-zinc-400 mr-2" />
            <input
              type="text"
              placeholder="Buscar dispositivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none text-white text-sm w-full focus:ring-0 py-2 placeholder-zinc-500"
            />
          </div>

          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value as DeviceType | 'ALL')}
            className="px-4 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white focus:outline-none focus:border-cultivo-green-600"
          >
            <option value="ALL">Todos los tipos</option>
            {Object.entries(deviceTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Tabla de Dispositivos */}
        <div className="bg-zinc-800/30 rounded-xl border border-zinc-700/50 overflow-hidden">
          {/* Header */}
          <div className="hidden sm:grid sm:grid-cols-6 gap-4 px-4 py-3 bg-zinc-800/50 border-b border-zinc-700/50 text-sm font-medium text-zinc-400">
            <div>Nombre</div>
            <div>Conector</div>
            <div>Tipo</div>
            <div>Sección</div>
            <div>Control</div>
            <div>Acciones</div>
          </div>

          {/* Listado */}
          {isLoadingDevices ? (
            <div className="px-4 py-12 text-center">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-3" />
              <p className="text-zinc-400">Cargando dispositivos...</p>
            </div>
          ) : devicesFiltrados.length === 0 ? (
            <div className="py-12 flex justify-center">
              <EmptyState
                icon={Unplug}
                title="No se encontraron dispositivos"
                description={searchTerm ? 'No hay dispositivos que coincidan con la búsqueda.' : 'No tienes dispositivos configurados.'}
                className="border-none bg-transparent shadow-none"
                actionLabel={!searchTerm ? "Escanear Dispositivos" : undefined}
                onAction={!searchTerm ? handleScanDevices : undefined}
              />
            </div>
          ) : (
            <div className="divide-y divide-zinc-700/50">
              {devicesFiltrados.map((device, index) => {
                const Icon = iconMap[device.type] || Activity;
                const section = sections.find(s => s.id === device.sectionId);

                return (
                  <motion.div
                    key={device.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="grid grid-cols-1 sm:grid-cols-6 gap-2 sm:gap-4 px-4 py-4 hover:bg-zinc-800/30 transition-colors"
                  >
                    {/* Nombre */}
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-zinc-700/50 rounded-lg">
                        <Icon className="w-4 h-4 text-cultivo-green-400" />
                      </div>
                      <span className="font-medium text-white">{device.name}</span>
                    </div>

                    {/* Conector */}
                    <div className="flex items-center">
                      <span className="text-sm text-zinc-400 sm:hidden mr-2">Conector:</span>
                      <span className={`text-xs px-2 py-0.5 rounded border ${conectorColors[device.connector]}`}>
                        {device.connector}
                      </span>
                    </div>

                    {/* Tipo */}
                    <div className="flex items-center">
                      <span className="text-sm text-zinc-400 sm:hidden mr-2">Tipo:</span>
                      <span className="text-zinc-300">
                        {deviceTypeLabels[device.type]}
                      </span>
                    </div>

                    {/* Sección */}
                    <div className="flex items-center">
                      <span className="text-sm text-zinc-400 sm:hidden mr-2">Sección:</span>
                      <span className="text-zinc-300">{section?.name || 'Sin asignar'}</span>
                    </div>

                    {/* Control */}
                    <div className="flex items-center gap-2">
                      {device.type !== 'SENSOR' && device.type !== 'CAMARA' ? (
                        <>
                          <button
                            onClick={() => handleControl(device.id, 'on')}
                            disabled={controllingDevice === device.id}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-cultivo-green-400 hover:bg-cultivo-green-500/10 rounded transition-colors disabled:opacity-50"
                          >
                            <Power className="w-3 h-3" /> ON
                          </button>
                          <button
                            onClick={() => handleControl(device.id, 'off')}
                            disabled={controllingDevice === device.id}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-500/10 rounded transition-colors disabled:opacity-50"
                          >
                            <Power className="w-3 h-3" /> OFF
                          </button>
                        </>
                      ) : <span className="text-zinc-500">-</span>}
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center">
                      <button
                        onClick={() => handleDesasignar(device.id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-300 hover:bg-zinc-500/10 rounded transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Contador */}
        {devices.length > 0 && (
          <p className="text-sm text-zinc-500 mt-3">
            Mostrando {devicesFiltrados.length} de {devices.length} dispositivos
          </p>
        )}
      </motion.div>

      {/* Modal de Asignación */}
      {showAsignarModal && dispositivoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-zinc-800 rounded-2xl border border-zinc-700 p-6 w-full max-w-md shadow-xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Asignar Dispositivo</h2>
              <button
                onClick={() => setShowAsignarModal(false)}
                className="p-1 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Info del dispositivo */}
            <div className="bg-zinc-900/50 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs px-2 py-0.5 rounded border ${conectorColors[dispositivoSeleccionado.connector]}`}>
                  {dispositivoSeleccionado.connector}
                </span>
                {dispositivoSeleccionado.online ? (
                  <span className="text-xs text-cultivo-green-400 flex items-center gap-1">
                    <Wifi className="w-3 h-3" /> Online
                  </span>
                ) : (
                  <span className="text-xs text-zinc-500 flex items-center gap-1">
                    <WifiOff className="w-3 h-3" /> Offline
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-400">
                ID: {dispositivoSeleccionado.id}
              </p>
            </div>

            <div className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Nombre del dispositivo <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={asignacionForm.nombre}
                  onChange={(e) => setAsignacionForm({ ...asignacionForm, nombre: e.target.value })}
                  placeholder="Ej: Sensor Flora"
                  className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cultivo-green-600"
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Tipo de dispositivo <span className="text-red-400">*</span>
                </label>
                <select
                  value={asignacionForm.tipo}
                  onChange={(e) => setAsignacionForm({ ...asignacionForm, tipo: e.target.value as DeviceType })}
                  className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-cultivo-green-600"
                >
                  {Object.entries(deviceTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Sección */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Sección <span className="text-red-400">*</span>
                </label>
                <select
                  value={asignacionForm.sectionId}
                  onChange={(e) => setAsignacionForm({ ...asignacionForm, sectionId: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-cultivo-green-600"
                >
                  <option value="">Seleccionar sección...</option>
                  {sections.map(section => (
                    <option key={section.id} value={section.id}>{section.name}</option>
                  ))}
                </select>
                {sections.length === 0 && (
                  <p className="text-xs text-amber-400 mt-1">
                    No hay secciones disponibles. Crea una desde el panel de Sala.
                  </p>
                )}
              </div>
            </div>

            {/* Botones */}
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAsignarModal(false)}
                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAsignarDispositivo}
                disabled={!asignacionForm.nombre.trim() || !asignacionForm.sectionId || isAssigning}
                className="flex items-center gap-2 px-4 py-2 bg-cultivo-green-600 hover:bg-cultivo-green-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors"
              >
                {isAssigning ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {isAssigning ? 'Asignando...' : 'Asignar'}
              </button>
            </div>
          </motion.div>
        </div>
      )
      }

      {/* Modal de Dispositivo Virtual */}
      {
        showVirtualModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowVirtualModal(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative bg-zinc-800 rounded-2xl border border-zinc-700 p-6 w-full max-w-md shadow-xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Agregar Dispositivo Virtual</h2>
                <button
                  onClick={() => setShowVirtualModal(false)}
                  className="p-1 hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              {/* Explicación */}
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 mb-4">
                <p className="text-sm text-cyan-300">
                  Los dispositivos virtuales son artefactos físicos (extractor, deshumidificador, etc.)
                  que se controlan a través de la salida de otro dispositivo (ej: un termohigrómetro Sonoff).
                </p>
              </div>

              <div className="space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Nombre del dispositivo <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={virtualForm.name}
                    onChange={(e) => setVirtualForm({ ...virtualForm, name: e.target.value })}
                    placeholder="Ej: Extractor Carpa Flora"
                    className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-600"
                  />
                </div>

                {/* Tipo */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Tipo de dispositivo <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={virtualForm.type}
                    onChange={(e) => setVirtualForm({ ...virtualForm, type: e.target.value as DeviceType })}
                    className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-cyan-600"
                  >
                    <option value="EXTRACTOR">Extractor</option>
                    <option value="DESHUMIDIFICADOR">Deshumidificador</option>
                    <option value="HUMIDIFICADOR">Humidificador</option>
                    <option value="VENTILADOR">Ventilador</option>
                    <option value="CALEFACTOR">Calefactor</option>
                    <option value="AIRE_ACONDICIONADO">Aire Acondicionado</option>
                    <option value="LUZ">Luz</option>
                    <option value="BOMBA_RIEGO">Bomba de Riego</option>
                  </select>
                </div>

                {/* Sección */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Sección <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={virtualForm.sectionId}
                    onChange={(e) => setVirtualForm({ ...virtualForm, sectionId: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-cyan-600"
                  >
                    <option value="">Seleccionar sección...</option>
                    {sections.map(section => (
                      <option key={section.id} value={section.id}>{section.name}</option>
                    ))}
                  </select>
                </div>

                {/* Dispositivo controlador */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Controlado por (opcional)
                  </label>
                  <select
                    value={virtualForm.controlledByDeviceId}
                    onChange={(e) => setVirtualForm({ ...virtualForm, controlledByDeviceId: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-cyan-600"
                  >
                    <option value="">Sin asignar (configurar después)</option>
                    {controllableDevices.map(device => (
                      <option key={device.id} value={device.id}>
                        {device.name} ({device.connector})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-zinc-500 mt-1">
                    Seleccioná el dispositivo cuya salida ON/OFF controla este artefacto
                  </p>
                </div>
              </div>

              {/* Botones */}
              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowVirtualModal(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCrearVirtual}
                  disabled={!virtualForm.name.trim() || !virtualForm.sectionId || isCreatingVirtual}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors"
                >
                  {isCreatingVirtual ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {isCreatingVirtual ? 'Creando...' : 'Crear Dispositivo'}
                </button>
              </div>
            </motion.div>
          </div>
        )
      }
    </div >
  );
}
