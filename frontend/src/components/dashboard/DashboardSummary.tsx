"use client";

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, LayoutDashboard } from 'lucide-react';
import { useRouter } from 'next/navigation';

import StatsGrid from './StatsGrid';
import AlertsList, { DashboardAlert } from './AlertsList';
import QuickActions from './QuickActions';
import { useDevicesStatus } from '@/hooks/useDeviceStatus';
import { roomService } from '@/services/locationService';
import { deviceService } from '@/services/deviceService';
import { automationService } from '@/services/automationService';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/DialogContext';
import { Room, Automation, Device } from '@/types';

export default function DashboardSummary() {
    const router = useRouter();
    const { toast } = useToast();
    const confirm = useConfirm();

    // Local state for initial data
    const [rooms, setRooms] = useState<Room[]>([]);
    const [automations, setAutomations] = useState<Automation[]>([]);
    const [allDevices, setAllDevices] = useState<Device[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    // Real-time statuses
    const { statuses, loading: loadingStatuses, refresh: refreshStatuses } = useDevicesStatus(allDevices);

    // Fetch initial data
    const fetchData = async () => {
        try {
            setLoadingData(true);
            const [roomsData, automationsData, devicesData] = await Promise.all([
                roomService.getAll(),
                automationService.getAll(),
                deviceService.getAll()
            ]);
            setRooms(roomsData);
            setAutomations(automationsData);
            setAllDevices(devicesData);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            toast.error('Error cargando datos del dashboard');
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Merge devices with real-time status
    const devicesWithStatus = useMemo(() => {
        return allDevices.map(device => {
            const status = statuses.get(device.id);
            return {
                ...device,
                online: status?.online ?? false, // Default to offline if unknown
                // Merge other status props if available
                ...status
            };
        });
    }, [allDevices, statuses]);

    // --- Derived Metrics ---

    // 1. Plants
    const totalPlants = useMemo(() => {
        return rooms.reduce((total, room) => {
            const roomPlants = room.sections?.reduce((secTotal, section) => {
                return secTotal + (section.plants?.length || 0);
            }, 0) || 0;
            return total + roomPlants;
        }, 0);
    }, [rooms]);

    // 2. Active Automations
    const activeAutomationsCount = useMemo(() => {
        return automations.filter(a => a.status === 'ACTIVE').length;
    }, [automations]);

    // 3. Online Devices
    const activeDevicesCount = useMemo(() => {
        return devicesWithStatus.filter(d => d.online).length;
    }, [devicesWithStatus]);

    // 4. Alerts Generation
    const alerts: DashboardAlert[] = useMemo(() => {
        const list: DashboardAlert[] = [];

        // Check offline sensors (Warning)
        const offlineSensors = devicesWithStatus.filter(d => d.type === 'SENSOR' && !d.online);
        if (offlineSensors.length > 0) {
            list.push({
                id: 'sensors-offline',
                type: 'WARNING',
                message: `${offlineSensors.length} sensor(es) sin conexión.`,
                timestamp: new Date(),
                source: 'Sistema'
            });
        }

        return list;
    }, [devicesWithStatus]);

    // 5. Avg Environment
    const { avgTemp, avgHum } = useMemo(() => {
        // Attempt to average temperature from online sensors
        const sensors = devicesWithStatus.filter(d => d.type === 'SENSOR' && d.online && typeof d.temperature === 'number');

        if (sensors.length === 0) return { avgTemp: undefined, avgHum: undefined };

        const totalTemp = sensors.reduce((acc, s) => acc + (s.temperature as number), 0);
        const totalHum = sensors.reduce((acc, s) => acc + (typeof s.humidity === 'number' ? s.humidity : 0), 0);

        return {
            avgTemp: totalTemp / sensors.length,
            avgHum: sensors.length > 0 ? totalHum / sensors.length : undefined
        };
    }, [devicesWithStatus]);

    // --- Handlers ---

    const handleMasterOff = async () => {
        const isConfirmed = await confirm({
            title: '¿Apagado de Emergencia?',
            message: '¿Estás seguro que querés APAGAR TODO? Esto apagará todas las luces, extractores y humidificadores activos. El riego no se verá afectado.',
            variant: 'danger',
            confirmText: 'SÍ, APAGAR TODO'
        });

        if (!isConfirmed) return;

        try {
            const promises = devicesWithStatus
                .filter(d => ['LUZ', 'EXTRACTOR', 'VENTILADOR', 'HUMIDIFICADOR', 'AIRE_ACONDICIONADO', 'CALEFACTOR'].includes(d.type) && d.online)
                .map(d => deviceService.control(d.id, 'off'));

            await Promise.all(promises);
            toast.success('Se envió comando de apagado a todos los dispositivos.');
            refreshStatuses();
        } catch (e) {
            toast.error('Error al apagar dispositivos.');
        }
    };

    const isLoading = loadingData;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <RefreshCw className="w-10 h-10 text-cultivo-green-500 animate-spin mb-4" />
                <p className="text-zinc-400 font-medium">Cargando tablero de control...</p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto pb-24">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <LayoutDashboard className="w-6 h-6 text-cultivo-green-400" />
                        Resumen Ejecutivo
                    </h1>
                    <p className="text-zinc-400 text-sm mt-1">
                        Estado general del cultivo automatizado
                    </p>
                </div>
                <button
                    onClick={() => { fetchData(); refreshStatuses(); }}
                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            {/* Stats Grid */}
            <StatsGrid
                totalPlants={totalPlants}
                activeDevices={activeDevicesCount}
                totalDevices={allDevices.length}
                activeAutomations={activeAutomationsCount}
                alertsCount={alerts.length}
                avgTemperature={avgTemp}
                avgHumidity={avgHum}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Recent Alerts */}
                    <AlertsList alerts={alerts} />

                    {/* Quick Actions (Mobile/Desktop friendly) */}
                    <QuickActions onMasterOff={handleMasterOff} />
                </div>

                {/* Sidebar / Secondary Column */}
                <div className="space-y-6">
                    {/* Here we could put a 'Recent Activity Log' or 'Upcoming Tasks' */}
                    <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-4">
                        <h3 className="text-zinc-400 font-medium text-sm mb-3">Accesos Directos</h3>
                        <div className="grid grid-cols-1 gap-2">
                            <button onClick={() => router.push('/sala')} className="text-left px-3 py-2 rounded hover:bg-zinc-700/50 text-zinc-300 text-sm transition-colors">
                                Ver Salas y Plantas
                            </button>
                            <button onClick={() => router.push('/artefactos')} className="text-left px-3 py-2 rounded hover:bg-zinc-700/50 text-zinc-300 text-sm transition-colors">
                                Gestionar Dispositivos
                            </button>
                            <button onClick={() => router.push('/automatizaciones')} className="text-left px-3 py-2 rounded hover:bg-zinc-700/50 text-zinc-300 text-sm transition-colors">
                                Configurar Automatizaciones
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
