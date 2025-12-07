'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Leaf, 
  AlertCircle, 
  Flower2, 
  Sprout, 
  Wind, 
  TreeDeciduous,
  Loader2,
  RefreshCw,
  ArrowLeft,
  Gauge,
  Power,
  Video,
  Thermometer,
  X,
  Droplets,
  FileText,
  Check,
  Beaker,
  Upload,
  Plus,
  Link2,
  Calendar,
  Trash2,
  Shield,
  Camera,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Link from 'next/link';
import DeviceControlCard from '@/components/DeviceControlCard';
import EnvironmentPanel from '@/components/EnvironmentPanel';
import PlantCard from '@/components/PlantCard';
import FeedingPlanCard from '@/components/FeedingPlanCard';
import FeedingPlanUpload from '@/components/FeedingPlanUpload';
import PreventionPlanCard from '@/components/PreventionPlanCard';
import PreventionPlanUpload from '@/components/PreventionPlanUpload';
import { sectionService } from '@/services/locationService';
import { feedingPlanService } from '@/services/feedingPlanService';
import { preventionPlanService } from '@/services/preventionPlanService';
import { useDevicesStatus } from '@/hooks/useDeviceStatus';
import { SectionDashboard, Device, DeviceType, DeviceStatus, Plant, GrowEvent, SectionFeedingPlansResponse, FeedingPlan, FeedingPlanWithCount, PlantStage, SectionPreventionPlansResponse, PreventionPlanWithCount } from '@/types';
import { eventService } from '@/services/eventService';

// Iconos según el nombre de la sección
const sectionIcons: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  'flora': { icon: Flower2, color: 'text-purple-400', bg: 'bg-purple-500/20' },
  'floración': { icon: Flower2, color: 'text-purple-400', bg: 'bg-purple-500/20' },
  'vege': { icon: Sprout, color: 'text-green-400', bg: 'bg-green-500/20' },
  'vegetativo': { icon: Sprout, color: 'text-green-400', bg: 'bg-green-500/20' },
  'secado': { icon: Wind, color: 'text-orange-400', bg: 'bg-orange-500/20' },
  'invernadero': { icon: TreeDeciduous, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
};

function getSectionIcon(sectionName: string) {
  const nameLower = sectionName.toLowerCase();
  for (const [key, config] of Object.entries(sectionIcons)) {
    if (nameLower.includes(key)) {
      return config;
    }
  }
  return { icon: Leaf, color: 'text-cultivo-green-400', bg: 'bg-cultivo-green-500/20' };
}

// Agrupar dispositivos por categoría
function groupDevicesByCategory(devices: Device[]) {
  const sensors: Device[] = [];
  const controllables: Device[] = [];
  const cameras: Device[] = [];

  const controllableTypes: DeviceType[] = [
    'LUZ', 'EXTRACTOR', 'VENTILADOR', 'HUMIDIFICADOR', 
    'DESHUMIDIFICADOR', 'AIRE_ACONDICIONADO', 'BOMBA_RIEGO', 'CALEFACTOR'
  ];

  devices.forEach(device => {
    if (device.type === 'SENSOR') {
      sensors.push(device);
    } else if (device.type === 'CAMARA') {
      cameras.push(device);
    } else if (controllableTypes.includes(device.type)) {
      controllables.push(device);
    }
  });

  return { sensors, controllables, cameras };
}

// Modal simple reutilizable
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 rounded-xl border border-zinc-700 w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </motion.div>
    </div>
  );
}

// Tipo para producto con estado de checkbox
interface ProductWithCheck {
  name: string;
  dose: string;
  unit: string;
  checked: boolean;
}

// Tipo para productos del plan de prevención con estado de checkbox
interface PreventionProductWithCheck {
  name: string;
  dose: string;
  unit: string;
  checked: boolean;
}

// Modal para registrar evento de una planta
function PlantEventModal({ 
  plant,
  sectionId,
  availablePlants = [],
  feedingPlanInfo,
  preventionPlanInfo,
  onClose, 
  onCreated 
}: { 
  plant: Plant;
  sectionId: string;
  availablePlants?: Plant[];
  feedingPlanInfo?: {
    planName: string;
    currentWeek: number;
    weekData: {
      ph?: number;
      ec?: number;
      products: { name: string; dose: string; unit: string }[];
    } | null;
  };
  preventionPlanInfo?: {
    planName: string;
    currentDay: number;
    applicationData: {
      dayNumber: number;
      products: { name: string; dose: string; unit: string }[];
      applicationType?: string;
      target?: string;
      notes?: string;
    } | null;
  };
  onClose: () => void; 
  onCreated: (event: GrowEvent) => void;
}) {
  const [eventType, setEventType] = useState<'water' | 'note' | 'environment' | 'photo' | 'prevention'>('water');
  
  // Inicializar valores del formulario con los del plan si existen
  const [form, setForm] = useState({
    ph: feedingPlanInfo?.weekData?.ph?.toString() || '',
    ec: feedingPlanInfo?.weekData?.ec?.toString() || '',
    liters: '',
    content: '',
    temperature: '',
    humidity: '',
    notes: '',
    caption: '',
  });
  
  // Estado para los productos del plan (con checkbox)
  const [products, setProducts] = useState<ProductWithCheck[]>(
    feedingPlanInfo?.weekData?.products.map(p => ({ ...p, checked: true })) || []
  );

  // Estado para los productos del plan de prevención (con checkbox)
  const [preventionProducts, setPreventionProducts] = useState<PreventionProductWithCheck[]>(
    preventionPlanInfo?.applicationData?.products.map(p => ({ ...p, checked: true })) || []
  );
  
  const [isCreating, setIsCreating] = useState(false);
  
  // Estado para plantas adicionales seleccionadas
  const [additionalPlantIds, setAdditionalPlantIds] = useState<string[]>([]);
  const [showPlantSelector, setShowPlantSelector] = useState(false);
  
  // Plantas disponibles para agregar (excluyendo la planta principal)
  const otherPlants = availablePlants.filter(p => p.id !== plant.id);
  
  // Toggle planta adicional
  const toggleAdditionalPlant = (plantId: string) => {
    setAdditionalPlantIds(prev => 
      prev.includes(plantId) 
        ? prev.filter(id => id !== plantId)
        : [...prev, plantId]
    );
  };
  
  // Seleccionar/deseleccionar todas las plantas adicionales
  const toggleAllAdditionalPlants = () => {
    if (additionalPlantIds.length === otherPlants.length) {
      setAdditionalPlantIds([]);
    } else {
      setAdditionalPlantIds(otherPlants.map(p => p.id));
    }
  };

  // Estado para foto
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Manejar cambio de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
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

  // Togglear producto
  const toggleProduct = (index: number) => {
    setProducts(prev => prev.map((p, i) => 
      i === index ? { ...p, checked: !p.checked } : p
    ));
  };

  // Actualizar dosis de un producto
  const updateProductDose = (index: number, dose: string) => {
    setProducts(prev => prev.map((p, i) => 
      i === index ? { ...p, dose } : p
    ));
  };

  // Togglear producto de prevención
  const togglePreventionProduct = (index: number) => {
    setPreventionProducts(prev => prev.map((p, i) => 
      i === index ? { ...p, checked: !p.checked } : p
    ));
  };

  // Actualizar dosis de un producto de prevención
  const updatePreventionProductDose = (index: number, dose: string) => {
    setPreventionProducts(prev => prev.map((p, i) => 
      i === index ? { ...p, dose } : p
    ));
  };

  async function handleCreate() {
    setIsCreating(true);
    try {
      // Lista de plantIds a procesar (planta principal + adicionales)
      const allPlantIds = [plant.id, ...additionalPlantIds];
      let lastEvent: GrowEvent | null = null;
      let createdCount = 0;

      for (const plantId of allPlantIds) {
        const baseData = {
          cycleId: plant.cycleId,
          plantId,
          sectionId,
        };

        if (eventType === 'water') {
          // Filtrar solo productos marcados e incluir unidad en la dosis
          const selectedProducts = products
            .filter(p => p.checked)
            .map(p => ({ name: p.name, dose: `${p.dose} ${p.unit}` }));
          
          lastEvent = await eventService.createWaterEvent({
            ...baseData,
            ph: form.ph ? parseFloat(form.ph) : undefined,
            ec: form.ec ? parseFloat(form.ec) : undefined,
            liters: form.liters ? parseFloat(form.liters) : undefined,
            nutrients: selectedProducts.length > 0 ? selectedProducts : undefined,
            notes: form.notes || undefined,
          });
        } else if (eventType === 'note') {
          lastEvent = await eventService.createNoteEvent({
            ...baseData,
            content: form.content,
          });
        } else if (eventType === 'photo') {
          if (!selectedFile) {
            alert('Debes seleccionar una imagen');
            setIsCreating(false);
            return;
          }
          lastEvent = await eventService.createPhotoEvent({
            ...baseData,
            caption: form.caption || undefined,
          }, selectedFile);
        } else if (eventType === 'prevention') {
          // Evento de prevención - se registra como nota con datos estructurados
          const selectedPreventionProducts = preventionProducts
            .filter(p => p.checked)
            .map(p => ({ name: p.name, dose: `${p.dose} ${p.unit}` }));
          
          const preventionContent = `🛡️ Mantenimiento Preventivo - ${preventionPlanInfo?.planName || 'Sin plan'}\n` +
            `Día ${preventionPlanInfo?.currentDay || 0}\n` +
            `Tipo: ${preventionPlanInfo?.applicationData?.applicationType || 'Preventivo'}\n` +
            `Objetivo: ${preventionPlanInfo?.applicationData?.target || 'General'}\n` +
            `Productos aplicados:\n${selectedPreventionProducts.map(p => `  - ${p.name}: ${p.dose}`).join('\n')}` +
            (form.notes ? `\nNotas: ${form.notes}` : '');
          
          lastEvent = await eventService.createNoteEvent({
            ...baseData,
            content: preventionContent,
          });
        } else {
          lastEvent = await eventService.createEnvironmentEvent({
            ...baseData,
            temperature: form.temperature ? parseFloat(form.temperature) : undefined,
            humidity: form.humidity ? parseFloat(form.humidity) : undefined,
          });
        }
        createdCount++;
      }
      
      // Limpiar preview
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      
      if (lastEvent) {
        // Mostrar notificación si se crearon múltiples eventos
        if (createdCount > 1) {
          alert(`Se crearon ${createdCount} eventos (uno por cada planta)`);
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
    <Modal title={`Registrar Evento - ${plant.tagCode}`} onClose={onClose}>
      <div className="space-y-4">
        {/* Info de la planta y plan */}
        <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Leaf className="w-5 h-5 text-cultivo-green-400" />
            <div>
              <p className="text-white font-medium">{plant.tagCode}</p>
              <p className="text-sm text-zinc-400">{plant.strain?.name || 'Sin genética'}</p>
            </div>
          </div>
          {feedingPlanInfo && (
            <div className="text-right">
              <p className="text-xs text-cyan-400">{feedingPlanInfo.planName}</p>
              <p className="text-xs text-zinc-500">Semana {feedingPlanInfo.currentWeek}</p>
            </div>
          )}
        </div>

        {/* Selector de plantas adicionales */}
        {otherPlants.length > 0 && (
          <div className="border border-zinc-700/50 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPlantSelector(!showPlantSelector)}
              className="w-full flex items-center justify-between p-3 bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-cultivo-green-400" />
                <span className="text-sm text-zinc-300">
                  {additionalPlantIds.length > 0 
                    ? `${additionalPlantIds.length} planta${additionalPlantIds.length > 1 ? 's' : ''} adicional${additionalPlantIds.length > 1 ? 'es' : ''} seleccionada${additionalPlantIds.length > 1 ? 's' : ''}`
                    : 'Agregar más plantas al evento'
                  }
                </span>
              </div>
              {showPlantSelector ? (
                <ChevronUp className="w-4 h-4 text-zinc-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-400" />
              )}
            </button>
            
            {showPlantSelector && (
              <div className="p-3 border-t border-zinc-700/50 bg-zinc-900/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-zinc-500">Otras plantas en la sección</p>
                  <button
                    type="button"
                    onClick={toggleAllAdditionalPlants}
                    className="text-xs text-cultivo-green-400 hover:text-cultivo-green-300"
                  >
                    {additionalPlantIds.length === otherPlants.length ? 'Ninguna' : 'Todas'}
                  </button>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {otherPlants.map((p) => (
                    <label
                      key={p.id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        additionalPlantIds.includes(p.id)
                          ? 'bg-cultivo-green-500/20'
                          : 'hover:bg-zinc-800/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={additionalPlantIds.includes(p.id)}
                        onChange={() => toggleAdditionalPlant(p.id)}
                        className="w-4 h-4 rounded border-zinc-600 text-cultivo-green-600 focus:ring-cultivo-green-500 bg-zinc-700"
                      />
                      <span className="text-sm text-white">{p.tagCode}</span>
                      <span className="text-xs text-zinc-500">{p.strain?.name || 'Sin genética'}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tipo de evento */}
        <div className="grid grid-cols-5 gap-2">
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
            onClick={() => setEventType('prevention')}
            className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg border transition-colors ${
              eventType === 'prevention' 
                ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' 
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span className="text-xs">Prevención</span>
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

        {/* Campos específicos por tipo */}
        {eventType === 'water' && (
          <div className="space-y-4">
            {/* pH, EC, Litros */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  pH
                  {feedingPlanInfo?.weekData?.ph && (
                    <span className="text-cyan-400 text-xs ml-1">(plan: {feedingPlanInfo.weekData.ph})</span>
                  )}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.ph}
                  onChange={(e) => setForm({ ...form, ph: e.target.value })}
                  placeholder={feedingPlanInfo?.weekData?.ph?.toString() || "6.5"}
                  className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cultivo-green-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  EC
                  {feedingPlanInfo?.weekData?.ec && (
                    <span className="text-cyan-400 text-xs ml-1">(plan: {feedingPlanInfo.weekData.ec})</span>
                  )}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.ec}
                  onChange={(e) => setForm({ ...form, ec: e.target.value })}
                  placeholder={feedingPlanInfo?.weekData?.ec?.toString() || "1.2"}
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

            {/* Productos del plan */}
            {products.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Nutrientes del plan
                </label>
                <div className="space-y-2 bg-zinc-800/30 rounded-lg p-3">
                  {products.map((product, index) => {
                    // Calcular total si hay litros y la unidad es g/L o ml/L
                    const liters = parseFloat(form.liters) || 0;
                    const dose = parseFloat(product.dose) || 0;
                    const isPerLiter = product.unit.toLowerCase().includes('/l');
                    const total = isPerLiter && liters > 0 ? (dose * liters).toFixed(1) : null;
                    const totalUnit = product.unit.toLowerCase().includes('g/l') ? 'g' : 
                                      product.unit.toLowerCase().includes('ml/l') ? 'ml' : '';
                    
                    return (
                      <div 
                        key={index}
                        className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                          product.checked ? 'bg-cyan-500/10' : 'bg-zinc-800/50 opacity-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={product.checked}
                          onChange={() => toggleProduct(index)}
                          className="w-4 h-4 rounded border-zinc-600 text-cyan-600 focus:ring-cyan-500 bg-zinc-700"
                        />
                        <span className={`flex-1 text-sm ${product.checked ? 'text-white' : 'text-zinc-500'}`}>
                          {product.name}
                        </span>
                        <input
                          type="text"
                          value={product.dose}
                          onChange={(e) => updateProductDose(index, e.target.value)}
                          disabled={!product.checked}
                          className="w-16 px-2 py-1 text-sm bg-zinc-900/50 border border-zinc-700 rounded text-white text-center disabled:opacity-50"
                        />
                        <span className="text-xs text-zinc-500 w-10">{product.unit}</span>
                        {total && product.checked && (
                          <span className="text-xs text-cultivo-green-400 font-medium min-w-[50px] text-right">
                            = {total}{totalUnit}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notas opcionales */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Notas (opcional)</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Observaciones del riego..."
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

        {eventType === 'prevention' && (
          <div className="space-y-4">
            {/* Info del plan de prevención */}
            {preventionPlanInfo ? (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-orange-400" />
                    <span className="text-sm font-medium text-orange-400">{preventionPlanInfo.planName}</span>
                  </div>
                  <span className="text-xs text-zinc-400">Día {preventionPlanInfo.currentDay}</span>
                </div>
                {preventionPlanInfo.applicationData && (
                  <div className="mt-2 text-xs text-zinc-400">
                    <span className="px-2 py-0.5 bg-zinc-800 rounded mr-2">
                      {preventionPlanInfo.applicationData.applicationType || 'Preventivo'}
                    </span>
                    <span className="px-2 py-0.5 bg-zinc-800 rounded">
                      {preventionPlanInfo.applicationData.target || 'General'}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-center">
                <Shield className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-400">No hay plan de prevención asignado</p>
                <p className="text-xs text-zinc-500 mt-1">Puedes registrar una aplicación manual</p>
              </div>
            )}

            {/* Productos del plan de prevención */}
            {preventionProducts.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Productos a aplicar
                </label>
                <div className="space-y-2 bg-zinc-800/30 rounded-lg p-3">
                  {preventionProducts.map((product, index) => (
                    <div 
                      key={index}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                        product.checked ? 'bg-orange-500/10' : 'bg-zinc-800/50 opacity-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={product.checked}
                        onChange={() => togglePreventionProduct(index)}
                        className="w-4 h-4 rounded border-zinc-600 text-orange-600 focus:ring-orange-500 bg-zinc-700"
                      />
                      <span className={`flex-1 text-sm ${product.checked ? 'text-white' : 'text-zinc-500'}`}>
                        {product.name}
                      </span>
                      <input
                        type="text"
                        value={product.dose}
                        onChange={(e) => updatePreventionProductDose(index, e.target.value)}
                        disabled={!product.checked}
                        className="w-16 px-2 py-1 text-sm bg-zinc-900/50 border border-zinc-700 rounded text-white text-center disabled:opacity-50"
                      />
                      <span className="text-xs text-zinc-500 w-10">{product.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notas opcionales */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Notas (opcional)</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Observaciones de la aplicación..."
                className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cultivo-green-600"
              />
            </div>
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-white transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={
              isCreating || 
              (eventType === 'note' && !form.content.trim()) || 
              (eventType === 'photo' && !selectedFile)
            }
            className="flex items-center gap-2 px-4 py-2 bg-cultivo-green-600 hover:bg-cultivo-green-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isCreating 
              ? 'Creando...' 
              : additionalPlantIds.length > 0 
                ? `Registrar (${1 + additionalPlantIds.length} plantas)` 
                : 'Registrar'
            }
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function CarpaDetailPage() {
  const params = useParams();
  const sectionId = params.id as string;
  
  const [section, setSection] = useState<SectionDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedPlantForEvent, setSelectedPlantForEvent] = useState<Plant | null>(null);
  
  // Estado para planes de alimentación
  const [feedingPlans, setFeedingPlans] = useState<SectionFeedingPlansResponse | null>(null);
  const [feedingPlansLoading, setFeedingPlansLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<FeedingPlanWithCount[]>([]);
  const [showAssignModal, setShowAssignModal] = useState<{ plan: FeedingPlanWithCount; compatiblePlants: Plant[] } | null>(null);
  const [selectedPlantsForAssign, setSelectedPlantsForAssign] = useState<string[]>([]);
  const [assigningPlan, setAssigningPlan] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<FeedingPlanWithCount | null>(null);
  const [deletingPlan, setDeletingPlan] = useState(false);

  // Estado para planes de prevención
  const [preventionPlans, setPreventionPlans] = useState<SectionPreventionPlansResponse | null>(null);
  const [preventionPlansLoading, setPreventionPlansLoading] = useState(false);
  const [showPreventionUploadModal, setShowPreventionUploadModal] = useState(false);
  const [availablePreventionPlans, setAvailablePreventionPlans] = useState<PreventionPlanWithCount[]>([]);
  const [showPreventionAssignModal, setShowPreventionAssignModal] = useState<{ plan: PreventionPlanWithCount; compatiblePlants: Plant[] } | null>(null);
  const [selectedPlantsForPreventionAssign, setSelectedPlantsForPreventionAssign] = useState<string[]>([]);
  const [assigningPreventionPlan, setAssigningPreventionPlan] = useState(false);
  const [preventionPlanToDelete, setPreventionPlanToDelete] = useState<PreventionPlanWithCount | null>(null);
  const [deletingPreventionPlan, setDeletingPreventionPlan] = useState(false);

  // Estados para secciones colapsables (todas colapsadas por defecto)
  const [feedingPlanExpanded, setFeedingPlanExpanded] = useState(false);
  const [preventionPlanExpanded, setPreventionPlanExpanded] = useState(false);
  const [plantsExpanded, setPlantsExpanded] = useState(false);

  // Obtener estados de todos los dispositivos
  const devices = useMemo(() => section?.devices || [], [section?.devices]);
  const { statuses, getStatus, loading: statusLoading, refresh: refreshStatuses } = useDevicesStatus(
    devices,
    { pollingInterval: 30000, autoRefresh: true }
  );

  // Agrupar dispositivos
  const { sensors, controllables, cameras } = useMemo(
    () => groupDevicesByCategory(devices),
    [devices]
  );

  // Obtener el status del primer sensor para el panel ambiental
  const primarySensor = sensors[0];
  const primarySensorStatus = primarySensor ? getStatus(primarySensor.id) : null;

  useEffect(() => {
    loadSection();
    loadFeedingPlans();
    loadAvailablePlans();
    loadPreventionPlans();
    loadAvailablePreventionPlans();
  }, [sectionId]);

  async function loadSection() {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await sectionService.getDashboard(sectionId);
      setSection(data);
    } catch (err) {
      console.error('Error cargando sección:', err);
      setError('No se pudo cargar la sección');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadFeedingPlans() {
    setFeedingPlansLoading(true);
    try {
      const data = await feedingPlanService.getSectionFeedingPlans(sectionId);
      setFeedingPlans(data);
    } catch (err) {
      console.error('Error cargando planes de alimentación:', err);
      // No mostramos error ya que puede ser que simplemente no haya planes
    } finally {
      setFeedingPlansLoading(false);
    }
  }

  async function loadAvailablePlans() {
    try {
      const plans = await feedingPlanService.getAll();
      setAvailablePlans(plans);
    } catch (err) {
      console.error('Error cargando planes disponibles:', err);
    }
  }

  async function loadPreventionPlans() {
    setPreventionPlansLoading(true);
    try {
      const data = await preventionPlanService.getSectionPreventionPlans(sectionId);
      setPreventionPlans(data);
    } catch (err) {
      console.error('Error cargando planes de prevención:', err);
    } finally {
      setPreventionPlansLoading(false);
    }
  }

  async function loadAvailablePreventionPlans() {
    try {
      const plans = await preventionPlanService.getAll();
      setAvailablePreventionPlans(plans);
    } catch (err) {
      console.error('Error cargando planes de prevención disponibles:', err);
    }
  }

  async function handleAssignPreventionPlan(plantId: string, preventionPlanId: string, startDate: string) {
    setAssigningPreventionPlan(true);
    try {
      await preventionPlanService.assignToPlant(plantId, {
        preventionPlanId,
        startDate,
      });
      await loadPreventionPlans();
      setShowPreventionAssignModal(null);
    } catch (err) {
      console.error('Error asignando plan de prevención:', err);
      alert(err instanceof Error ? err.message : 'Error al asignar el plan');
    } finally {
      setAssigningPreventionPlan(false);
    }
  }

  async function handleDeletePreventionPlan(planId: string) {
    setDeletingPreventionPlan(true);
    try {
      await preventionPlanService.delete(planId);
      await loadAvailablePreventionPlans();
      await loadPreventionPlans();
      setPreventionPlanToDelete(null);
    } catch (err) {
      console.error('Error eliminando plan de prevención:', err);
      alert(err instanceof Error ? err.message : 'Error al eliminar el plan');
    } finally {
      setDeletingPreventionPlan(false);
    }
  }

  async function handleAssignPlan(plantId: string, feedingPlanId: string, stageStartDate: string) {
    setAssigningPlan(true);
    try {
      await feedingPlanService.assignToPlant(plantId, {
        feedingPlanId,
        stageStartDate,
      });
      // Recargar datos
      await loadFeedingPlans();
      setShowAssignModal(null);
    } catch (err) {
      console.error('Error asignando plan:', err);
      alert(err instanceof Error ? err.message : 'Error al asignar el plan');
    } finally {
      setAssigningPlan(false);
    }
  }

  async function handleDeletePlan(planId: string) {
    setDeletingPlan(true);
    try {
      await feedingPlanService.delete(planId);
      // Recargar datos
      await loadAvailablePlans();
      await loadFeedingPlans();
      setPlanToDelete(null);
    } catch (err) {
      console.error('Error eliminando plan:', err);
      alert(err instanceof Error ? err.message : 'Error al eliminar el plan');
    } finally {
      setDeletingPlan(false);
    }
  }

  async function handleUnassignFeedingPlan(plantId: string, feedingPlanId: string) {
    try {
      await feedingPlanService.unassignFromPlant(plantId, feedingPlanId);
      // Recargar datos
      await loadFeedingPlans();
      await loadAvailablePlans();
    } catch (err) {
      console.error('Error desasignando plan:', err);
      alert(err instanceof Error ? err.message : 'Error al desasignar el plan');
      throw err;
    }
  }

  async function handleUnassignPreventionPlan(plantId: string, preventionPlanId: string) {
    try {
      await preventionPlanService.unassignFromPlant(plantId, preventionPlanId);
      // Recargar datos
      await loadPreventionPlans();
      await loadAvailablePreventionPlans();
    } catch (err) {
      console.error('Error desasignando plan de prevención:', err);
      alert(err instanceof Error ? err.message : 'Error al desasignar el plan');
      throw err;
    }
  }

  const handleRefresh = useCallback(async () => {
    await loadSection();
    await refreshStatuses();
    setLastUpdate(new Date());
  }, [refreshStatuses]);

  const handleStatusChange = useCallback(() => {
    // Refrescar estados después de un cambio
    setTimeout(() => {
      refreshStatuses();
      setLastUpdate(new Date());
    }, 1000);
  }, [refreshStatuses]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-12 h-12 text-cultivo-green-500 animate-spin mb-4" />
        <p className="text-zinc-400">Cargando sección...</p>
      </div>
    );
  }

  // Error state
  if (error || !section) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">
          {error || 'Sección no encontrada'}
        </h1>
        <p className="text-zinc-400 mb-4">La sección que buscas no existe o fue eliminada.</p>
        <div className="flex gap-3">
          <Link
            href="/sala"
            className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>
          <button
            onClick={loadSection}
            className="flex items-center gap-2 px-4 py-2 bg-cultivo-green-600 hover:bg-cultivo-green-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const iconConfig = getSectionIcon(section.name);
  const IconComponent = iconConfig.icon;

  return (
    <div className="space-y-8">
      {/* Navigation & Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/sala"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a la sala
        </Link>
        
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${statusLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Header con icono */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row gap-6"
      >
        {/* Icono de la sección */}
        <div className={`relative w-full lg:w-64 h-48 lg:h-64 ${iconConfig.bg} rounded-2xl overflow-hidden border border-zinc-700/50 flex-shrink-0 flex items-center justify-center`}>
          <IconComponent className={`w-24 lg:w-32 h-24 lg:h-32 ${iconConfig.color}`} />
        </div>

        {/* Info de la sección */}
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white mb-2">{section.name}</h1>
          {section.dimensions && (
            <p className="text-lg text-cultivo-green-400 mb-4">{section.dimensions}</p>
          )}
          
          {section.description && (
            <p className="text-zinc-400 mb-4">{section.description}</p>
          )}

          {/* Stats rápidos */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-zinc-800/50 px-4 py-2 rounded-xl border border-zinc-700/50">
              <Activity className="w-4 h-4 text-cultivo-green-400" />
              <span className="text-sm text-zinc-300">
                {devices.length} dispositivos
              </span>
            </div>
            <div className="flex items-center gap-2 bg-zinc-800/50 px-4 py-2 rounded-xl border border-zinc-700/50">
              <Leaf className="w-4 h-4 text-cultivo-green-400" />
              <span className="text-sm text-zinc-300">
                {section.plants?.length || 0} plantas
              </span>
            </div>
            {sensors.length > 0 && (
              <div className="flex items-center gap-2 bg-orange-500/20 px-4 py-2 rounded-xl border border-orange-500/30">
                <Thermometer className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-orange-300">
                  {sensors.length} sensor{sensors.length > 1 ? 'es' : ''}
                </span>
              </div>
            )}
            {controllables.length > 0 && (
              <div className="flex items-center gap-2 bg-blue-500/20 px-4 py-2 rounded-xl border border-blue-500/30">
                <Power className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-blue-300">
                  {controllables.length} controlable{controllables.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
            {cameras.length > 0 && (
              <div className="flex items-center gap-2 bg-emerald-500/20 px-4 py-2 rounded-xl border border-emerald-500/30">
                <Video className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-300">
                  {cameras.length} cámara{cameras.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Resumen por etapa */}
          {section.summary?.plantsByStage && Object.keys(section.summary.plantsByStage).length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-zinc-500 mb-2">Plantas por etapa:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(section.summary.plantsByStage).map(([stage, count]) => (
                  <span
                    key={stage}
                    className="text-xs px-2 py-1 bg-zinc-800 rounded-full text-zinc-300"
                  >
                    {stage}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Panel Ambiental - Prominente si hay sensor */}
      {sensors.length > 0 && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Gauge className="w-5 h-5 text-cultivo-green-500" />
            <h2 className="text-xl font-semibold text-white">Ambiente</h2>
          </div>

          <EnvironmentPanel
            device={primarySensor}
            sensorName={primarySensor?.name}
            status={primarySensorStatus}
            loading={statusLoading}
            lastUpdate={lastUpdate || undefined}
            onRefresh={handleRefresh}
          />
        </motion.section>
      )}

      {/* Sensores adicionales */}
      {sensors.length > 1 && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Thermometer className="w-5 h-5 text-orange-400" />
            <h2 className="text-xl font-semibold text-white">Sensores</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sensors.slice(1).map((device, index) => (
              <DeviceControlCard
                key={device.id}
                device={device}
                status={getStatus(device.id)}
                loading={statusLoading}
                onStatusChange={handleStatusChange}
                delay={index}
              />
            ))}
          </div>
        </motion.section>
      )}

      {/* Dispositivos Controlables */}
      {controllables.length > 0 && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Power className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Control de Dispositivos</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {controllables.map((device, index) => (
              <DeviceControlCard
                key={device.id}
                device={device}
                status={getStatus(device.id)}
                loading={statusLoading}
                onStatusChange={handleStatusChange}
                delay={index}
              />
            ))}
          </div>
        </motion.section>
      )}

      {/* Cámaras */}
      {cameras.length > 0 && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Video className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-semibold text-white">Cámaras</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cameras.map((device, index) => (
              <DeviceControlCard
                key={device.id}
                device={device}
                status={getStatus(device.id)}
                loading={statusLoading}
                delay={index}
              />
            ))}
          </div>
        </motion.section>
      )}

      {/* Mensaje si no hay dispositivos */}
      {devices.length === 0 && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-cultivo-green-500" />
            <h2 className="text-xl font-semibold text-white">Dispositivos</h2>
          </div>

          <div className="bg-zinc-800/30 rounded-xl p-8 text-center border border-zinc-700/50">
            <Activity className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400">No hay dispositivos vinculados a esta sección</p>
            <p className="text-xs text-zinc-500 mt-1">
              Asigna dispositivos desde la página de Dispositivos
            </p>
          </div>
        </motion.section>
      )}

      {/* Planes de Alimentación */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.28 }}
        className="bg-zinc-800/30 rounded-xl border border-zinc-700/50 overflow-hidden"
      >
        <button 
          onClick={() => setFeedingPlanExpanded(!feedingPlanExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Beaker className="w-5 h-5 text-cyan-500" />
            <h2 className="text-xl font-semibold text-white">Plan de Alimentación</h2>
            {!feedingPlanExpanded && feedingPlans?.plants.some(p => p.feedingPlans.length > 0) && (
              <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full ml-2">
                {feedingPlans.plants.filter(p => p.feedingPlans.length > 0).length} plantas
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowUploadModal(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors"
            >
              <Upload className="w-4 h-4" />
              Importar
            </button>
            {feedingPlanExpanded ? (
              <ChevronUp className="w-5 h-5 text-zinc-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-zinc-400" />
            )}
          </div>
        </button>

        {feedingPlanExpanded && (
        <div className="p-4 pt-0">
        {feedingPlansLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Planes asignados a plantas - Agrupados por plan */}
            {feedingPlans && feedingPlans.plants.some(p => p.feedingPlans.length > 0) && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-zinc-400">Planes asignados</h3>
                {(() => {
                  // Agrupar plantas por planId
                  const planGroups: Record<string, { 
                    id: string; 
                    tagCode: string; 
                    strain?: { name: string }; 
                    stage: PlantStage; 
                    feedingPlan: typeof feedingPlans.plants[0]['feedingPlans'][0];
                  }[]> = {};
                  
                  feedingPlans.plants.forEach(plant => {
                    plant.feedingPlans.forEach(fp => {
                      if (!planGroups[fp.feedingPlanId]) {
                        planGroups[fp.feedingPlanId] = [];
                      }
                      planGroups[fp.feedingPlanId].push({
                        id: plant.id,
                        tagCode: plant.tagCode,
                        strain: plant.strain,
                        stage: plant.stage,
                        feedingPlan: fp,
                      });
                    });
                  });
                  
                  return Object.entries(planGroups).map(([planId, plants], index) => (
                    <FeedingPlanCard
                      key={planId}
                      plants={plants}
                      delay={index}
                      onUnassign={handleUnassignFeedingPlan}
                    />
                  ));
                })()}
              </div>
            )}

            {/* Planes disponibles */}
            {availablePlans.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-zinc-400">Planes disponibles</h3>
                <div className="grid gap-3">
                  {availablePlans.map((plan) => {
                    // Filtrar plantas que coincidan con la etapa del plan y no tengan este plan asignado
                    const compatiblePlants = section?.plants?.filter(p => 
                      p.stage === plan.stage && 
                      !feedingPlans?.plants.find(fp => fp.id === p.id)?.feedingPlans.some(f => f.feedingPlanId === plan.id)
                    ) || [];

                    return (
                      <div key={plan.id} className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-white">{plan.name}</h4>
                            <p className="text-xs text-cyan-400">{plan.stage} • {plan.weeks.length} semanas</p>
                          </div>
                          <button
                            onClick={() => setPlanToDelete(plan)}
                            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Eliminar plan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {compatiblePlants.length > 0 ? (
                          <button
                            onClick={() => {
                              setSelectedPlantsForAssign(compatiblePlants.map(p => p.id));
                              setShowAssignModal({ plan, compatiblePlants });
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors"
                          >
                            <Link2 className="w-4 h-4" />
                            Asignar a {compatiblePlants.length} planta{compatiblePlants.length > 1 ? 's' : ''}
                          </button>
                        ) : (
                          <p className="text-xs text-zinc-500">
                            {plan._count.plants > 0 
                              ? `Asignado a ${plan._count.plants} planta(s)`
                              : 'No hay plantas compatibles en esta sección'
                            }
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mensaje si no hay nada */}
            {(!feedingPlans || !feedingPlans.plants.some(p => p.feedingPlans.length > 0)) && availablePlans.length === 0 && (
              <div className="bg-zinc-800/50 rounded-xl p-8 text-center border border-zinc-700/50">
                <Beaker className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400">No hay planes de alimentación</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Importa un plan para comenzar
                </p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  Importar primer plan
                </button>
              </div>
            )}
          </div>
        )}
        </div>
        )}
      </motion.section>

      {/* Planes de Prevención */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.29 }}
        className="bg-zinc-800/30 rounded-xl border border-zinc-700/50 overflow-hidden"
      >
        <button 
          onClick={() => setPreventionPlanExpanded(!preventionPlanExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-semibold text-white">Plan de Prevención</h2>
            {!preventionPlanExpanded && preventionPlans?.plants.some(p => p.preventionPlans.length > 0) && (
              <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full ml-2">
                {preventionPlans.plants.filter(p => p.preventionPlans.length > 0).length} plantas
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPreventionUploadModal(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm transition-colors"
            >
              <Upload className="w-4 h-4" />
              Importar
            </button>
            {preventionPlanExpanded ? (
              <ChevronUp className="w-5 h-5 text-zinc-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-zinc-400" />
            )}
          </div>
        </button>

        {preventionPlanExpanded && (
        <div className="p-4 pt-0">
        {preventionPlansLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Planes asignados a plantas - Agrupados por plan */}
            {preventionPlans && preventionPlans.plants.some(p => p.preventionPlans.length > 0) && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-zinc-400">Planes asignados</h3>
                {(() => {
                  // Agrupar plantas por planId
                  const planGroups: Record<string, { 
                    id: string; 
                    tagCode: string; 
                    strain?: { name: string }; 
                    stage: PlantStage; 
                    preventionPlan: typeof preventionPlans.plants[0]['preventionPlans'][0];
                  }[]> = {};
                  
                  preventionPlans.plants.forEach(plant => {
                    plant.preventionPlans.forEach(pp => {
                      if (!planGroups[pp.preventionPlanId]) {
                        planGroups[pp.preventionPlanId] = [];
                      }
                      planGroups[pp.preventionPlanId].push({
                        id: plant.id,
                        tagCode: plant.tagCode,
                        strain: plant.strain,
                        stage: plant.stage,
                        preventionPlan: pp,
                      });
                    });
                  });
                  
                  return Object.entries(planGroups).map(([planId, plants], index) => (
                    <PreventionPlanCard
                      key={planId}
                      plants={plants}
                      delay={index}
                      onUnassign={handleUnassignPreventionPlan}
                    />
                  ));
                })()}
              </div>
            )}

            {/* Planes disponibles */}
            {availablePreventionPlans.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-zinc-400">Planes disponibles</h3>
                <div className="grid gap-3">
                  {availablePreventionPlans.map((plan) => {
                    const compatiblePlants = section?.plants?.filter(p => 
                      p.stage === plan.stage && 
                      !preventionPlans?.plants.find(pp => pp.id === p.id)?.preventionPlans.some(pr => pr.preventionPlanId === plan.id)
                    ) || [];

                    return (
                      <div key={plan.id} className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-white">{plan.name}</h4>
                            <p className="text-xs text-orange-400">{plan.stage} • {plan.totalDays} días</p>
                          </div>
                          <button
                            onClick={() => setPreventionPlanToDelete(plan)}
                            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Eliminar plan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {compatiblePlants.length > 0 ? (
                          <button
                            onClick={() => {
                              setSelectedPlantsForPreventionAssign(compatiblePlants.map(p => p.id));
                              setShowPreventionAssignModal({ plan, compatiblePlants });
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm transition-colors"
                          >
                            <Link2 className="w-4 h-4" />
                            Asignar a {compatiblePlants.length} planta{compatiblePlants.length > 1 ? 's' : ''}
                          </button>
                        ) : (
                          <p className="text-xs text-zinc-500">
                            {plan._count.plants > 0 
                              ? `Asignado a ${plan._count.plants} planta(s)`
                              : 'No hay plantas compatibles en esta sección'
                            }
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mensaje si no hay nada */}
            {(!preventionPlans || !preventionPlans.plants.some(p => p.preventionPlans.length > 0)) && availablePreventionPlans.length === 0 && (
              <div className="bg-zinc-800/50 rounded-xl p-8 text-center border border-zinc-700/50">
                <Shield className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400">No hay planes de prevención</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Importa un plan para proteger tus plantas de hongos y plagas
                </p>
                <button
                  onClick={() => setShowPreventionUploadModal(true)}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm transition-colors mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  Importar primer plan
                </button>
              </div>
            )}
          </div>
        )}
        </div>
        )}
      </motion.section>

      {/* Plantas */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-zinc-800/30 rounded-xl border border-zinc-700/50 overflow-hidden"
      >
        <button 
          onClick={() => setPlantsExpanded(!plantsExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-cultivo-green-500" />
            <h2 className="text-xl font-semibold text-white">Plantas</h2>
            <span className="text-xs px-2 py-0.5 bg-cultivo-green-500/20 text-cultivo-green-400 rounded-full ml-2">
              {section.plants?.length || 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {plantsExpanded ? (
              <ChevronUp className="w-5 h-5 text-zinc-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-zinc-400" />
            )}
          </div>
        </button>

        {plantsExpanded && (
        <div className="p-4 pt-0">
        {section.plants && section.plants.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {section.plants.map((plant, index) => (
              <PlantCard 
                key={plant.id} 
                plant={plant} 
                delay={index}
                onRegisterEvent={(plant) => setSelectedPlantForEvent(plant)}
                onStageChange={(updatedPlant) => {
                  // Actualizar la planta en el estado local
                  if (section) {
                    const updatedPlants = section.plants?.map(p => 
                      p.id === updatedPlant.id ? updatedPlant : p
                    );
                    setSection({
                      ...section,
                      plants: updatedPlants || []
                    });
                  }
                  // Recargar los planes de alimentación porque pueden cambiar con la etapa
                  loadFeedingPlans();
                  loadPreventionPlans();
                }}
              />
            ))}
          </div>
        ) : (
          <div className="bg-zinc-800/50 rounded-xl p-8 text-center border border-zinc-700/50">
            <Leaf className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400">No hay plantas registradas en esta sección</p>
            <p className="text-xs text-zinc-500 mt-1">
              Agrega plantas desde la página de Ciclos
            </p>
          </div>
        )}
        </div>
        )}
      </motion.section>

      {/* Modal de registro de evento */}
      {selectedPlantForEvent && (
        <PlantEventModal
          plant={selectedPlantForEvent}
          sectionId={sectionId}
          availablePlants={section?.plants || []}
          feedingPlanInfo={(() => {
            // Buscar el plan de alimentación de la planta seleccionada
            const plantWithPlan = feedingPlans?.plants.find(p => p.id === selectedPlantForEvent.id);
            const activePlan = plantWithPlan?.feedingPlans[0]; // Tomar el primer plan activo
            if (activePlan?.currentWeekData) {
              return {
                planName: activePlan.feedingPlanName,
                currentWeek: activePlan.currentWeek,
                weekData: {
                  ph: activePlan.currentWeekData.ph ?? undefined,
                  ec: activePlan.currentWeekData.ec ?? undefined,
                  products: (activePlan.currentWeekData.products as { name: string; dose: string; unit: string }[]) || [],
                },
              };
            }
            return undefined;
          })()}
          preventionPlanInfo={(() => {
            // Buscar el plan de prevención de la planta seleccionada
            const plantWithPlan = preventionPlans?.plants.find(p => p.id === selectedPlantForEvent.id);
            const activePlan = plantWithPlan?.preventionPlans[0]; // Tomar el primer plan activo
            if (activePlan?.currentApplication) {
              return {
                planName: activePlan.preventionPlanName,
                currentDay: activePlan.currentDay,
                applicationData: {
                  dayNumber: activePlan.currentApplication.dayNumber,
                  products: (activePlan.currentApplication.products as { name: string; dose: string; unit: string }[]) || [],
                  applicationType: activePlan.currentApplication.applicationType,
                  target: activePlan.currentApplication.target,
                  notes: activePlan.currentApplication.notes,
                },
              };
            }
            return undefined;
          })()}
          onClose={() => setSelectedPlantForEvent(null)}
          onCreated={() => {
            setSelectedPlantForEvent(null);
            // Mostrar notificación o refrescar
          }}
        />
      )}

      {/* Modal de importar plan de alimentación */}
      {showUploadModal && (
        <FeedingPlanUpload
          onClose={() => setShowUploadModal(false)}
          onSuccess={(plan) => {
            setShowUploadModal(false);
            loadFeedingPlans();
            loadAvailablePlans();
          }}
        />
      )}

      {/* Modal de importar plan de prevención */}
      {showPreventionUploadModal && (
        <PreventionPlanUpload
          onClose={() => setShowPreventionUploadModal(false)}
          onSuccess={(plan) => {
            setShowPreventionUploadModal(false);
            loadPreventionPlans();
            loadAvailablePreventionPlans();
          }}
        />
      )}

      {/* Modal de confirmar eliminación de plan */}
      {planToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 rounded-xl border border-zinc-700 w-full max-w-md"
          >
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-white">Eliminar Plan</h3>
              <button 
                onClick={() => setPlanToDelete(null)} 
                className="p-1 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400 text-sm">
                  ¿Estás seguro de eliminar el plan <strong>{planToDelete.name}</strong>?
                </p>
                {planToDelete._count.plants > 0 && (
                  <p className="text-red-300 text-xs mt-2">
                    ⚠️ Este plan está asignado a {planToDelete._count.plants} planta(s). 
                    No podrás eliminarlo hasta desasignarlo.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setPlanToDelete(null)} 
                  className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeletePlan(planToDelete.id)}
                  disabled={deletingPlan || planToDelete._count.plants > 0}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {deletingPlan ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {deletingPlan ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de asignar plan a plantas */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 rounded-xl border border-zinc-700 w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-white">Asignar Plan de Alimentación</h3>
              <button 
                onClick={() => setShowAssignModal(null)} 
                className="p-1 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto">
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-sm text-zinc-400">Plan</p>
                <p className="text-white font-medium">{showAssignModal.plan.name}</p>
                <p className="text-xs text-cyan-400">{showAssignModal.plan.stage} • {showAssignModal.plan.weeks.length} semanas</p>
              </div>
              
              {/* Selector de plantas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-zinc-300">Seleccionar plantas</p>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPlantsForAssign.length === showAssignModal.compatiblePlants.length) {
                        setSelectedPlantsForAssign([]);
                      } else {
                        setSelectedPlantsForAssign(showAssignModal.compatiblePlants.map(p => p.id));
                      }
                    }}
                    className="text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    {selectedPlantsForAssign.length === showAssignModal.compatiblePlants.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto bg-zinc-800/30 rounded-lg p-2">
                  {showAssignModal.compatiblePlants.map((plant) => (
                    <label
                      key={plant.id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedPlantsForAssign.includes(plant.id)
                          ? 'bg-cyan-500/20 border border-cyan-500/30'
                          : 'bg-zinc-800/50 border border-transparent hover:border-zinc-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPlantsForAssign.includes(plant.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPlantsForAssign([...selectedPlantsForAssign, plant.id]);
                          } else {
                            setSelectedPlantsForAssign(selectedPlantsForAssign.filter(id => id !== plant.id));
                          }
                        }}
                        className="w-4 h-4 rounded border-zinc-600 text-cyan-600 focus:ring-cyan-500 bg-zinc-700"
                      />
                      <div className="flex-1">
                        <p className="text-white font-medium text-sm">{plant.tagCode}</p>
                        <p className="text-xs text-zinc-400">{plant.strain?.name || 'Sin genética'}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {selectedPlantsForAssign.length} de {showAssignModal.compatiblePlants.length} plantas seleccionadas
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  ¿Cuándo entraron en etapa {showAssignModal.plan.stage}?
                </label>
                <input
                  type="date"
                  id="stageStartDate"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-cyan-600"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Esto determina en qué semana del plan están las plantas
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setShowAssignModal(null)} 
                  className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    const dateInput = document.getElementById('stageStartDate') as HTMLInputElement;
                    setAssigningPlan(true);
                    try {
                      // Asignar a cada planta seleccionada
                      for (const plantId of selectedPlantsForAssign) {
                        await feedingPlanService.assignToPlant(plantId, {
                          feedingPlanId: showAssignModal.plan.id,
                          stageStartDate: dateInput.value,
                        });
                      }
                      await loadFeedingPlans();
                      await loadAvailablePlans();
                      setShowAssignModal(null);
                    } catch (err) {
                      console.error('Error asignando plan:', err);
                      alert(err instanceof Error ? err.message : 'Error al asignar el plan');
                    } finally {
                      setAssigningPlan(false);
                    }
                  }}
                  disabled={assigningPlan || selectedPlantsForAssign.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                  {assigningPlan ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {assigningPlan ? 'Asignando...' : `Asignar a ${selectedPlantsForAssign.length} planta${selectedPlantsForAssign.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de confirmar eliminación de plan de prevención */}
      {preventionPlanToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 rounded-xl border border-zinc-700 w-full max-w-md"
          >
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-white">Eliminar Plan de Prevención</h3>
              <button 
                onClick={() => setPreventionPlanToDelete(null)} 
                className="p-1 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400 text-sm">
                  ¿Estás seguro de eliminar el plan <strong>{preventionPlanToDelete.name}</strong>?
                </p>
                {preventionPlanToDelete._count.plants > 0 && (
                  <p className="text-red-300 text-xs mt-2">
                    ⚠️ Este plan está asignado a {preventionPlanToDelete._count.plants} planta(s). 
                    No podrás eliminarlo hasta desasignarlo.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setPreventionPlanToDelete(null)} 
                  className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeletePreventionPlan(preventionPlanToDelete.id)}
                  disabled={deletingPreventionPlan || preventionPlanToDelete._count.plants > 0}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {deletingPreventionPlan ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {deletingPreventionPlan ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de asignar plan de prevención a plantas */}
      {showPreventionAssignModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 rounded-xl border border-zinc-700 w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-white">Asignar Plan de Prevención</h3>
              <button 
                onClick={() => setShowPreventionAssignModal(null)} 
                className="p-1 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto">
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-sm text-zinc-400">Plan</p>
                <p className="text-white font-medium">{showPreventionAssignModal.plan.name}</p>
                <p className="text-xs text-orange-400">{showPreventionAssignModal.plan.stage} • {showPreventionAssignModal.plan.totalDays} días</p>
              </div>
              
              {/* Selector de plantas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-zinc-300">Seleccionar plantas</p>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPlantsForPreventionAssign.length === showPreventionAssignModal.compatiblePlants.length) {
                        setSelectedPlantsForPreventionAssign([]);
                      } else {
                        setSelectedPlantsForPreventionAssign(showPreventionAssignModal.compatiblePlants.map(p => p.id));
                      }
                    }}
                    className="text-xs text-orange-400 hover:text-orange-300"
                  >
                    {selectedPlantsForPreventionAssign.length === showPreventionAssignModal.compatiblePlants.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto bg-zinc-800/30 rounded-lg p-2">
                  {showPreventionAssignModal.compatiblePlants.map((plant) => (
                    <label
                      key={plant.id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedPlantsForPreventionAssign.includes(plant.id)
                          ? 'bg-orange-500/20 border border-orange-500/30'
                          : 'bg-zinc-800/50 border border-transparent hover:border-zinc-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPlantsForPreventionAssign.includes(plant.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPlantsForPreventionAssign([...selectedPlantsForPreventionAssign, plant.id]);
                          } else {
                            setSelectedPlantsForPreventionAssign(selectedPlantsForPreventionAssign.filter(id => id !== plant.id));
                          }
                        }}
                        className="w-4 h-4 rounded border-zinc-600 text-orange-600 focus:ring-orange-500 bg-zinc-700"
                      />
                      <div className="flex-1">
                        <p className="text-white font-medium text-sm">{plant.tagCode}</p>
                        <p className="text-xs text-zinc-400">{plant.strain?.name || 'Sin genética'}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {selectedPlantsForPreventionAssign.length} de {showPreventionAssignModal.compatiblePlants.length} plantas seleccionadas
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  ¿Cuándo comenzó el plan de prevención?
                </label>
                <input
                  type="date"
                  id="preventionStartDate"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-600"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Esto determina en qué día del ciclo están las plantas
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setShowPreventionAssignModal(null)} 
                  className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    const dateInput = document.getElementById('preventionStartDate') as HTMLInputElement;
                    setAssigningPreventionPlan(true);
                    try {
                      // Asignar a cada planta seleccionada
                      for (const plantId of selectedPlantsForPreventionAssign) {
                        await preventionPlanService.assignToPlant(plantId, {
                          preventionPlanId: showPreventionAssignModal.plan.id,
                          startDate: dateInput.value,
                        });
                      }
                      await loadPreventionPlans();
                      await loadAvailablePreventionPlans();
                      setShowPreventionAssignModal(null);
                    } catch (err) {
                      console.error('Error asignando plan de prevención:', err);
                      alert(err instanceof Error ? err.message : 'Error al asignar el plan');
                    } finally {
                      setAssigningPreventionPlan(false);
                    }
                  }}
                  disabled={assigningPreventionPlan || selectedPlantsForPreventionAssign.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                  {assigningPreventionPlan ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {assigningPreventionPlan ? 'Asignando...' : `Asignar a ${selectedPlantsForPreventionAssign.length} planta${selectedPlantsForPreventionAssign.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
