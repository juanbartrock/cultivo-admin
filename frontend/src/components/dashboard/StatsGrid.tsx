import { motion } from 'framer-motion';
import {
    Sprout,
    Wifi,
    Activity,
    AlertTriangle,
    Thermometer,
    Droplets
} from 'lucide-react';

interface StatsGridProps {
    totalPlants: number;
    activeDevices: number;
    totalDevices: number;
    activeAutomations: number;
    alertsCount: number;
    avgTemperature?: number;
    avgHumidity?: number;
}

export default function StatsGrid({
    totalPlants,
    activeDevices,
    totalDevices,
    activeAutomations,
    alertsCount,
    avgTemperature,
    avgHumidity
}: StatsGridProps) {

    const stats = [
        {
            label: 'Plantas Activas',
            value: totalPlants,
            icon: Sprout,
            color: 'bg-green-500/10 text-green-500',
            delay: 0.1
        },
        {
            label: 'Dispositivos Online',
            value: `${activeDevices}/${totalDevices}`,
            icon: Wifi,
            color: 'bg-blue-500/10 text-blue-500',
            delay: 0.2
        },
        {
            label: 'Automatizaciones',
            value: activeAutomations,
            icon: Activity,
            color: 'bg-purple-500/10 text-purple-500',
            delay: 0.3
        },
        {
            label: 'Alertas',
            value: alertsCount,
            icon: AlertTriangle,
            color: alertsCount > 0 ? 'bg-red-500/10 text-red-500' : 'bg-zinc-500/10 text-zinc-500',
            delay: 0.4
        }
    ];

    if (avgTemperature) {
        stats.push({
            label: 'Temp. Promedio',
            value: `${avgTemperature.toFixed(1)}°C`,
            icon: Thermometer,
            color: 'bg-orange-500/10 text-orange-500',
            delay: 0.5
        });
    }

    if (avgHumidity) {
        stats.push({
            label: 'Hum. Promedio',
            value: `${avgHumidity.toFixed(1)}%`,
            icon: Droplets,
            color: 'bg-cyan-500/10 text-cyan-500',
            delay: 0.6
        });
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
                <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: stat.delay }}
                    className="bg-zinc-800/50 border border-zinc-700/50 p-4 rounded-xl flex items-center justify-between"
                >
                    <div>
                        <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-1">
                            {stat.label}
                        </p>
                        <h3 className="text-2xl font-bold text-white">
                            {stat.value}
                        </h3>
                    </div>
                    <div className={`p-3 rounded-lg ${stat.color}`}>
                        <stat.icon className="w-6 h-6" />
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
