import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale,
  Package,
  Scissors,
  Plus,
  Trash2,
  X,
  Minus,
  Loader2,
  Calendar,
  AlertTriangle,
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

export default function HarvestSection({ plants, cycleId }: HarvestSectionProps) {
  // Estado
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [selectedHarvest, setSelectedHarvest] = useState<Harvest | null>(null);
  const [showHarvestModal, setShowHarvestModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<HarvestProduct | null>(null);
  const [statistics, setStatistics] = useState<HarvestStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [cycleId]);

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
    } catch (error) {
      console.error('Error loading harvest data:', error);
      toast.error('Error al cargar datos de cosecha');
    } finally {
      setIsLoading(false);
    }
  }
  const { toast } = useToast();
  const confirm = useConfirm();

  // ... 

  async function handleCreateHarvest(data: CreateHarvestDto) {
    try {
      const newHarvest = await harvestService.create(data);
      setHarvests([newHarvest, ...harvests]);
      setShowHarvestModal(false);
      toast.success('Cosecha registrada correctamente');
    } catch (err) {
      console.error('Error creating harvest:', err);
      toast.error('Error al registrar la cosecha');
    }
  }

  async function handleCreateProduct(data: CreateHarvestProductDto) {
    try {
      const newProduct = await harvestService.createProduct(data);
      // Actualizar la cosecha seleccionada
      if (selectedHarvest) {
        const updatedHarvest = await harvestService.getById(selectedHarvest.id);
        setHarvests(harvests.map(h => h.id === updatedHarvest.id ? updatedHarvest : h));
        setSelectedHarvest(updatedHarvest);
      }
      setShowProductModal(false);
      toast.success('Producto creado correctamente');
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
        setHarvests(harvests.map(h => h.id === updatedHarvest.id ? updatedHarvest : h));
        setSelectedHarvest(updatedHarvest);
      }
      setShowExtractModal(false);
      setSelectedProduct(null);
      toast.success('Material extraído correctamente');
    } catch (err) {
      console.error('Error extracting material:', err);
      toast.error('Error al extraer material');
    }
  }

  async function handleDeleteHarvest(harvest: Harvest) {
    const shouldDelete = await confirm({
      title: 'Eliminar Cosecha',
      message: `¿Estás seguro de eliminar la cosecha de ${harvest.plant?.tagCode}? Esta acción no se puede deshacer.`,
      variant: 'danger',
      confirmText: 'Eliminar',
    });

    if (!shouldDelete) return;

    try {
      await harvestService.delete(harvest.id);
      setHarvests(harvests.filter(h => h.id !== harvest.id));
      if (selectedHarvest?.id === harvest.id) {
        setSelectedHarvest(null);
      }
      toast.success('Cosecha eliminada correctamente');
    } catch (err) {
      console.error('Error deleting harvest:', err);
      toast.error('Error al eliminar');
    }
  }

  // ... rest of component



  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header y estadísticas */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-amber-400" />
          Cosechas
        </h3>
        <button
          onClick={() => setShowHarvestModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Registrar Cosecha
        </button>
      </div>

      {/* Stats */}
      {statistics && statistics.totalHarvests > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-white">{statistics.totalHarvests}</p>
            <p className="text-xs text-zinc-500">Cosechas</p>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{statistics.totalDryWeight}g</p>
            <p className="text-xs text-zinc-500">Peso seco</p>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{statistics.dryRatio}%</p>
            <p className="text-xs text-zinc-500">Ratio seco</p>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-purple-400">{statistics.totalProducts}</p>
            <p className="text-xs text-zinc-500">Productos</p>
          </div>
        </div>
      )}

      {/* Lista de cosechas */}
      {harvests.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Lista */}
          <div className="space-y-2">
            {harvests.map((harvest) => (
              <button
                key={harvest.id}
                onClick={() => setSelectedHarvest(harvest)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${selectedHarvest?.id === harvest.id
                  ? 'bg-amber-600/20 border-amber-600/50'
                  : 'bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600'
                  }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white">
                    {harvest.plant?.tagCode || 'Planta'}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {new Date(harvest.harvestDate).toLocaleDateString('es-AR')}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  {harvest.wetWeight && (
                    <span className="text-zinc-400">
                      <Scale className="w-3 h-3 inline mr-1" />
                      {harvest.wetWeight}g húmedo
                    </span>
                  )}
                  {harvest.dryWeight && (
                    <span className="text-green-400">
                      {harvest.dryWeight}g seco
                    </span>
                  )}
                  {harvest._count?.products ? (
                    <span className="text-amber-400">
                      {harvest._count.products} productos
                    </span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>

          {/* Detalle */}
          {selectedHarvest && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-zinc-800/30 rounded-xl border border-zinc-700/50 p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-bold text-white">
                    {selectedHarvest.plant?.tagCode}
                  </h4>
                  <p className="text-xs text-zinc-500">
                    {selectedHarvest.plant?.strain?.name}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowProductModal(true)}
                    className="p-2 bg-amber-600/20 text-amber-400 rounded-lg hover:bg-amber-600/30"
                    title="Agregar producto"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteHarvest(selectedHarvest)}
                    className="p-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Pesos */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-white">
                    {selectedHarvest.wetWeight || '-'}g
                  </p>
                  <p className="text-xs text-zinc-500">Húmedo</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-green-400">
                    {selectedHarvest.dryWeight || '-'}g
                  </p>
                  <p className="text-xs text-zinc-500">Seco</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-amber-400">
                    {selectedHarvest.trimWeight || '-'}g
                  </p>
                  <p className="text-xs text-zinc-500">Trim</p>
                </div>
              </div>

              {/* Productos */}
              <h5 className="text-sm font-medium text-zinc-400 mb-2">Productos</h5>
              {selectedHarvest.products && selectedHarvest.products.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedHarvest.products.map((product) => {
                    const typeInfo = productTypeConfig[product.type];
                    const storageInfo = storageConfig[product.storageLocation];
                    const StorageIcon = storageInfo.icon;

                    return (
                      <div
                        key={product.id}
                        className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded border ${typeInfo.color}`}>
                              {typeInfo.label}
                            </span>
                            {product.packageNumber && (
                              <span className="text-xs text-zinc-500">
                                #{product.packageNumber}
                              </span>
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
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-lg font-bold text-white">
                              {product.currentWeight}g
                            </span>
                            <span className="text-xs text-zinc-500 ml-2">
                              / {product.initialWeight}g
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-zinc-500">
                            <StorageIcon className="w-3 h-3" />
                            {storageInfo.label}
                          </div>
                        </div>
                        {product.packageType && (
                          <p className="text-xs text-zinc-600 mt-1">
                            {product.packageType}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 bg-zinc-800/30 rounded-lg">
                  <Package className="w-6 h-6 text-zinc-600 mx-auto mb-1" />
                  <p className="text-xs text-zinc-500">Sin productos registrados</p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-zinc-800/30 rounded-xl">
          <Scissors className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-white mb-2">Sin cosechas registradas</h4>
          <p className="text-zinc-500 mb-4">Registra la cosecha de tus plantas</p>
          <button
            onClick={() => setShowHarvestModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Registrar Cosecha
          </button>
        </div>
      )}

      {/* Modales */}
      {showHarvestModal && (
        <HarvestModal
          plants={plants}
          onClose={() => setShowHarvestModal(false)}
          onCreated={handleCreateHarvest}
        />
      )}

      {showProductModal && selectedHarvest && (
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
                <label className="block text-sm font-medium text-zinc-300 mb-1">Húmedo (g)</label>
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
                <label className="block text-sm font-medium text-zinc-300 mb-1">N° envase</label>
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
              <label className="block text-sm font-medium text-zinc-300 mb-1">Ubicación</label>
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
        toast.error(`No puedes extraer más de ${product.currentWeight}g`);
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
