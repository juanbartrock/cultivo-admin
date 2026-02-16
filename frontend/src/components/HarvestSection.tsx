import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Scissors,
  Plus,
  Trash2,
  X,
  Minus,
  Loader2,
  Calendar,
  Snowflake,
  Thermometer
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/DialogContext';
import { harvestService, HarvestStatistics } from '@/services/harvestService';
import {
  Harvest,
  HarvestProduct,
  CreateHarvestDto,
  CreateHarvestProductDto,
  HarvestProductType,
  StorageLocation,
  Plant
} from '@/types';

interface HarvestSectionProps {
  plants: Plant[];
  cycleId: string;
  materialOnlyMode?: boolean;
}

const productTypeConfig: Record<HarvestProductType, { label: string; color: string }> = {
  FLOR: { label: 'Flor', color: 'border-green-500/50 text-green-400 bg-green-500/10' },
  TRIM: { label: 'Trim', color: 'border-amber-500/50 text-amber-400 bg-amber-500/10' },
  LARF: { label: 'Larf', color: 'border-lime-500/50 text-lime-400 bg-lime-500/10' },
  KIEF: { label: 'Kief', color: 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' },
  HASH: { label: 'Hash', color: 'border-orange-500/50 text-orange-400 bg-orange-500/10' },
  ROSIN: { label: 'Rosin', color: 'border-amber-600/50 text-amber-500 bg-amber-600/10' },
  ACEITE: { label: 'Aceite', color: 'border-blue-500/50 text-blue-400 bg-blue-500/10' },
  OTRO: { label: 'Otro', color: 'border-zinc-500/50 text-zinc-400 bg-zinc-500/10' },
};

const storageConfig: Record<StorageLocation, { label: string; icon: any }> = {
  AMBIENTE: { label: 'Ambiente', icon: Package },
  HELADERA: { label: 'Heladera', icon: Thermometer },
  FREEZER: { label: 'Freezer', icon: Snowflake },
};

export default function HarvestSection({ plants, cycleId, materialOnlyMode = false }: HarvestSectionProps) {
  // Estado
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [selectedHarvest, setSelectedHarvest] = useState<Harvest | null>(null);
  const [showHarvestModal, setShowHarvestModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<HarvestProduct | null>(null);
  const [statistics, setStatistics] = useState<HarvestStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const confirm = useConfirm();

  const plantIdsKey = useMemo(
    () => plants.map((plant) => plant.id).sort().join(','),
    [plants]
  );

  const plantsById = useMemo(() => {
    const map = new Map<string, Plant>();
    plants.forEach((plant) => map.set(plant.id, plant));
    return map;
  }, [plants]);

  const harvestedPlantIds = useMemo(
    () => new Set(harvests.map((harvest) => harvest.plantId)),
    [harvests]
  );

  const pendingPlants = useMemo(
    () => plants.filter((plant) => !harvestedPlantIds.has(plant.id)),
    [plants, harvestedPlantIds]
  );

  useEffect(() => {
    loadData();
  }, [cycleId, plantIdsKey]);

  async function loadData() {
    setIsLoading(true);
    try {
      const [harvestsData, statsData] = await Promise.all([
        harvestService.getAll(),
        harvestService.getStatistics(cycleId)
      ]);
      // Filtrar cosechas que pertenecen a las plantas de este ciclo
      const cyclePlantIds = plants.map(p => p.id);
      const filteredHarvests = harvestsData.filter(h => cyclePlantIds.includes(h.plantId));

      setHarvests(filteredHarvests);
      setStatistics(statsData);

      if (filteredHarvests.length === 0) {
        setSelectedHarvest(null);
      } else if (!selectedHarvest || !filteredHarvests.some((harvest) => harvest.id === selectedHarvest.id)) {
        setSelectedHarvest(filteredHarvests[0]);
      }
    } catch (error) {
      console.error('Error loading harvest data:', error);
      toast.error('Error al cargar datos de cosecha');
    } finally {
      setIsLoading(false);
    }
  }

  // ... 

  async function handleCreateHarvest(data: CreateHarvestDto) {
    if (materialOnlyMode) {
      toast.error('El ciclo esta finalizado: solo se permite extraer material');
      return;
    }
    try {
      const newHarvest = await harvestService.create(data);
      setHarvests((prev) => [newHarvest, ...prev]);
      setSelectedHarvest(newHarvest);
      setShowHarvestModal(false);
      toast.success('Cosecha registrada correctamente');
      loadData();
    } catch (err) {
      console.error('Error creating harvest:', err);
      toast.error('Error al registrar la cosecha');
    }
  }

  async function handleCreateProduct(data: CreateHarvestProductDto) {
    if (materialOnlyMode) {
      toast.error('El ciclo esta finalizado: solo se permite extraer material');
      return;
    }
    try {
      await harvestService.createProduct(data);
      // Actualizar la cosecha seleccionada
      if (selectedHarvest) {
        const updatedHarvest = await harvestService.getById(selectedHarvest.id);
        setHarvests((prev) => prev.map((h) => h.id === updatedHarvest.id ? updatedHarvest : h));
        setSelectedHarvest(updatedHarvest);
      }
      setShowProductModal(false);
      toast.success('Producto creado correctamente');
      loadData();
    } catch (err) {
      console.error('Error creating product:', err);
      toast.error('Error al crear el producto');
    }
  }

  async function handleExtractMaterial(productId: string, amount: number, notes?: string) {
    try {
      await harvestService.extractMaterial(productId, amount, notes);
      // Recargar datos
      if (selectedHarvest) {
        const updatedHarvest = await harvestService.getById(selectedHarvest.id);
        setHarvests((prev) => prev.map((h) => h.id === updatedHarvest.id ? updatedHarvest : h));
        setSelectedHarvest(updatedHarvest);
      }
      setShowExtractModal(false);
      setSelectedProduct(null);
      toast.success('Material extraido correctamente');
      loadData();
    } catch (err) {
      console.error('Error extracting material:', err);
      toast.error('Error al extraer material');
    }
  }

  async function handleDeleteHarvest(harvest: Harvest) {
    if (materialOnlyMode) {
      toast.error('El ciclo esta finalizado: no se pueden eliminar cosechas');
      return;
    }
    const shouldDelete = await confirm({
      title: 'Eliminar Cosecha',
      message: `Estas seguro de eliminar la cosecha de ${harvest.plant?.tagCode}? Esta accion no se puede deshacer.`,
      variant: 'danger',
      confirmText: 'Eliminar',
    });

    if (!shouldDelete) return;

    try {
      await harvestService.delete(harvest.id);
      const nextSelection = harvests.find((item) => item.id !== harvest.id) || null;
      setHarvests((prev) => prev.filter((h) => h.id !== harvest.id));
      if (selectedHarvest?.id === harvest.id) {
        setSelectedHarvest(nextSelection);
      }
      toast.success('Cosecha eliminada correctamente');
      loadData();
    } catch (err) {
      console.error('Error deleting harvest:', err);
      toast.error('Error al eliminar');
    }
  }

  // ... rest of component



  const selectedHarvestId = selectedHarvest?.id;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-400" />
            Cosechas
          </h3>
          <p className="text-xs text-zinc-400">
            Plantas cosechadas: {harvestedPlantIds.size} / {plants.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {materialOnlyMode && (
            <span className="text-xs px-2 py-1 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300">
              Modo finalizado: solo extracción
            </span>
          )}
          <button
            onClick={() => setShowHarvestModal(true)}
            disabled={materialOnlyMode}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-700 disabled:text-zinc-400 text-white rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Registrar Cosecha
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-800/50 rounded-lg p-3 text-center border border-zinc-700/40">
          <p className="text-2xl font-bold text-white">{statistics?.totalHarvests ?? harvests.length}</p>
          <p className="text-xs text-zinc-500">Cosechas</p>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-3 text-center border border-zinc-700/40">
          <p className="text-2xl font-bold text-green-400">{statistics?.totalDryWeight ?? 0}g</p>
          <p className="text-xs text-zinc-500">Peso seco</p>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-3 text-center border border-zinc-700/40">
          <p className="text-2xl font-bold text-amber-400">{statistics?.dryRatio ?? 0}%</p>
          <p className="text-xs text-zinc-500">Ratio seco</p>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-3 text-center border border-zinc-700/40">
          <p className="text-2xl font-bold text-purple-400">{statistics?.totalProducts ?? 0}</p>
          <p className="text-xs text-zinc-500">Productos</p>
        </div>
      </div>

      {harvests.length > 0 ? (
        <div className="space-y-3">
          {harvests.map((harvest) => {
            const plant = harvest.plant ?? plantsById.get(harvest.plantId);
            const isSelected = selectedHarvestId === harvest.id;
            const productCount = harvest._count?.products ?? harvest.products?.length ?? 0;
            const dryRatio = harvest.wetWeight && harvest.dryWeight
              ? ((harvest.dryWeight / harvest.wetWeight) * 100).toFixed(1)
              : null;

            return (
              <motion.article
                key={harvest.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl border p-4 transition-colors ${isSelected
                  ? 'bg-amber-600/10 border-amber-500/50'
                  : 'bg-zinc-800/40 border-zinc-700/50 hover:border-zinc-600'
                  }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedHarvest(harvest)}
                  className="w-full text-left"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-3">
                    <div>
                      <p className="text-base font-semibold text-white">
                        {plant?.tagCode || `Planta ${harvest.plantId.slice(0, 6)}`}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {plant?.strain?.name || 'Genética sin definir'}
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-1 text-xs text-zinc-400">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(harvest.harvestDate).toLocaleDateString('es-AR')}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="rounded-lg border border-zinc-700/60 bg-zinc-900/30 p-2">
                      <p className="text-zinc-500 mb-1">Húmedo</p>
                      <p className="text-sm font-semibold text-white">{harvest.wetWeight ?? '-'}g</p>
                    </div>
                    <div className="rounded-lg border border-zinc-700/60 bg-zinc-900/30 p-2">
                      <p className="text-zinc-500 mb-1">Seco</p>
                      <p className="text-sm font-semibold text-green-400">{harvest.dryWeight ?? '-'}g</p>
                    </div>
                    <div className="rounded-lg border border-zinc-700/60 bg-zinc-900/30 p-2">
                      <p className="text-zinc-500 mb-1">Trim</p>
                      <p className="text-sm font-semibold text-amber-400">{harvest.trimWeight ?? '-'}g</p>
                    </div>
                    <div className="rounded-lg border border-zinc-700/60 bg-zinc-900/30 p-2">
                      <p className="text-zinc-500 mb-1">Productos</p>
                      <p className="text-sm font-semibold text-purple-400">{productCount}</p>
                    </div>
                  </div>
                </button>

                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-zinc-500">
                    Rendimiento seco: {dryRatio ? `${dryRatio}%` : 'Sin datos'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedHarvest(harvest);
                        setShowProductModal(true);
                      }}
                      disabled={materialOnlyMode}
                      className="p-2 bg-amber-600/20 text-amber-400 disabled:bg-zinc-700/50 disabled:text-zinc-500 rounded-lg hover:bg-amber-600/30"
                      title="Agregar producto"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteHarvest(harvest)}
                      disabled={materialOnlyMode}
                      className="p-2 bg-red-600/20 text-red-400 disabled:bg-zinc-700/50 disabled:text-zinc-500 rounded-lg hover:bg-red-600/30"
                      title="Eliminar cosecha"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-zinc-700/50">
                        {harvest.notes && (
                          <p className="text-xs text-zinc-400 mb-3">
                            {harvest.notes}
                          </p>
                        )}
                        <h5 className="text-sm font-medium text-zinc-300 mb-2">Productos de esta planta</h5>
                        {harvest.products && harvest.products.length > 0 ? (
                          <div className="space-y-2">
                            {harvest.products.map((product) => {
                              const typeInfo = productTypeConfig[product.type];
                              const storageInfo = storageConfig[product.storageLocation];
                              const StorageIcon = storageInfo.icon;

                              return (
                                <div
                                  key={product.id}
                                  className="p-3 bg-zinc-900/40 rounded-lg border border-zinc-700/50"
                                >
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs px-2 py-0.5 rounded border ${typeInfo.color}`}>
                                        {typeInfo.label}
                                      </span>
                                      {product.packageNumber && (
                                        <span className="text-xs text-zinc-500">#{product.packageNumber}</span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => {
                                        setSelectedProduct(product);
                                        setShowExtractModal(true);
                                      }}
                                      className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded"
                                      title="Extraer material"
                                    >
                                      <Minus className="w-4 h-4" />
                                    </button>
                                  </div>
                                  <div className="flex items-center justify-between text-sm">
                                    <div>
                                      <span className="font-semibold text-white">{product.currentWeight}g</span>
                                      <span className="text-xs text-zinc-500 ml-2">/ {product.initialWeight}g</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                                      <StorageIcon className="w-3 h-3" />
                                      {storageInfo.label}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-4 bg-zinc-900/40 rounded-lg border border-zinc-700/50">
                            <Package className="w-6 h-6 text-zinc-600 mx-auto mb-1" />
                            <p className="text-xs text-zinc-500">Sin productos registrados</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-10 bg-zinc-800/30 rounded-xl border border-zinc-700/50">
          <Scissors className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-white mb-2">Sin cosechas registradas</h4>
          <p className="text-zinc-500 mb-4">Registra la cosecha de tus plantas para ver su rendimiento</p>
          {pendingPlants.length > 0 && (
            <div className="mb-4 flex flex-wrap justify-center gap-2 px-4">
              {pendingPlants.slice(0, 8).map((plant) => (
                <span
                  key={plant.id}
                  className="text-xs px-2 py-1 rounded-lg bg-zinc-900/60 border border-zinc-700/60 text-zinc-300"
                >
                  {plant.tagCode}
                </span>
              ))}
            </div>
          )}
          <button
            onClick={() => setShowHarvestModal(true)}
            disabled={materialOnlyMode}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-700 disabled:text-zinc-400 text-white rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Registrar Cosecha
          </button>
        </div>
      )}
      {/* Modales */}
      {showHarvestModal && !materialOnlyMode && (
        <HarvestModal
          plants={plants}
          onClose={() => setShowHarvestModal(false)}
          onCreated={handleCreateHarvest}
        />
      )}

      {showProductModal && selectedHarvest && !materialOnlyMode && (
        <ProductModal
          harvestId={selectedHarvest.id}
          onClose={() => setShowProductModal(false)}
          onCreated={handleCreateProduct}
        />
      )}

      {showExtractModal && selectedProduct && (
        <ExtractModal
          product={selectedProduct}
          onClose={() => {
            setShowExtractModal(false);
            setSelectedProduct(null);
          }}
          onExtract={handleExtractMaterial}
        />
      )}
    </div>
  );


  // Modal para crear cosecha
  function HarvestModal({
    plants,
    onClose,
    onCreated,
  }: {
    plants: Plant[];
    onClose: () => void;
    onCreated: (data: CreateHarvestDto) => void;
  }) {
    const [form, setForm] = useState({
      plantId: plants[0]?.id || '',
      harvestDate: new Date().toISOString().split('T')[0],
      wetWeight: '',
      dryWeight: '',
      trimWeight: '',
      notes: '',
    });
    const [isCreating, setIsCreating] = useState(false);

    async function handleSubmit() {
      if (!form.plantId) return;
      setIsCreating(true);
      try {
        await onCreated({
          plantId: form.plantId,
          harvestDate: form.harvestDate,
          wetWeight: form.wetWeight ? parseFloat(form.wetWeight) : undefined,
          dryWeight: form.dryWeight ? parseFloat(form.dryWeight) : undefined,
          trimWeight: form.trimWeight ? parseFloat(form.trimWeight) : undefined,
          notes: form.notes || undefined,
        });
      } finally {
        setIsCreating(false);
      }
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative bg-zinc-800 rounded-2xl border border-zinc-700 p-6 w-full max-w-md shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Registrar Cosecha</h3>
            <button onClick={onClose} className="p-1 hover:bg-zinc-700 rounded-lg">
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Planta *</label>
              <select
                value={form.plantId}
                onChange={(e) => setForm({ ...form, plantId: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white"
              >
                {plants.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.tagCode} - {p.strain?.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Fecha de cosecha</label>
              <input
                type="date"
                value={form.harvestDate}
                onChange={(e) => setForm({ ...form, harvestDate: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Humedo (g)</label>
                <input
                  type="number"
                  value={form.wetWeight}
                  onChange={(e) => setForm({ ...form, wetWeight: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Seco (g)</label>
                <input
                  type="number"
                  value={form.dryWeight}
                  onChange={(e) => setForm({ ...form, dryWeight: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Trim (g)</label>
                <input
                  type="number"
                  value={form.trimWeight}
                  onChange={(e) => setForm({ ...form, trimWeight: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Notas</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-white">
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isCreating || !form.plantId}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-700 text-white rounded-lg"
            >
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
              {isCreating ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Modal para crear producto
  function ProductModal({
    harvestId,
    onClose,
    onCreated,
  }: {
    harvestId: string;
    onClose: () => void;
    onCreated: (data: CreateHarvestProductDto) => void;
  }) {
    const [form, setForm] = useState({
      type: 'FLOR' as HarvestProductType,
      initialWeight: '',
      packageType: '',
      packageNumber: '',
      storageLocation: 'AMBIENTE' as StorageLocation,
      notes: '',
    });
    const [isCreating, setIsCreating] = useState(false);

    async function handleSubmit() {
      if (!form.initialWeight) return;
      setIsCreating(true);
      try {
        await onCreated({
          harvestId,
          type: form.type,
          initialWeight: parseFloat(form.initialWeight),
          packageType: form.packageType || undefined,
          packageNumber: form.packageNumber || undefined,
          storageLocation: form.storageLocation,
          notes: form.notes || undefined,
        });
      } finally {
        setIsCreating(false);
      }
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative bg-zinc-800 rounded-2xl border border-zinc-700 p-6 w-full max-w-md shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Agregar Producto</h3>
            <button onClick={onClose} className="p-1 hover:bg-zinc-700 rounded-lg">
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Tipo *</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as HarvestProductType })}
                  className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white"
                >
                  {Object.entries(productTypeConfig).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Peso (g) *</label>
                <input
                  type="number"
                  value={form.initialWeight}
                  onChange={(e) => setForm({ ...form, initialWeight: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Tipo envase</label>
                <input
                  type="text"
                  value={form.packageType}
                  onChange={(e) => setForm({ ...form, packageType: e.target.value })}
                  placeholder="Ej: Frasco vidrio"
                  className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Nro envase</label>
                <input
                  type="text"
                  value={form.packageNumber}
                  onChange={(e) => setForm({ ...form, packageNumber: e.target.value })}
                  placeholder="Ej: F-001"
                  className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Ubicacion</label>
              <select
                value={form.storageLocation}
                onChange={(e) => setForm({ ...form, storageLocation: e.target.value as StorageLocation })}
                className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white"
              >
                {Object.entries(storageConfig).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-white">
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isCreating || !form.initialWeight}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-700 text-white rounded-lg"
            >
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
              {isCreating ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Modal para extraer material
  function ExtractModal({
    product,
    onClose,
    onExtract,
  }: {
    product: HarvestProduct;
    onClose: () => void;
    onExtract: (productId: string, amount: number, notes?: string) => void;
  }) {
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);
    const { toast } = useToast();

    async function handleSubmit() {
      if (!amount || parseFloat(amount) <= 0) return;
      if (parseFloat(amount) > product.currentWeight) {
        toast.error(`No puedes extraer mas de ${product.currentWeight}g`);
        return;
      }

      setIsExtracting(true);
      try {
        await onExtract(product.id, parseFloat(amount), notes || undefined);
      } finally {
        setIsExtracting(false);
      }
    }

    const typeInfo = productTypeConfig[product.type];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative bg-zinc-800 rounded-2xl border border-zinc-700 p-6 w-full max-w-sm shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Extraer Material</h3>
            <button onClick={onClose} className="p-1 hover:bg-zinc-700 rounded-lg">
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          <div className="mb-4 p-3 bg-zinc-900/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs px-2 py-0.5 rounded border ${typeInfo.color}`}>
                {typeInfo.label}
              </span>
              {product.packageNumber && (
                <span className="text-xs text-zinc-500">#{product.packageNumber}</span>
              )}
            </div>
            <p className="text-lg font-bold text-white">
              Disponible: {product.currentWeight}g
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Cantidad a extraer (g) *
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                max={product.currentWeight}
                min={0.01}
                step={0.01}
                className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Notas</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Uso personal"
                className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-white">
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isExtracting || !amount || parseFloat(amount) <= 0}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white rounded-lg"
            >
              {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Minus className="w-4 h-4" />}
              {isExtracting ? 'Extrayendo...' : 'Extraer'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }
}
