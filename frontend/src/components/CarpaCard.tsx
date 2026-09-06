'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Section, Device, DeviceType, DeviceStatus } from '@/types';
import { 
  Leaf, 
  Thermometer, 
  Activity, 
  Flower2, 
  Sprout, 
  Wind, 
  TreeDeciduous,
  Droplets,
  Sun,
  Fan,
  Power,
  PowerOff,
  Loader2,
  PauseCircle
} from 'lucide-react';

// Iconos según el nombre de la sección
// La carpa se distingue por su nombre y sus datos: el ícono no aporta color de marca.
const sectionIcons: Record<string, { icon: React.ElementType; color: string }> = {
  'flora': { icon: Flower2, color: 'text-fg-muted' },
  'floración': { icon: Flower2, color: 'text-fg-muted' },
  'vege': { icon: Sprout, color: 'text-fg-muted' },
  'vegetativo': { icon: Sprout, color: 'text-fg-muted' },
  'secado': { icon: Wind, color: 'text-fg-muted' },
  'invernadero': { icon: TreeDeciduous, color: 'text-fg-muted' },
};

function getSectionIcon(sectionName: string) {
  const nameLower = sectionName.toLowerCase();
  for (const [key, config] of Object.entries(sectionIcons)) {
    if (nameLower.includes(key)) {
      return config;
    }
  }
  return { icon: Leaf, color: 'text-fg-muted' };
}

// Calcula el VPD (Vapor Pressure Deficit) en kPa
function calculateVPD(temperature: number, humidity: number): number | null {
  // Validar que los valores sean números válidos
  if (typeof temperature !== 'number' || typeof humidity !== 'number' ||
      isNaN(temperature) || isNaN(humidity) ||
      !isFinite(temperature) || !isFinite(humidity)) {
    return null;
  }
  // Presión de vapor de saturación (SVP) usando la fórmula de Tetens
  const svp = 0.6108 * Math.exp((17.27 * temperature) / (temperature + 237.3));
  // Presión de vapor actual (AVP)
  const avp = (humidity / 100) * svp;
  // VPD = SVP - AVP
  const vpd = Math.round((svp - avp) * 100) / 100;
  // Validar resultado
  return isNaN(vpd) || !isFinite(vpd) ? null : vpd;
}

// Obtener el color del VPD según el rango
function getVPDColor(vpd: number): string {
  if (vpd < 0.4) return 'text-danger'; // Muy bajo: riesgo de moho
  if (vpd < 0.8) return 'text-warn'; // Bajo
  if (vpd <= 1.4) return 'text-fg'; // En rango
  if (vpd <= 1.6) return 'text-warn'; // Alto: estrés leve
  return 'text-danger'; // Muy alto: estrés severo
}

interface CarpaCardProps {
  section: Section & { _count?: { devices: number; plants: number } };
  delay?: number;
  /** Función para obtener el estado en tiempo real de un dispositivo */
  getDeviceStatus?: (deviceId: string) => DeviceStatus | null;
  /** Si está cargando los estados */
  statusLoading?: boolean;
}

export default function CarpaCard({ section, delay = 0, getDeviceStatus, statusLoading = false }: CarpaCardProps) {
  // Obtener el sensor si existe
  const sensor = section.devices?.find(d => d.type === 'SENSOR');
  // Usar _count si existe, si no usar el array de devices
  const devicesCount = section._count?.devices ?? section.devices?.length ?? 0;
  const plantsCount = section._count?.plants ?? section.plants?.length ?? 0;
  
  const iconConfig = getSectionIcon(section.name);
  const IconComponent = iconConfig.icon;

  // Obtener dispositivo de luz
  const luzDevice = section.devices?.find(d => d.type === 'LUZ');
  
  // Verificar si la luz está encendida (para el efecto de borde iluminado)
  const isLuzEncendida = (() => {
    if (!luzDevice) return false;
    if (getDeviceStatus) {
      const status = getDeviceStatus(luzDevice.id);
      if (status) {
        return status.state === 'on' || status.switch === 'on' || status.power === true;
      }
    }
    return luzDevice.metadata?.state === 'on' || luzDevice.metadata?.switch === 'on' || luzDevice.metadata?.power === true;
  })();

  // Obtener datos ambientales del sensor - PREFERIR estado en tiempo real
  const sensorStatus = sensor && getDeviceStatus ? getDeviceStatus(sensor.id) : null;
  const temperature = sensorStatus?.temperature as number | undefined ?? sensor?.metadata?.temperature as number | undefined;
  const humidity = sensorStatus?.humidity as number | undefined ?? sensor?.metadata?.humidity as number | undefined;
  const vpd = temperature !== undefined && humidity !== undefined 
    ? calculateVPD(temperature, humidity) 
    : undefined;

  // Obtener dispositivos por tipo
  const getDeviceByType = (type: DeviceType): Device | undefined => {
    return section.devices?.find(d => d.type === type);
  };

  const luz = getDeviceByType('LUZ');
  const humidificador = getDeviceByType('HUMIDIFICADOR');
  const extractor = getDeviceByType('EXTRACTOR');
  const ventilador = getDeviceByType('VENTILADOR');

  // Obtener el estado de un dispositivo controlable
  const getDeviceState = (device: Device | undefined): boolean => {
    if (!device) return false;
    // Primero intentar estado en tiempo real
    if (getDeviceStatus) {
      const status = getDeviceStatus(device.id);
      if (status) {
        return status.state === 'on' || status.switch === 'on' || status.power === true;
      }
    }
    // Fallback a metadata guardada
    return device.metadata?.state === 'on' || device.metadata?.switch === 'on' || device.metadata?.power === true;
  };

  // Verificar si hay datos ambientales o dispositivos para mostrar
  const hasEnvironmentData = temperature !== undefined || humidity !== undefined;
  const hasDeviceStatus = luz || humidificador || extractor || ventilador;
  const hasExtraInfo = hasEnvironmentData || hasDeviceStatus;

  // Verificar si la sección está habilitada (default: true)
  const isEnabled = section.enabled !== false;

  return (
    <div className={`flex flex-col ${!isEnabled ? 'opacity-60' : ''}`}>
      <Link href={`/sala/carpa/${section.id}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay * 0.1 }}
          whileHover={{ scale: isEnabled ? 1.02 : 1, y: isEnabled ? -4 : 0 }}
          className={`group bg-surface border overflow-hidden transition-colors cursor-pointer ${
            hasExtraInfo ? 'rounded-t-md' : 'rounded-md'
          } ${
            !isEnabled
              ? 'border-edge grayscale'
              : isLuzEncendida 
                ? 'border-warn/50 hover:border-warn' 
                : 'border-edge hover:border-edge-strong'
          }`}
        >
          {/* Icono de la sección */}
          <div className="relative h-28 bg-surface-2 overflow-hidden flex items-center justify-center">
            <div className="relative z-10">
              <IconComponent className={`w-10 h-10 ${isEnabled ? iconConfig.color : 'text-offline'}`} />
            </div>
            {/* Badge de Inactiva */}
            {!isEnabled && (
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-surface-3 px-2 py-1 rounded-sm">
                <PauseCircle className="w-3 h-3 text-offline" />
                <span className="text-xs font-medium text-offline">Inactiva</span>
              </div>
            )}
            
            {/* Badge de plantas */}
            {plantsCount > 0 && (
              <div className={`absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full ${isEnabled ? 'bg-accent-soft text-accent' : 'bg-surface-3 text-fg-muted'}`}>
                <Leaf className="w-3 h-3" />
                <span className="text-xs font-medium tabular-nums">{plantsCount} planta{plantsCount !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {/* Info de la sección */}
          <div className="p-4">
            <h3 className="font-medium text-fg text-sm mb-1">
              {section.name}
            </h3>
            {section.dimensions && (
              <p className="text-xs text-fg-faint mb-3">{section.dimensions}</p>
            )}
            
            {section.description && (
              <p className="text-xs text-fg-muted mb-3 line-clamp-2">{section.description}</p>
            )}

            {/* Stats */}
            <div className="flex items-center justify-between pt-3 border-t border-edge">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-fg-faint" />
                <span className="text-xs text-fg-muted">
                  {devicesCount} dispositivo{devicesCount !== 1 ? 's' : ''}
                </span>
              </div>
              <span className="text-xs text-accent font-medium group-hover:underline">
                Ver detalle
              </span>
            </div>
          </div>
        </motion.div>
      </Link>

      {/* Panel de información ambiental y estado de dispositivos */}
      {hasExtraInfo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay * 0.1 + 0.1 }}
          className="bg-surface-2 border border-t-0 border-edge rounded-b-md p-3 space-y-2"
        >
          {/* Datos ambientales */}
          {hasEnvironmentData && (
            <div className="flex items-center justify-between gap-2">
              {/* Temperatura */}
              {temperature !== undefined && (
                <div className="flex items-center gap-1.5 flex-1 justify-center">
                  <Thermometer className="w-3.5 h-3.5 text-fg-faint" />
                  <span className="text-sm font-medium tabular-nums text-fg">{temperature} °C</span>
                </div>
              )}
              
              {/* Humedad */}
              {humidity !== undefined && (
                <div className="flex items-center gap-1.5 flex-1 justify-center">
                  <Droplets className="w-3.5 h-3.5 text-fg-faint" />
                  <span className="text-sm font-medium tabular-nums text-fg">{humidity} %</span>
                </div>
              )}
              
              {/* VPD */}
              {vpd !== undefined && vpd !== null && (
                <div className="flex items-center gap-1.5 flex-1 justify-center">
                  <Activity className={`w-3.5 h-3.5 ${getVPDColor(vpd)}`} />
                  <span className={`text-sm font-medium tabular-nums ${getVPDColor(vpd)}`}>
                    {vpd} kPa
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Estado de dispositivos */}
          {hasDeviceStatus && (
            <div className="flex items-center justify-center gap-3 pt-2 border-t border-edge">
              {statusLoading && (
                <Loader2 className="w-3 h-3 text-fg-faint animate-spin" />
              )}
              {/* Luz */}
              {luz && (
                <DeviceStatusBadge
                  icon={Sun}
                  label="Luz"
                  isOn={getDeviceState(luz)}
                  activeColor="text-warn"
                />
              )}
              
              {/* Humidificador */}
              {humidificador && (
                <DeviceStatusBadge
                  icon={Droplets}
                  label="Humidif."
                  isOn={getDeviceState(humidificador)}
                  activeColor="text-info"
                />
              )}
              
              {/* Extractor */}
              {extractor && (
                <DeviceStatusBadge
                  icon={Fan}
                  label="Extractor"
                  isOn={getDeviceState(extractor)}
                  activeColor="text-accent"
                />
              )}
              
              {/* Ventilador */}
              {ventilador && (
                <DeviceStatusBadge
                  icon={Wind}
                  label="Ventilador"
                  isOn={getDeviceState(ventilador)}
                  activeColor="text-accent"
                />
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// Componente para mostrar el estado de un dispositivo
function DeviceStatusBadge({ 
  icon: Icon, 
  label, 
  isOn,
  activeColor 
}: { 
  icon: React.ElementType; 
  label: string;
  isOn: boolean;
  activeColor: string;
}) {
  return (
    <div 
      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
        isOn 
          ? `bg-surface-3 ${activeColor}`
          : 'bg-surface text-fg-faint'
      }`}
      title={`${label}: ${isOn ? 'Encendido' : 'Apagado'}`}
    >
      <Icon className="w-3 h-3" />
      {isOn ? (
        <Power className="w-2.5 h-2.5" />
      ) : (
        <PowerOff className="w-2.5 h-2.5" />
      )}
    </div>
  );
}
