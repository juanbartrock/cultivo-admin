import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, AlertTriangle, WifiOff } from 'lucide-react';

export interface DashboardAlert {
    id: string;
    type: 'CRITICAL' | 'WARNING' | 'INFO';
    message: string;
    timestamp: Date;
    source?: string;
}

interface AlertsListProps {
    alerts: DashboardAlert[];
}

export default function AlertsList({ alerts }: AlertsListProps) {
    if (alerts.length === 0) {
        return (
            <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                <CheckCircle2 className="w-12 h-12 text-zinc-700 mb-3" />
                <h3 className="text-zinc-400 font-medium">Todo en orden</h3>
                <p className="text-sm text-zinc-500 mt-1">No hay alertas activas en el sistema</p>
            </div>
        );
    }

    return (
        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-700/50 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="font-semibold text-white text-sm">Alertas del Sistema</h3>
                <span className="bg-red-500/10 text-red-400 text-xs px-2 py-0.5 rounded-full ml-auto">
                    {alerts.length}
                </span>
            </div>

            <div className="divide-y divide-zinc-700/50">
                {alerts.map((alert, index) => (
                    <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-4 flex gap-3 hover:bg-zinc-700/30 transition-colors"
                    >
                        <div className={`mt-0.5 shrink-0`}>
                            {alert.type === 'CRITICAL' ? (
                                <AlertCircle className="w-5 h-5 text-red-500" />
                            ) : alert.type === 'WARNING' ? (
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-blue-500" />
                            )}
                        </div>
                        <div>
                            <p className="text-sm text-zinc-200 leading-snug">{alert.message}</p>
                            <div className="flex items-center gap-2 mt-1">
                                {alert.source && (
                                    <span className="text-xs text-zinc-500 font-medium bg-zinc-800 px-1.5 rounded">
                                        {alert.source}
                                    </span>
                                )}
                                <span className="text-xs text-zinc-500">
                                    {alert.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
