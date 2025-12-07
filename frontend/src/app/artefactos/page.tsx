'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Search,
  Thermometer,
  Lightbulb,
  Wind,
  Fan,
  Droplets,
  Droplet,
  Snowflake,
  Flame,
  Activity,
  X,
  Check,
  RefreshCw,
  Wifi,
  WifiOff,
  Plus,
  Unplug,
  Video,
  AlertCircle,
  Power
} from 'lucide-react';
import { deviceService, DeviceScanResult } from '@/services/deviceService';
import { sectionService } from '@/services/locationService';
import { 
  Device, 
  ScannedDevice, 
  Section,
  Connector,
  DeviceType,
  deviceTypeToTipoArtefacto,
  TipoArtefacto
} from '@/types';

// Mapa de iconos por tipo de dispositivo
const iconMap: Record<DeviceType, React.ElementType> = {
  SENSOR: Thermometer,
  LUZ: Lightbulb,
  EXTRACTOR: Wind,
  VENTILADOR: Fan,
  HUMIDIFICADOR: Droplets,
  DESHUMIDIFICADOR: Droplet,
  AIRE_ACONDICIONADO: Snowflake,
  BOMBA_RIEGO: Droplets,
  CALEFACTOR: Flame,
  CAMARA: Video,
};

// Colores para badges de conectores
const conectorColors: Record<Connector, string> = {
  SONOFF: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  TUYA: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  TAPO: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

// Labels para tipos de dispositivo
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

// Mapeo de categorías a tipos de dispositivo
function inferirTipoDispositivo(dispositivo: ScannedDevice): DeviceType {
  const nombre = dispositivo.name.toLowerCase();
  const categoria = dispositivo.category?.toLowerCase() || '';
  
  if (dispositivo.connector === 'TAPO') return 'CAMARA';
  if (categoria.includes('sensor') || nombre.includes('sensor') || nombre.includes('co2')) return 'SENSOR';
  if (categoria.includes('switch') || nombre.includes('led') || nombre.includes('luz')) return 'LUZ';
  if (nombre.includes('extractor')) return 'EXTRACTOR';
  if (nombre.includes('ventilador') || nombre.includes('fan')) return 'VENTILADOR';
  
  return 'SENSOR'; // Default
}

export default function ArtefactosPage() {
  // Estado de dispositivos escaneados
  const [scanResult, setScanResult] = useState<DeviceScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  
  // Dispositivos asignados (desde la DB)
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
  
  // Secciones disponibles para asignar
  const [sections, setSections] = useState<Section[]>([]);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  
  // Modal de asignación
  const [showAsignarModal, setShowAsignarModal] = useState(false);
  const [dispositivoSeleccionado, setDispositivoSeleccionado] = useState<ScannedDevice | null>(null);
  const [asignacionForm, setAsignacionForm] = useState({
    nombre: '',
    tipo: 'SENSOR' as DeviceType,
    sectionId: '',
  });
  const [isAssigning, setIsAssigning] = useState(false);

  // Control de dispositivo
  const [controllingDevice, setControllingDevice] = useState<string | null>(null);

  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    setIsLoadingDevices(true);
    try {
      const [devicesData, sectionsData] = await Promise.all([
        deviceService.getAll(),
        sectionService.getAll(),
      ]);
      setDevices(devicesData);
      setSections(sectionsData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setIsLoadingDevices(false);
    }
    
    // Escanear dispositivos
    handleScanDevices();
  }

  // Escanear dispositivos de los conectores
  async function handleScanDevices() {
    setIsScanning(true);
    try {
      const result = await deviceService.scan();
      setScanResult(result);
    } catch (error) {
      console.error('Error escaneando dispositivos:', error);
    } finally {
      setIsScanning(false);
    }
  }

  // Dispositivos disponibles (no asignados)
  const dispositivosDisponibles = scanResult?.dispositivos.filter(
    d => !d.isAssigned && !devices.some(dev => dev.externalId === d.id)
  ) || [];

  // Filtrar dispositivos asignados
  const devicesFiltrados = devices.filter(dev => {
    const matchSearch = dev.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = filterTipo === 'todos' || dev.type === filterTipo;
    return matchSearch && matchTipo;
  });

  // Abrir modal de asignación
  function handleAbrirAsignar(dispositivo: ScannedDevice) {
    setDispositivoSeleccionado(dispositivo);
    setAsignacionForm({
      nombre: dispositivo.name,
      tipo: inferirTipoDispositivo(dispositivo),
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
    } catch (error) {
      console.error('Error asignando dispositivo:', error);
      alert('Error al asignar dispositivo: ' + (error as Error).message);
    } finally {
      setIsAssigning(false);
    }
  }

  // Desasignar dispositivo
  async function handleDesasignar(deviceId: string) {
    if (!confirm('¿Estás seguro de desasignar este dispositivo?')) return;
    
    try {
      await deviceService.delete(deviceId);
      setDevices(devices.filter(d => d.id !== deviceId));
      // Refrescar escaneo
      handleScanDevices();
    } catch (error) {
      console.error('Error desasignando:', error);
      alert('Error al desasignar: ' + (error as Error).message);
    }
  }

  // Controlar dispositivo (on/off)
  async function handleControl(deviceId: string, action: 'on' | 'off') {
    setControllingDevice(deviceId);
    try {
      await deviceService.control(deviceId, action);
      // Actualizar estado local (optimistic update)
      // En un escenario real, deberías refrescar el estado del dispositivo
    } catch (error) {
      console.error('Error controlando dispositivo:', error);
      alert('Error al controlar: ' + (error as Error).message);
    } finally {
      setControllingDevice(null);
    }
  }

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
        
        <button
          onClick={handleScanDevices}
          disabled={isScanning}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`} />
          {isScanning ? 'Escaneando...' : 'Escanear Dispositivos'}
        </button>
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
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar dispositivos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cultivo-green-600"
            />
          </div>

          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="px-4 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white focus:outline-none focus:border-cultivo-green-600"
          >
            <option value="todos">Todos los tipos</option>
            {Object.entries(deviceTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Tabla de dispositivos */}
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

          {/* Loading */}
          {isLoadingDevices ? (
            <div className="px-4 py-12 text-center">
              <RefreshCw className="w-8 h-8 text-cultivo-green-400 animate-spin mx-auto mb-3" />
              <p className="text-zinc-400">Cargando dispositivos...</p>
            </div>
          ) : devicesFiltrados.length > 0 ? (
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
                      <button
                        onClick={() => handleControl(device.id, 'on')}
                        disabled={controllingDevice === device.id}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-cultivo-green-400 hover:bg-cultivo-green-500/10 rounded transition-colors disabled:opacity-50"
                        title="Encender"
                      >
                        <Power className="w-3 h-3" />
                        ON
                      </button>
                      <button
                        onClick={() => handleControl(device.id, 'off')}
                        disabled={controllingDevice === device.id}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-500/10 rounded transition-colors disabled:opacity-50"
                        title="Apagar"
                      >
                        <Power className="w-3 h-3" />
                        OFF
                      </button>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center">
                      <button
                        onClick={() => handleDesasignar(device.id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                        title="Desasignar"
                      >
                        <Unplug className="w-3 h-3" />
                        Desasignar
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-12 text-center">
              <Activity className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400">No hay dispositivos asignados</p>
              <p className="text-xs text-zinc-500 mt-1">
                Seleccioná dispositivos del panel superior para asignarlos
              </p>
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
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAsignarModal(false)}
          />
          
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
                  Nombre del dispositivo
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
                  Tipo de dispositivo
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
                  Sección
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
      )}
    </div>
  );
}
