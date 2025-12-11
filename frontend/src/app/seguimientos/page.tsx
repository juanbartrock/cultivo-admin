'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ClipboardList, 
  Plus, 
  Calendar, 
  Leaf, 
  Activity,
  ChevronRight,
  Droplets,
  FileText,
  Camera,
  Thermometer,
  X,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
  Flower2,
  Sprout,
  Wind,
  Archive,
  Filter,
  XCircle,
  ArrowLeft,
  MoreVertical
} from 'lucide-react';
import { cycleService, plantService, strainService } from '@/services/growService';
import { eventService, formatEventDate, getEventTypeInfo } from '@/services/eventService';
import { sectionService } from '@/services/locationService';
import HarvestSection from '@/components/HarvestSection';
import { 
  Cycle, 
  CycleWithCount,
  Plant, 
  Strain, 
  Section,
  GrowEvent,
  CycleStatus,
  PlantStage,
  PlantSex
} from '@/types';

// Componente de loading para Suspense
function SeguimientosLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <Loader2 className="w-12 h-12 text-cultivo-green-500 animate-spin mb-4" />
      <p className="text-zinc-400">Cargando ciclos...</p>
    </div>
  );
}

// Wrapper con Suspense para useSearchParams
export default function SeguimientosPage() {
  return (
    <Suspense fallback={<SeguimientosLoading />}>
      <SeguimientosContent />
    </Suspense>
  );
}

// Iconos por etapa
const stageIcons: Record<PlantStage, { icon: React.ElementType; color: string }> = {
  GERMINACION: { icon: Sprout, color: 'text-lime-400' },
  VEGETATIVO: { icon: Leaf, color: 'text-green-400' },
  PRE_FLORA: { icon: Flower2, color: 'text-pink-400' },
  FLORACION: { icon: Flower2, color: 'text-purple-400' },
  SECADO: { icon: Wind, color: 'text-orange-400' },
  CURADO: { icon: Archive, color: 'text-amber-400' },
};

const stageLabels: Record<PlantStage, string> = {
  GERMINACION: 'Germinación',
  VEGETATIVO: 'Vegetativo',
  PRE_FLORA: 'Pre-Flora',
  FLORACION: 'Floración',
  SECADO: 'Secado',
  CURADO: 'Curado',
};

const statusLabels: Record<CycleStatus, string> = {
  ACTIVE: 'Activo',
  COMPLETED: 'Completado',
  CURED: 'Curado',
};

const statusColors: Record<CycleStatus, string> = {
  ACTIVE: 'bg-cultivo-green-500/20 text-cultivo-green-400 border-cultivo-green-500/30',
  COMPLETED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  CURED: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

function SeguimientosContent() {
  const searchParams = useSearchParams();
  const plantIdFromUrl = searchParams.get('plant');
  
  // Estado principal
  const [cycles, setCycles] = useState<CycleWithCount[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<CycleWithCount | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [events, setEvents] = useState<GrowEvent[]>([]);
  const [strains, setStrains] = useState<Strain[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  
  // Estados de carga
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPlants, setIsLoadingPlants] = useState(false);
  const [isLoadingMoreEvents, setIsLoadingMoreEvents] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modales
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [showPlantModal, setShowPlantModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showStrainModal, setShowStrainModal] = useState(false);
  
  // Filtros
  const [statusFilter, setStatusFilter] = useState<CycleStatus | 'all'>('all');
  const [plantFilter, setPlantFilter] = useState<string | null>(plantIdFromUrl);
  
  // Paginación de eventos
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsPerPage] = useState(5);
  const [totalEvents, setTotalEvents] = useState(0);
  const [allEvents, setAllEvents] = useState<GrowEvent[]>([]);

  // Actualizar filtro de planta cuando cambia la URL
  useEffect(() => {
    setPlantFilter(plantIdFromUrl);
  }, [plantIdFromUrl]);

  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData();
  }, []);

  // Cargar plantas cuando se selecciona un ciclo
  useEffect(() => {
    if (selectedCycle) {
      loadCycleData(selectedCycle.id);
    }
  }, [selectedCycle?.id]);

  // Recalcular eventos paginados cuando cambia el filtro de planta o los eventos
  useEffect(() => {
    // Filtrar eventos por planta si hay filtro activo
    const filtered = plantFilter 
      ? allEvents.filter(e => e.plantId === plantFilter)
      : allEvents;
    
    setTotalEvents(filtered.length);
    
    // Mostrar la primera página de eventos filtrados
    const startIndex = 0;
    const endIndex = eventsPerPage;
    setEvents(filtered.slice(startIndex, endIndex));
    setEventsPage(1);
  }, [plantFilter, allEvents, eventsPerPage]);

  async function loadInitialData() {
    setIsLoading(true);
    setError(null);
    
    try {
      const [cyclesData, strainsData, sectionsData] = await Promise.all([
        cycleService.getAll(),
        strainService.getAll(),
        sectionService.getAll(),
      ]);
      
      setCycles(cyclesData);
      setStrains(strainsData);
      setSections(sectionsData);
      
      // Si hay un plantId en la URL, buscar la planta y seleccionar su ciclo
      if (plantIdFromUrl) {
        try {
          const plant = await plantService.getById(plantIdFromUrl);
          if (plant && plant.cycleId) {
            const plantCycle = cyclesData.find(c => c.id === plant.cycleId);
            if (plantCycle) {
              setSelectedCycle(plantCycle);
              return; // No seleccionar otro ciclo
            }
          }
        } catch (err) {
          console.error('Error buscando planta:', err);
        }
      }
      
      // Seleccionar el primer ciclo activo si existe
      const activeCycle = cyclesData.find(c => c.status === 'ACTIVE');
      if (activeCycle) {
        setSelectedCycle(activeCycle);
      }
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('No se pudieron cargar los datos. Verifica que el backend esté corriendo.');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadCycleData(cycleId: string) {
    setIsLoadingPlants(true);
    setEventsPage(1); // Resetear a la primera página
    try {
      const [plantsData, eventsData] = await Promise.all([
        plantService.getAll({ cycleId }),
        eventService.getAll({ cycleId, limit: 100 }), // Cargar muchos eventos para saber el total
      ]);
      setPlants(plantsData);
      setAllEvents(eventsData);
      // El useEffect se encargará de filtrar y paginar
    } catch (err) {
      console.error('Error cargando datos del ciclo:', err);
    } finally {
      setIsLoadingPlants(false);
    }
  }

  function loadEventsPage(page: number) {
    // Filtrar eventos por planta si hay filtro activo
    const filtered = plantFilter 
      ? allEvents.filter(e => e.plantId === plantFilter)
      : allEvents;
    
    const startIndex = (page - 1) * eventsPerPage;
    const endIndex = startIndex + eventsPerPage;
    const pageEvents = filtered.slice(startIndex, endIndex);
    setEvents(pageEvents);
    setEventsPage(page);
  }

  function handleNextPage() {
    const totalPages = Math.ceil(totalEvents / eventsPerPage);
    if (eventsPage < totalPages) {
      loadEventsPage(eventsPage + 1);
    }
  }

  function handlePreviousPage() {
    if (eventsPage > 1) {
      loadEventsPage(eventsPage - 1);
    }
  }

  async function handleStatusChange(cycleId: string, newStatus: CycleStatus) {
    try {
      const updatedCycle = await cycleService.update(cycleId, { status: newStatus });
      
      // Actualizar el ciclo en la lista
      setCycles(cycles.map(c => 
        c.id === cycleId 
          ? { ...c, status: updatedCycle.status }
          : c
      ));
      
      // Si es el ciclo seleccionado, actualizarlo también
      if (selectedCycle?.id === cycleId) {
        setSelectedCycle({ ...selectedCycle, status: updatedCycle.status });
      }
    } catch (err) {
      console.error('Error actualizando estado del ciclo:', err);
      alert('Error al actualizar el estado del ciclo');
    }
  }

  // Filtrar ciclos
  const filteredCycles = cycles.filter(c => 
    statusFilter === 'all' || c.status === statusFilter
  );

  // Calcular días del ciclo
  function getCycleDays(startDate: string): number {
    const start = new Date(startDate);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Formatear días del ciclo para mostrar
  function formatCycleDays(startDate: string): string {
    const days = getCycleDays(startDate);
    if (days < 0) return 'Programado';
    if (days === 0) return 'Hoy';
    if (days === 1) return '1 día';
    return `${days} días`;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-12 h-12 text-cultivo-green-500 animate-spin mb-4" />
        <p className="text-zinc-400">Cargando ciclos...</p>
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
          onClick={loadInitialData}
          className="flex items-center gap-2 px-4 py-2 bg-cultivo-green-600 hover:bg-cultivo-green-700 text-white rounded-lg"
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </button>
      </div>
    );
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
            <ClipboardList className="w-8 h-8 text-cultivo-green-500" />
            Ciclos
          </h1>
          <p className="text-zinc-400 mt-1">
            Gestiona tus ciclos de cultivo, plantas y registra eventos
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowStrainModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-zinc-600 hover:border-zinc-500 hover:bg-zinc-800/50 text-zinc-300 hover:text-white rounded-lg transition-colors"
          >
            <Leaf className="w-4 h-4" />
            Genéticas
          </button>
          <button
            onClick={() => setShowCycleModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cultivo-green-600 hover:bg-cultivo-green-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo Ciclo
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de Ciclos */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1"
        >
          <div className="bg-zinc-800/30 rounded-xl border border-zinc-700/50 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Ciclos</h2>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as CycleStatus | 'all')}
                className="text-xs px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-white"
              >
                <option value="all">Todos</option>
                <option value="ACTIVE">Activos</option>
                <option value="COMPLETED">Completados</option>
                <option value="CURED">Curados</option>
              </select>
            </div>

            {filteredCycles.length > 0 ? (
              <div className="space-y-2">
                {filteredCycles.map((cycle) => (
                  <CycleListItem
                    key={cycle.id}
                    cycle={cycle}
                    isSelected={selectedCycle?.id === cycle.id}
                    onSelect={() => setSelectedCycle(cycle)}
                    onStatusChange={handleStatusChange}
                    statusLabels={statusLabels}
                    statusColors={statusColors}
                    formatCycleDays={formatCycleDays}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-500 text-sm">No hay ciclos</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Panel Principal - Detalles del ciclo */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 space-y-6"
        >
          {selectedCycle ? (
            <>
              {/* Header del ciclo */}
              <div className="bg-zinc-800/30 rounded-xl border border-zinc-700/50 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-xl font-bold text-white">{selectedCycle.name}</h2>
                      <select
                        value={selectedCycle.status}
                        onChange={(e) => handleStatusChange(selectedCycle.id, e.target.value as CycleStatus)}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${statusColors[selectedCycle.status]} focus:outline-none cursor-pointer`}
                      >
                        <option value="ACTIVE">Activo</option>
                        <option value="COMPLETED">Completado</option>
                        <option value="CURED">Curado</option>
                      </select>
                    </div>
                    <p className="text-sm text-zinc-400">
                      Iniciado el {new Date(selectedCycle.startDate).toLocaleDateString('es-AR')}
                      {' • '}{formatCycleDays(selectedCycle.startDate)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowPlantModal(true)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-cultivo-green-600 hover:bg-cultivo-green-700 text-white rounded-lg"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar Planta
                    </button>
                    <button
                      onClick={() => setShowEventModal(true)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg"
                    >
                      <Plus className="w-4 h-4" />
                      Registrar Evento
                    </button>
                  </div>
                </div>

                {/* Plantas del ciclo */}
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-zinc-400 mb-3">Plantas ({plants.length})</h3>
                  
                  {isLoadingPlants ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-6 h-6 text-cultivo-green-400 animate-spin" />
                    </div>
                  ) : plants.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {plants.map((plant) => (
                        <PlantListItem 
                          key={plant.id} 
                          plant={plant}
                          stageIcons={stageIcons}
                          stageLabels={stageLabels}
                          onStageChange={(updatedPlant) => {
                            setPlants(plants.map(p => 
                              p.id === updatedPlant.id ? updatedPlant : p
                            ));
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 bg-zinc-800/30 rounded-lg">
                      <Leaf className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                      <p className="text-sm text-zinc-500">Sin plantas en este ciclo</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Eventos recientes */}
              <div className="bg-zinc-800/30 rounded-xl border border-zinc-700/50 p-4">
                {/* Botón volver a la carpa (visible solo cuando hay filtro de planta desde URL) */}
                {plantFilter && (() => {
                  const filteredPlant = plants.find(p => p.id === plantFilter);
                  const sectionId = filteredPlant?.sectionId;
                  
                  if (!sectionId) return null;
                  
                  return (
                    <a
                      href={`/sala/carpa/${sectionId}`}
                      className="inline-flex items-center gap-2 mb-4 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-700/50 rounded-lg transition-colors group"
                    >
                      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                      <span>Volver a la carpa</span>
                    </a>
                  );
                })()}
                
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    {plantFilter ? 'Historial de Planta' : 'Eventos Recientes'}
                  </h3>
                  
                  {/* Filtro por planta */}
                  <div className="flex items-center gap-2">
                    {plantFilter && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-cultivo-green-500/20 border border-cultivo-green-500/30 rounded-lg">
                        <Filter className="w-3.5 h-3.5 text-cultivo-green-400" />
                        <span className="text-sm text-cultivo-green-400">
                          {plants.find(p => p.id === plantFilter)?.tagCode || 'Planta'}
                        </span>
                        <button
                          onClick={() => {
                            setPlantFilter(null);
                            // Limpiar URL
                            window.history.replaceState({}, '', '/seguimientos');
                          }}
                          className="p-0.5 hover:bg-cultivo-green-500/30 rounded transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5 text-cultivo-green-400" />
                        </button>
                      </div>
                    )}
                    {!plantFilter && plants.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => setPlantFilter(e.target.value || null)}
                        className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-cultivo-green-600"
                      >
                        <option value="">Todas las plantas</option>
                        {plants.map(p => (
                          <option key={p.id} value={p.id}>{p.tagCode}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                
                {events.length > 0 ? (
                  <>
                    <div className="space-y-3">
                      {events.map((event) => {
                        const typeInfo = getEventTypeInfo(event.type);
                        const eventPlant = plants.find(p => p.id === event.plantId);
                        return (
                          <div
                            key={event.id}
                            className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg"
                          >
                            <div className={`p-2 rounded-lg ${typeInfo.bgColor}`}>
                              {event.type === 'RIEGO' && <Droplets className={`w-4 h-4 ${typeInfo.color}`} />}
                              {event.type === 'NOTA' && <FileText className={`w-4 h-4 ${typeInfo.color}`} />}
                              {event.type === 'FOTO' && <Camera className={`w-4 h-4 ${typeInfo.color}`} />}
                              {event.type === 'PARAMETRO_AMBIENTAL' && <Thermometer className={`w-4 h-4 ${typeInfo.color}`} />}
                              {!['RIEGO', 'NOTA', 'FOTO', 'PARAMETRO_AMBIENTAL'].includes(event.type) && (
                                <Activity className={`w-4 h-4 ${typeInfo.color}`} />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-white">{typeInfo.label}</span>
                                  {eventPlant && !plantFilter && (
                                    <span className="text-xs px-2 py-0.5 bg-zinc-700 rounded-full text-zinc-400">
                                      {eventPlant.tagCode}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-zinc-500">{formatEventDate(event.createdAt)}</span>
                              </div>
                              {event.data && (
                                <div className="mt-1 space-y-1">
                                  {/* Datos de Riego */}
                                  {event.type === 'RIEGO' && (
                                    <>
                                      <p className="text-sm text-zinc-400">
                                        {event.data.ph ? `pH: ${String(event.data.ph)}` : null}
                                        {event.data.ec ? ` • EC: ${String(event.data.ec)}` : null}
                                        {event.data.liters ? ` • ${String(event.data.liters)}L` : null}
                                      </p>
                                      {/* Nutrientes */}
                                      {event.data.nutrients && Array.isArray(event.data.nutrients) && event.data.nutrients.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                          {(event.data.nutrients as Array<{name?: string; dose?: string}>).map((nutrient, idx) => {
                                            // Manejar diferentes estructuras de datos
                                            const name = nutrient?.name || '';
                                            const dose = nutrient?.dose || '';
                                            if (!name && !dose) return null;
                                            return (
                                              <span 
                                                key={idx}
                                                className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full"
                                              >
                                                {name}{dose ? `: ${dose}` : ''}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      )}
                                      {/* Notas del riego */}
                                      {event.data.notes && (
                                        <p className="text-xs text-zinc-500 italic mt-1">
                                          &quot;{String(event.data.notes)}&quot;
                                        </p>
                                      )}
                                    </>
                                  )}
                                  {/* Nota */}
                                  {event.type === 'NOTA' && (
                                    <p className="text-sm text-zinc-400">{String(event.data.content || '')}</p>
                                  )}
                                  {/* Foto */}
                                  {event.type === 'FOTO' && (
                                    <div className="mt-2">
                                      {typeof event.data.url === 'string' && event.data.url && (
                                        <div className="relative group">
                                          <img
                                            src={event.data.url}
                                            alt={typeof event.data.caption === 'string' ? event.data.caption : 'Foto del cultivo'}
                                            className="w-full max-w-xs h-32 object-cover rounded-lg border border-zinc-700 cursor-pointer hover:border-purple-500/50 transition-colors"
                                            onClick={() => window.open(event.data.url as string, '_blank')}
                                          />
                                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                            <span className="text-white text-xs">Click para ampliar</span>
                                          </div>
                                        </div>
                                      )}
                                      {typeof event.data.caption === 'string' && event.data.caption && (
                                        <p className="text-sm text-zinc-400 mt-1 italic">
                                          &quot;{event.data.caption}&quot;
                                        </p>
                                      )}
                                    </div>
                                  )}
                                  {/* Parámetros ambientales */}
                                  {event.type === 'PARAMETRO_AMBIENTAL' && (
                                    <p className="text-sm text-zinc-400">
                                      {event.data.temperature ? `${String(event.data.temperature)}°C` : null}
                                      {event.data.humidity ? ` • ${String(event.data.humidity)}%` : null}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Controles de paginación */}
                    {totalEvents > eventsPerPage && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-700/50">
                        <div className="text-sm text-zinc-400">
                          Mostrando {((eventsPage - 1) * eventsPerPage) + 1} - {Math.min(eventsPage * eventsPerPage, totalEvents)} de {totalEvents} eventos
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handlePreviousPage}
                            disabled={eventsPage === 1}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                          >
                            <ChevronRight className="w-4 h-4 rotate-180" />
                            Anterior
                          </button>
                          <span className="text-sm text-zinc-400 px-2">
                            Página {eventsPage} de {Math.ceil(totalEvents / eventsPerPage)}
                          </span>
                          <button
                            onClick={handleNextPage}
                            disabled={eventsPage >= Math.ceil(totalEvents / eventsPerPage)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                          >
                            Siguiente
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-6 bg-zinc-800/30 rounded-lg">
                    <Activity className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                    <p className="text-zinc-500">
                      {plantFilter ? 'Sin eventos para esta planta' : 'Sin eventos registrados'}
                    </p>
                  </div>
                )}
              </div>

              {/* Sección de Cosechas */}
              <div className="bg-zinc-800/30 rounded-xl border border-zinc-700/50 p-4">
                <HarvestSection 
                  plants={plants} 
                  cycleId={selectedCycle?.id} 
                />
              </div>
            </>
          ) : (
            <div className="bg-zinc-800/30 rounded-xl border border-zinc-700/50 p-12 text-center">
              <ClipboardList className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Selecciona un ciclo</h2>
              <p className="text-zinc-400 mb-4">
                Selecciona un ciclo del panel izquierdo o crea uno nuevo
              </p>
              <button
                onClick={() => setShowCycleModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-cultivo-green-600 hover:bg-cultivo-green-700 text-white rounded-lg"
              >
                <Plus className="w-4 h-4" />
                Crear Ciclo
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Modal: Nuevo Ciclo */}
      {showCycleModal && (
        <CycleModal
          onClose={() => setShowCycleModal(false)}
          onCreated={(newCycle) => {
            // Convertir Cycle a CycleWithCount (nuevo ciclo tiene 0 plantas/eventos)
            const cycleWithCount: CycleWithCount = {
              ...newCycle,
              _count: { plants: 0, events: 0 }
            };
            setCycles([cycleWithCount, ...cycles]);
            setSelectedCycle(cycleWithCount);
            setShowCycleModal(false);
          }}
        />
      )}

      {/* Modal: Nueva Planta */}
      {showPlantModal && selectedCycle && (
        <PlantModal
          cycleId={selectedCycle.id}
          strains={strains}
          sections={sections}
          onClose={() => setShowPlantModal(false)}
          onCreated={(newPlant) => {
            setPlants([...plants, newPlant]);
            setShowPlantModal(false);
          }}
          onOpenStrainModal={() => {
            setShowPlantModal(false);
            setShowStrainModal(true);
          }}
        />
      )}

      {/* Modal: Nuevo Evento */}
      {showEventModal && selectedCycle && (
        <EventModal
          cycleId={selectedCycle.id}
          plants={plants}
          sections={sections}
          onClose={() => setShowEventModal(false)}
          onCreated={(newEvent) => {
            // Agregar el nuevo evento al inicio de todos los eventos
            const updatedAllEvents = [newEvent, ...allEvents];
            setAllEvents(updatedAllEvents);
            setTotalEvents(updatedAllEvents.length);
            
            // Si estamos en la primera página, agregar el evento a la vista actual
            if (eventsPage === 1) {
              const filtered = plantFilter 
                ? updatedAllEvents.filter(e => e.plantId === plantFilter)
                : updatedAllEvents;
              setEvents(filtered.slice(0, eventsPerPage));
            }
            
            setShowEventModal(false);
          }}
        />
      )}

      {/* Modal: Genéticas */}
      {showStrainModal && (
        <StrainModal
          strains={strains}
          onClose={() => setShowStrainModal(false)}
          onCreated={(newStrain) => {
            setStrains([...strains, newStrain]);
          }}
        />
      )}
    </div>
  );
}

// ============================================
// COMPONENTE CICLO CON CAMBIO DE ESTADO
// ============================================

function CycleListItem({
  cycle,
  isSelected,
  onSelect,
  onStatusChange,
  statusLabels,
  statusColors,
  formatCycleDays,
}: {
  cycle: CycleWithCount;
  isSelected: boolean;
  onSelect: () => void;
  onStatusChange: (cycleId: string, newStatus: CycleStatus) => void;
  statusLabels: Record<CycleStatus, string>;
  statusColors: Record<CycleStatus, string>;
  formatCycleDays: (startDate: string) => string;
}) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  const handleStatusChange = async (newStatus: CycleStatus) => {
    if (newStatus === cycle.status) {
      setShowStatusMenu(false);
      return;
    }
    
    setIsChangingStatus(true);
    try {
      await onStatusChange(cycle.id, newStatus);
      setShowStatusMenu(false);
    } catch (err) {
      console.error('Error cambiando estado:', err);
    } finally {
      setIsChangingStatus(false);
    }
  };

  return (
    <div className={`relative rounded-lg border transition-colors ${
      isSelected
        ? 'bg-cultivo-green-600/20 border-cultivo-green-600/50'
        : 'bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600'
    }`}>
      <button
        onClick={onSelect}
        className="w-full text-left p-3"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-white">{cycle.name}</span>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded border ${statusColors[cycle.status]}`}>
              {statusLabels[cycle.status]}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowStatusMenu(!showStatusMenu);
              }}
              className="p-1 hover:bg-zinc-700/50 rounded transition-colors"
              disabled={isChangingStatus}
            >
              {isChangingStatus ? (
                <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
              ) : (
                <MoreVertical className="w-3 h-3 text-zinc-400" />
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatCycleDays(cycle.startDate)}
          </span>
          <span className="flex items-center gap-1">
            <Leaf className="w-3 h-3" />
            {cycle._count?.plants || 0} planta{(cycle._count?.plants || 0) !== 1 ? 's' : ''}
          </span>
        </div>
      </button>
      
      {showStatusMenu && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowStatusMenu(false)} 
          />
          <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20 min-w-[160px] py-1">
            <div className="px-3 py-2 text-xs font-medium text-zinc-400 border-b border-zinc-700">
              Cambiar estado
            </div>
            {(Object.entries(statusLabels) as [CycleStatus, string][]).map(([status, label]) => {
              const isCurrentStatus = status === cycle.status;
              const statusColorClass = status === 'ACTIVE' ? 'bg-cultivo-green-400' 
                : status === 'COMPLETED' ? 'bg-blue-400' 
                : 'bg-amber-400';
              
              return (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={isChangingStatus}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                    isCurrentStatus 
                      ? 'bg-zinc-700/50 text-white' 
                      : 'text-zinc-300 hover:bg-zinc-700/50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${statusColorClass}`} />
                  {label}
                  {isCurrentStatus && (
                    <Check className="w-3 h-3 ml-auto text-cultivo-green-400" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// COMPONENTE PLANTA CON CAMBIO DE ETAPA
// ============================================

function PlantListItem({
  plant,
  stageIcons,
  stageLabels,
  onStageChange,
}: {
  plant: Plant;
  stageIcons: Record<PlantStage, { icon: React.ElementType; color: string }>;
  stageLabels: Record<PlantStage, string>;
  onStageChange: (plant: Plant) => void;
}) {
  const [showStageMenu, setShowStageMenu] = useState(false);
  const [isChangingStage, setIsChangingStage] = useState(false);
  
  const stageConfig = stageIcons[plant.stage];
  const StageIcon = stageConfig?.icon || Leaf;

  const handleStageChange = async (newStage: PlantStage) => {
    if (newStage === plant.stage) {
      setShowStageMenu(false);
      return;
    }
    
    setIsChangingStage(true);
    try {
      const updatedPlant = await plantService.move(plant.id, { stage: newStage });
      onStageChange(updatedPlant);
      setShowStageMenu(false);
    } catch (err) {
      console.error('Error cambiando etapa:', err);
      alert('Error al cambiar la etapa de la planta');
    } finally {
      setIsChangingStage(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
      <div className={`p-2 rounded-lg ${stageConfig?.color || 'text-cultivo-green-400'} bg-zinc-700/50`}>
        <StageIcon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">{plant.tagCode}</p>
        <p className="text-xs text-zinc-400">
          {plant.strain?.name || 'Sin genética'}
        </p>
      </div>
      
      {/* Botón de etapa con menú */}
      <div className="relative">
        <button
          onClick={() => setShowStageMenu(!showStageMenu)}
          className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg border transition-all ${
            stageConfig?.color || 'text-cultivo-green-400'
          } bg-zinc-700/30 border-zinc-600 hover:border-zinc-500`}
          disabled={isChangingStage}
        >
          {isChangingStage ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          {stageLabels[plant.stage]}
        </button>
        
        {showStageMenu && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowStageMenu(false)} 
            />
            <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20 min-w-[140px] py-1">
              {(Object.entries(stageLabels) as [PlantStage, string][]).map(([stage, label]) => {
                const config = stageIcons[stage];
                const IconComponent = config?.icon || Leaf;
                const isCurrentStage = stage === plant.stage;
                
                return (
                  <button
                    key={stage}
                    onClick={() => handleStageChange(stage)}
                    disabled={isChangingStage}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                      isCurrentStage 
                        ? 'bg-zinc-700/50 text-white' 
                        : 'text-zinc-300 hover:bg-zinc-700/50'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 ${config?.color || 'text-zinc-400'}`} />
                    {label}
                    {isCurrentStage && (
                      <Check className="w-3 h-3 ml-auto text-cultivo-green-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================
// MODALES
// ============================================

function CycleModal({ 
  onClose, 
  onCreated 
}: { 
  onClose: () => void; 
  onCreated: (cycle: Cycle) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    startDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreate() {
    if (!form.name.trim()) return;
    
    setIsCreating(true);
    try {
      const newCycle = await cycleService.create({
        name: form.name,
        startDate: form.startDate,
        notes: form.notes || undefined,
      });
      onCreated(newCycle);
    } catch (err) {
      console.error('Error creando ciclo:', err);
      alert('Error al crear el ciclo');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Modal title="Nuevo Ciclo" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Nombre</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ej: Invierno 2025"
            className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cultivo-green-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Fecha de inicio</label>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-cultivo-green-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Notas (opcional)</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cultivo-green-600 resize-none"
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-white">Cancelar</button>
        <button
          onClick={handleCreate}
          disabled={!form.name.trim() || isCreating}
          className="flex items-center gap-2 px-4 py-2 bg-cultivo-green-600 hover:bg-cultivo-green-700 disabled:bg-zinc-700 text-white rounded-lg"
        >
          {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {isCreating ? 'Creando...' : 'Crear'}
        </button>
      </div>
    </Modal>
  );
}

function PlantModal({ 
  cycleId, 
  strains, 
  sections,
  onClose, 
  onCreated,
  onOpenStrainModal
}: { 
  cycleId: string;
  strains: Strain[];
  sections: Section[];
  onClose: () => void; 
  onCreated: (plant: Plant) => void;
  onOpenStrainModal: () => void;
}) {
  const [form, setForm] = useState({
    tagCode: '',
    strainId: strains[0]?.id || '',
    sectionId: sections[0]?.id || '',
    stage: 'GERMINACION' as PlantStage,
    sex: 'FEM' as PlantSex,
    notes: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreate() {
    if (!form.tagCode.trim() || !form.strainId || !form.sectionId) return;
    
    setIsCreating(true);
    try {
      const newPlant = await plantService.create({
        tagCode: form.tagCode,
        strainId: form.strainId,
        cycleId,
        sectionId: form.sectionId,
        stage: form.stage,
        sex: form.sex,
        notes: form.notes || undefined,
      });
      onCreated(newPlant);
    } catch (err) {
      console.error('Error creando planta:', err);
      alert('Error al crear la planta');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Modal title="Nueva Planta" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Código/Tag</label>
          <input
            type="text"
            value={form.tagCode}
            onChange={(e) => setForm({ ...form, tagCode: e.target.value })}
            placeholder="Ej: BD-001"
            className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cultivo-green-600"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Genética</label>
            <div className="flex gap-2">
              <select
                value={form.strainId}
                onChange={(e) => setForm({ ...form, strainId: e.target.value })}
                className="flex-1 px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-cultivo-green-600"
              >
                {strains.length === 0 && <option value="">Sin genéticas</option>}
                {strains.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button
                type="button"
                onClick={onOpenStrainModal}
                className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
                title="Agregar genética"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {strains.length === 0 && (
              <p className="text-xs text-amber-400 mt-1">
                Debes agregar al menos una genética primero
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Sección</label>
            <select
              value={form.sectionId}
              onChange={(e) => setForm({ ...form, sectionId: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-cultivo-green-600"
            >
              {sections.length === 0 && <option value="">Sin secciones</option>}
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Etapa</label>
            <select
              value={form.stage}
              onChange={(e) => setForm({ ...form, stage: e.target.value as PlantStage })}
              className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-cultivo-green-600"
            >
              {Object.entries(stageLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Sexo</label>
            <select
              value={form.sex}
              onChange={(e) => setForm({ ...form, sex: e.target.value as PlantSex })}
              className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-cultivo-green-600"
            >
              <option value="FEM">Feminizada</option>
              <option value="REG">Regular</option>
              <option value="AUTO">Autofloreciente</option>
              <option value="UNKNOWN">Desconocido</option>
            </select>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-white">Cancelar</button>
        <button
          onClick={handleCreate}
          disabled={!form.tagCode.trim() || !form.strainId || !form.sectionId || isCreating}
          className="flex items-center gap-2 px-4 py-2 bg-cultivo-green-600 hover:bg-cultivo-green-700 disabled:bg-zinc-700 text-white rounded-lg"
        >
          {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {isCreating ? 'Creando...' : 'Crear'}
        </button>
      </div>
    </Modal>
  );
}

function EventModal({ 
  cycleId, 
  plants,
  sections,
  onClose, 
  onCreated 
}: { 
  cycleId: string;
  plants: Plant[];
  sections: Section[];
  onClose: () => void; 
  onCreated: (event: GrowEvent) => void;
}) {
  const [eventType, setEventType] = useState<'water' | 'note' | 'environment' | 'photo'>('water');
  const [form, setForm] = useState({
    sectionId: sections[0]?.id || '',
    // Riego
    ph: '',
    ec: '',
    liters: '',
    // Nota
    content: '',
    // Ambiente
    temperature: '',
    humidity: '',
    // Foto
    caption: '',
  });
  // Selección múltiple de plantas
  const [selectedPlantIds, setSelectedPlantIds] = useState<string[]>([]);
  const [applyToCycle, setApplyToCycle] = useState(false); // Si true, no se asocia a plantas específicas
  
  const [isCreating, setIsCreating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Limpiar preview URL cuando cambia el tipo de evento o se cierra el modal
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Crear preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  // Limpiar archivo seleccionado
  const clearFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  // Toggle planta seleccionada
  const togglePlant = (plantId: string) => {
    setSelectedPlantIds(prev => 
      prev.includes(plantId) 
        ? prev.filter(id => id !== plantId)
        : [...prev, plantId]
    );
    // Si se selecciona alguna planta, desactivar "aplicar a todo el ciclo"
    if (!selectedPlantIds.includes(plantId)) {
      setApplyToCycle(false);
    }
  };

  // Seleccionar/deseleccionar todas
  const toggleAllPlants = () => {
    if (selectedPlantIds.length === plants.length) {
      setSelectedPlantIds([]);
    } else {
      setSelectedPlantIds(plants.map(p => p.id));
      setApplyToCycle(false);
    }
  };

  async function handleCreate() {
    setIsCreating(true);
    try {
      const baseEventData = {
        cycleId,
        sectionId: form.sectionId || undefined,
      };

      // Determinar los plantIds a usar
      const plantIdsToUse = applyToCycle ? [undefined] : (selectedPlantIds.length > 0 ? selectedPlantIds : [undefined]);
      
      let lastEvent: GrowEvent | null = null;
      let createdCount = 0;

      for (const plantId of plantIdsToUse) {
        const eventData = {
          ...baseEventData,
          plantId: plantId,
        };

        if (eventType === 'water') {
          lastEvent = await eventService.createWaterEvent({
            ...eventData,
            ph: form.ph ? parseFloat(form.ph) : undefined,
            ec: form.ec ? parseFloat(form.ec) : undefined,
            liters: form.liters ? parseFloat(form.liters) : undefined,
          });
        } else if (eventType === 'note') {
          lastEvent = await eventService.createNoteEvent({
            ...eventData,
            content: form.content,
          });
        } else if (eventType === 'photo') {
          if (!selectedFile) {
            alert('Debes seleccionar una imagen');
            setIsCreating(false);
            return;
          }
          lastEvent = await eventService.createPhotoEvent({
            ...eventData,
            caption: form.caption || undefined,
          }, selectedFile);
        } else {
          lastEvent = await eventService.createEnvironmentEvent({
            ...eventData,
            temperature: form.temperature ? parseFloat(form.temperature) : undefined,
            humidity: form.humidity ? parseFloat(form.humidity) : undefined,
          });
        }
        createdCount++;
      }
      
      // Limpiar preview antes de cerrar
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      
      if (lastEvent) {
        // Mostrar notificación si se crearon múltiples eventos
        if (createdCount > 1) {
          alert(`Se crearon ${createdCount} eventos (uno por cada planta seleccionada)`);
        }
        onCreated(lastEvent);
      }
    } catch (err) {
      console.error('Error creando evento:', err);
      alert('Error al crear el evento');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Modal title="Registrar Evento" onClose={onClose}>
      <div className="space-y-4">
        {/* Tipo de evento */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => setEventType('water')}
            className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg border transition-colors ${
              eventType === 'water' 
                ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' 
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
          >
            <Droplets className="w-4 h-4" />
            <span className="text-xs">Riego</span>
          </button>
          <button
            onClick={() => setEventType('note')}
            className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg border transition-colors ${
              eventType === 'note' 
                ? 'bg-zinc-500/20 border-zinc-500/50 text-zinc-300' 
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="text-xs">Nota</span>
          </button>
          <button
            onClick={() => setEventType('photo')}
            className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg border transition-colors ${
              eventType === 'photo' 
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' 
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span className="text-xs">Foto</span>
          </button>
          <button
            onClick={() => setEventType('environment')}
            className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg border transition-colors ${
              eventType === 'environment' 
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' 
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
          >
            <Thermometer className="w-4 h-4" />
            <span className="text-xs">Ambiente</span>
          </button>
        </div>

        {/* Selección de plantas */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-zinc-300">
              Plantas <span className="text-zinc-500">(puedes seleccionar varias)</span>
            </label>
            {plants.length > 0 && (
              <button
                type="button"
                onClick={toggleAllPlants}
                className="text-xs text-cultivo-green-400 hover:text-cultivo-green-300"
              >
                {selectedPlantIds.length === plants.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
              </button>
            )}
          </div>
          
          {/* Opción: Aplicar a todo el ciclo */}
          <label
            className={`flex items-center gap-3 p-2 mb-2 rounded-lg cursor-pointer transition-colors border ${
              applyToCycle
                ? 'bg-blue-500/20 border-blue-500/30'
                : 'bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600'
            }`}
          >
            <input
              type="checkbox"
              checked={applyToCycle}
              onChange={(e) => {
                setApplyToCycle(e.target.checked);
                if (e.target.checked) {
                  setSelectedPlantIds([]);
                }
              }}
              className="w-4 h-4 rounded border-zinc-600 text-blue-600 focus:ring-blue-500 bg-zinc-700"
            />
            <div className="flex-1">
              <span className="text-sm text-white">Aplicar a todo el ciclo</span>
              <p className="text-xs text-zinc-500">Sin asociar a plantas específicas</p>
            </div>
          </label>

          {/* Lista de plantas con checkboxes */}
          {plants.length > 0 ? (
            <div className="max-h-40 overflow-y-auto bg-zinc-800/30 rounded-lg p-2 space-y-1">
              {plants.map((plant) => (
                <label
                  key={plant.id}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedPlantIds.includes(plant.id)
                      ? 'bg-cultivo-green-500/20 border border-cultivo-green-500/30'
                      : 'hover:bg-zinc-700/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedPlantIds.includes(plant.id)}
                    onChange={() => togglePlant(plant.id)}
                    disabled={applyToCycle}
                    className="w-4 h-4 rounded border-zinc-600 text-cultivo-green-600 focus:ring-cultivo-green-500 bg-zinc-700 disabled:opacity-50"
                  />
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm ${applyToCycle ? 'text-zinc-500' : 'text-white'}`}>
                      {plant.tagCode}
                    </span>
                    <span className="text-xs text-zinc-500 ml-2">
                      {plant.strain?.name || 'Sin genética'}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <div className="bg-zinc-800/30 rounded-lg p-3 text-center">
              <p className="text-sm text-zinc-500">No hay plantas en este ciclo</p>
            </div>
          )}
          
          {/* Resumen de selección */}
          {selectedPlantIds.length > 0 && (
            <p className="text-xs text-cultivo-green-400 mt-2">
              {selectedPlantIds.length} planta{selectedPlantIds.length > 1 ? 's' : ''} seleccionada{selectedPlantIds.length > 1 ? 's' : ''} 
              {selectedPlantIds.length > 1 && ' - Se creará un evento para cada una'}
            </p>
          )}
        </div>

        {/* Sección */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Sección</label>
          <select
            value={form.sectionId}
            onChange={(e) => setForm({ ...form, sectionId: e.target.value })}
            className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-cultivo-green-600"
          >
            <option value="">Sin sección</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {/* Campos específicos por tipo */}
        {eventType === 'water' && (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">pH</label>
              <input
                type="number"
                step="0.1"
                value={form.ph}
                onChange={(e) => setForm({ ...form, ph: e.target.value })}
                placeholder="6.5"
                className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cultivo-green-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">EC</label>
              <input
                type="number"
                step="0.1"
                value={form.ec}
                onChange={(e) => setForm({ ...form, ec: e.target.value })}
                placeholder="1.2"
                className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cultivo-green-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Litros</label>
              <input
                type="number"
                step="0.5"
                value={form.liters}
                onChange={(e) => setForm({ ...form, liters: e.target.value })}
                placeholder="2"
                className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cultivo-green-600"
              />
            </div>
          </div>
        )}

        {eventType === 'note' && (
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Nota</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={4}
              placeholder="Escribe tu nota aquí..."
              className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cultivo-green-600 resize-none"
            />
          </div>
        )}

        {eventType === 'environment' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Temperatura (°C)</label>
              <input
                type="number"
                step="0.1"
                value={form.temperature}
                onChange={(e) => setForm({ ...form, temperature: e.target.value })}
                placeholder="25"
                className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cultivo-green-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Humedad (%)</label>
              <input
                type="number"
                step="1"
                value={form.humidity}
                onChange={(e) => setForm({ ...form, humidity: e.target.value })}
                placeholder="60"
                className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cultivo-green-600"
              />
            </div>
          </div>
        )}

        {eventType === 'photo' && (
          <div className="space-y-4">
            {/* Selector de archivo */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Imagen</label>
              {!selectedFile ? (
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-zinc-600 rounded-lg cursor-pointer hover:border-purple-500/50 hover:bg-zinc-800/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Camera className="w-10 h-10 text-zinc-500 mb-3" />
                    <p className="mb-2 text-sm text-zinc-400">
                      <span className="font-semibold text-purple-400">Haz clic para subir</span> o arrastra una imagen
                    </p>
                    <p className="text-xs text-zinc-500">PNG, JPG, GIF o WEBP (máx. 10MB)</p>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="relative">
                  {/* Preview de la imagen */}
                  <div className="relative w-full h-48 bg-zinc-800 rounded-lg overflow-hidden">
                    {previewUrl && (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                  {/* Info del archivo y botón de eliminar */}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-zinc-400 truncate max-w-[200px]">
                        {selectedFile.name}
                      </span>
                      <span className="text-xs text-zinc-500">
                        ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={clearFile}
                      className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Eliminar imagen"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Caption/Descripción */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Descripción (opcional)</label>
              <input
                type="text"
                value={form.caption}
                onChange={(e) => setForm({ ...form, caption: e.target.value })}
                placeholder="Ej: Semana 3 de floración"
                className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cultivo-green-600"
              />
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-white">Cancelar</button>
        <button
          onClick={handleCreate}
          disabled={isCreating || (eventType === 'note' && !form.content.trim()) || (eventType === 'photo' && !selectedFile)}
          className="flex items-center gap-2 px-4 py-2 bg-cultivo-green-600 hover:bg-cultivo-green-700 disabled:bg-zinc-700 text-white rounded-lg"
        >
          {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {isCreating 
            ? 'Guardando...' 
            : selectedPlantIds.length > 1 
              ? `Guardar (${selectedPlantIds.length} eventos)` 
              : 'Guardar'
          }
        </button>
      </div>
    </Modal>
  );
}

function StrainModal({ 
  strains,
  onClose, 
  onCreated 
}: { 
  strains: Strain[];
  onClose: () => void; 
  onCreated: (strain: Strain) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    breeder: '',
    type: 'HYBRID' as const,
    floweringDays: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreate() {
    if (!form.name.trim()) return;
    
    setIsCreating(true);
    try {
      const newStrain = await strainService.create({
        name: form.name,
        breeder: form.breeder || undefined,
        type: form.type,
        floweringDaysExpected: form.floweringDays ? parseInt(form.floweringDays) : undefined,
      });
      onCreated(newStrain);
      setForm({ name: '', breeder: '', type: 'HYBRID', floweringDays: '' });
    } catch (err) {
      console.error('Error creando genética:', err);
      alert('Error al crear la genética');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Modal title="Genéticas" onClose={onClose} size="lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lista de genéticas existentes */}
        <div>
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Genéticas registradas</h3>
          {strains.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {strains.map(strain => (
                <div key={strain.id} className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="font-medium text-white">{strain.name}</p>
                  <p className="text-xs text-zinc-400">
                    {strain.breeder && `${strain.breeder} • `}
                    {strain.type}
                    {strain.floweringDaysExpected && ` • ${strain.floweringDaysExpected} días`}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-zinc-800/30 rounded-lg">
              <Leaf className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-500">Sin genéticas</p>
            </div>
          )}
        </div>

        {/* Formulario nueva genética */}
        <div>
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Agregar nueva</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nombre de la genética"
              className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cultivo-green-600"
            />
            <input
              type="text"
              value={form.breeder}
              onChange={(e) => setForm({ ...form, breeder: e.target.value })}
              placeholder="Breeder (opcional)"
              className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cultivo-green-600"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}
                className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-cultivo-green-600"
              >
                <option value="SATIVA">Sativa</option>
                <option value="INDICA">Indica</option>
                <option value="HYBRID">Híbrido</option>
                <option value="RUDERALIS">Ruderalis</option>
              </select>
              <input
                type="number"
                value={form.floweringDays}
                onChange={(e) => setForm({ ...form, floweringDays: e.target.value })}
                placeholder="Días flora"
                className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cultivo-green-600"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={!form.name.trim() || isCreating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cultivo-green-600 hover:bg-cultivo-green-700 disabled:bg-zinc-700 text-white rounded-lg"
            >
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {isCreating ? 'Agregando...' : 'Agregar Genética'}
            </button>
          </div>
        </div>
      </div>
      <div className="flex justify-end mt-6">
        <button onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-white">
          Cerrar
        </button>
      </div>
    </Modal>
  );
}

// Componente Modal base
function Modal({ 
  title, 
  children, 
  onClose,
  size = 'md'
}: { 
  title: string; 
  children: React.ReactNode; 
  onClose: () => void;
  size?: 'md' | 'lg';
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative bg-zinc-800 rounded-2xl border border-zinc-700 p-6 w-full shadow-xl ${
          size === 'lg' ? 'max-w-2xl' : 'max-w-md'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}
