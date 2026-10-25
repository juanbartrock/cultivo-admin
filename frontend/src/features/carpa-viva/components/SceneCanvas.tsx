'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Html, OrbitControls } from '@react-three/drei';
import { Device, DeviceStatus, Plant, StageRange } from '@/types';
import { Vector3 } from 'three';
import { AlertTriangle, Leaf, Power, Thermometer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatReading, isDeviceOn, readingStatus } from '@/features/home/lib/readings';
import { CarpaModel } from './SceneModels';
import { GENERIC_DEVICE_POSITIONS } from './EquipmentModels';
import { PlantSlot, SceneSelection, SceneView } from '../lib/scene-config';
import { LiveMode, liveMetrics, SceneLayers } from '../lib/operations';

const CAMERA_POSITIONS: Record<SceneView, [number, number, number]> = {
  perspective: [2.2, 1.6, 2.85],
  front: [0, 1.05, 3.45],
  top: [0, 3.8, 0.01],
};
const DEVICE_POSITIONS: Partial<Record<Device['type'], [number, number, number]>> = {
  ...GENERIC_DEVICE_POSITIONS,
  LUZ: [0, 1.65, 0.26], EXTRACTOR: [0.39, 1.55, -0.22], VENTILADOR: [-0.46, 1.39, -0.24], SENSOR: [-0.47, 0.96, 0.02],
};

function CameraController({ view, resetSignal, selected, plants, devices, reducedMotion }: {
  view: SceneView;
  resetSignal: number;
  selected: SceneSelection;
  plants: Array<{ plant: Plant; slot: PlantSlot }>;
  devices: Device[];
  reducedMotion: boolean;
}) {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const destination = useRef(new Vector3());
  const target = useRef(new Vector3(0, 0.95, 0));
  const animating = useRef(false);

  useEffect(() => {
    let focus: [number, number, number] | null = null;
    if (selected?.kind === 'plant') {
      const item = plants.find(({ plant }) => plant.id === selected.id);
      if (item) focus = [item.slot.position[0], item.slot.position[1] + 0.22, item.slot.position[2]];
    } else if (selected?.kind === 'device') {
      const device = devices.find((item) => item.id === selected.id);
      if (device) focus = DEVICE_POSITIONS[device.type] ?? null;
    }
    if (focus) {
      target.current.set(...focus);
      destination.current.set(focus[0] + 0.85, focus[1] + 0.42, focus[2] + 1.25);
    } else {
      target.current.set(0, view === 'top' ? 0 : 0.95, 0);
      destination.current.set(...CAMERA_POSITIONS[view]);
    }
    if (reducedMotion) {
      camera.position.copy(destination.current);
      camera.lookAt(target.current);
      if (controls.current) { controls.current.target.copy(target.current); controls.current.update(); }
      animating.current = false;
    } else animating.current = true;
    invalidate();
  }, [camera, view, resetSignal, selected, plants, devices, reducedMotion, invalidate]);

  useFrame((_, delta) => {
    if (!animating.current || !controls.current) return;
    const alpha = 1 - Math.exp(-delta * 5);
    camera.position.lerp(destination.current, alpha);
    controls.current.target.lerp(target.current, alpha);
    controls.current.update();
    if (camera.position.distanceTo(destination.current) < 0.008) animating.current = false;
    else invalidate();
  });

  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.08} minDistance={0.65} maxDistance={5.5} minPolarAngle={0.01} maxPolarAngle={Math.PI / 2.02} enablePan={false} onStart={() => { animating.current = false; }} />;
}

function PlantHotspot({ plant, slot, selected, onSelect }: { plant: Plant; slot: PlantSlot; selected: boolean; onSelect: () => void }) {
  return (
    <Html position={[slot.position[0], slot.position[1] + slot.height + 0.19, slot.position[2]]} center zIndexRange={[20, 0]}>
      <button type="button" onClick={(event) => { event.stopPropagation(); onSelect(); }} aria-label={`Enfocar ${plant.strain?.name ?? plant.tagCode}`} className={cn('group flex -translate-y-2 items-center gap-2 whitespace-nowrap rounded-full border px-2.5 py-1.5 text-[10px] shadow-lg transition', selected ? 'border-accent/70 bg-[#10251a]/95 text-[#a6f9c7]' : 'border-white/15 bg-[#0b100d]/85 text-white/75 hover:border-accent/40 hover:text-white')}>
        <Leaf className="h-3 w-3 text-[#69d998]" /><span className="max-w-24 truncate">{plant.strain?.name ?? plant.tagCode}</span><span className="text-white/35">#{plant.tagCode}</span>
      </button>
    </Html>
  );
}

function DeviceHotspot({ device, position, status, selected, range, metrics, onSelect }: {
  device: Device;
  position: [number, number, number];
  status: DeviceStatus | null;
  selected: boolean;
  range: StageRange | null | undefined;
  metrics: ReturnType<typeof liveMetrics>;
  onSelect: () => void;
}) {
  const paused = status?.readingsPaused === true;
  const offline = status?.online === false && !paused;
  const on = isDeviceOn(status, device);
  const isSensor = device.type === 'SENSOR';
  const danger = isSensor && metrics.some((metric) => ['warn', 'danger'].includes(readingStatus(metric.key, metric.value, range)));
  return (
    <Html position={position} center zIndexRange={[30, 0]}>
      <button type="button" onClick={(event) => { event.stopPropagation(); onSelect(); }} aria-label={`Enfocar ${device.name}`} className={cn('flex items-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-left shadow-xl transition', selected ? 'border-accent/70 bg-[#10251a]/95' : danger || offline ? 'border-warn/50 bg-[#211a0e]/95' : 'border-white/15 bg-[#0b100d]/90 hover:border-white/30')}>
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', on || isSensor ? 'bg-accent/15 text-accent' : 'bg-white/5 text-white/40')}>
          {danger || offline ? <AlertTriangle className="h-3.5 w-3.5 text-warn" /> : isSensor ? <Thermometer className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
        </span>
        <span><span className="block max-w-32 truncate text-[10px] font-medium text-white/85">{device.name}</span><span className={cn('mt-0.5 block text-[9px]', offline || danger ? 'text-warn' : 'text-white/45')}>
          {paused ? 'Lecturas desactivadas' : offline ? 'Sin conexión' : isSensor ? metrics.slice(0, 2).map((metric) => formatReading(metric.value, metric.unit, metric.decimals)).join(' · ') : on ? 'Encendido' : 'Apagado'}
        </span></span>
      </button>
    </Html>
  );
}

export default function SceneCanvas({
  view,
  resetSignal,
  plants,
  devices,
  getStatus,
  selected,
  onSelect,
  reducedMotion,
  mode,
  layers,
  range,
  fallback,
}: {
  view: SceneView;
  resetSignal: number;
  plants: Array<{ plant: Plant; slot: PlantSlot }>;
  devices: Device[];
  getStatus: (deviceId: string) => DeviceStatus | null;
  selected: SceneSelection;
  onSelect: (selection: SceneSelection) => void;
  reducedMotion: boolean;
  mode: LiveMode;
  layers: SceneLayers;
  range: StageRange | null | undefined;
  fallback: ReactNode;
}) {
  const metrics = liveMetrics({ devices, plants: plants.map(({ plant }) => plant) } as Parameters<typeof liveMetrics>[0], getStatus);
  const markerDevices = devices.filter((device) => DEVICE_POSITIONS[device.type] && (mode === 'ambiente' ? device.type === 'SENSOR' : mode === 'equipos' ? device.type !== 'SENSOR' : device.id === (selected?.kind === 'device' ? selected.id : '')));
  return (
    <Canvas aria-label="Réplica 3D interactiva de la carpa" frameloop="demand" camera={{ position: CAMERA_POSITIONS.perspective, fov: 38, near: 0.04, far: 30 }} dpr={[1, 1.5]} shadows gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} onPointerMissed={() => onSelect(null)} fallback={fallback} onCreated={({ gl }) => { gl.shadowMap.autoUpdate = false; gl.shadowMap.needsUpdate = true; }}>
      <color attach="background" args={['#090c0b']} />
      <fog attach="fog" args={['#090c0b', 5.5, 11]} />
      <ambientLight intensity={0.52} />
      <hemisphereLight args={['#e5ece6', '#17211b', 0.85]} />
      <directionalLight position={[2.8, 4.2, 3.2]} intensity={2.1} color="#f0f2e9" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
      <directionalLight position={[-2.5, 1.8, 1.5]} intensity={0.65} color="#a5c5b2" />
      <CarpaModel view={view} plants={plants} devices={devices} getStatus={getStatus} selected={selected} onSelect={onSelect} reducedMotion={reducedMotion} layers={layers} />
      {mode === 'cultivo' ? plants.map(({ plant, slot }) => <PlantHotspot key={plant.id} plant={plant} slot={slot} selected={selected?.kind === 'plant' && selected.id === plant.id} onSelect={() => onSelect({ kind: 'plant', id: plant.id })} />) : null}
      {markerDevices.map((device) => <DeviceHotspot key={device.id} device={device} position={DEVICE_POSITIONS[device.type]!} status={getStatus(device.id)} selected={selected?.kind === 'device' && selected.id === device.id} range={range} metrics={metrics} onSelect={() => onSelect({ kind: 'device', id: device.id })} />)}
      <ContactShadows position={[0, -0.028, 0]} opacity={0.55} scale={5} blur={2.4} far={3} resolution={512} frames={1} color="#000000" />
      <CameraController view={view} resetSignal={resetSignal} selected={selected} plants={plants} devices={devices} reducedMotion={reducedMotion} />
    </Canvas>
  );
}
