'use client';

import { Device, DeviceStatus, Plant } from '@/types';
import { isDeviceOn } from '@/features/home/lib/readings';
import { PlantSlot, SceneSelection, TENT } from '../lib/scene-config';
import { SceneLayers } from '../lib/operations';
import { PlantModel } from './PlantModel';
import { TentModel } from './TentModel';
import { Co2Equipment, ExtractorModel, FanModel, GENERIC_DEVICE_POSITIONS, GenericDeviceModel, LedModel, SensorShelf } from './EquipmentModels';

export function CarpaModel({
  view,
  plants,
  devices,
  getStatus,
  selected,
  onSelect,
  reducedMotion,
  layers,
}: {
  view: 'perspective' | 'front' | 'top';
  plants: Array<{ plant: Plant; slot: PlantSlot }>;
  devices: Device[];
  getStatus: (deviceId: string) => DeviceStatus | null;
  selected: SceneSelection;
  onSelect: (selection: SceneSelection) => void;
  reducedMotion: boolean;
  layers: SceneLayers;
}) {
  const light = devices.find((device) => device.type === 'LUZ');
  const extractor = devices.find((device) => device.type === 'EXTRACTOR');
  const fan = devices.find((device) => device.type === 'VENTILADOR');
  const sensor = devices.find((device) => device.type === 'SENSOR');
  const genericDevices = devices.filter((device) => GENERIC_DEVICE_POSITIONS[device.type]);
  const isSelected = (device: Device | undefined) => Boolean(device && selected?.kind === 'device' && selected.id === device.id);
  return (
    <group>
      <TentModel view={view} layers={layers} />
      {plants.map(({ plant, slot }) => (
        <PlantModel key={plant.id} plant={plant} slot={slot} selected={selected?.kind === 'plant' && selected.id === plant.id} onSelect={() => onSelect({ kind: 'plant', id: plant.id })} />
      ))}
      {view !== 'top' ? <>
        <LedModel active={Boolean(light && isDeviceOn(getStatus(light.id), light))} selected={isSelected(light)} onSelect={light ? () => onSelect({ kind: 'device', id: light.id }) : undefined} wiring={layers.wiring} />
        <ExtractorModel active={Boolean(extractor && isDeviceOn(getStatus(extractor.id), extractor))} selected={isSelected(extractor)} onSelect={extractor ? () => onSelect({ kind: 'device', id: extractor.id }) : undefined} wiring={layers.wiring} />
        <FanModel active={Boolean(fan && isDeviceOn(getStatus(fan.id), fan))} selected={isSelected(fan)} onSelect={fan ? () => onSelect({ kind: 'device', id: fan.id }) : undefined} reducedMotion={reducedMotion} wiring={layers.wiring} />
        <SensorShelf selected={isSelected(sensor)} onSelect={sensor ? () => onSelect({ kind: 'device', id: sensor.id }) : undefined} wiring={layers.wiring} />
        {genericDevices.map((device) => <GenericDeviceModel key={device.id} device={device} active={isDeviceOn(getStatus(device.id), device)} selected={isSelected(device)} onSelect={() => onSelect({ kind: 'device', id: device.id })} />)}
        <Co2Equipment wiring={layers.wiring} />
      </> : null}
      <mesh position={[0, -0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[TENT.width * 5, TENT.depth * 5]} />
        <meshStandardMaterial color="#0b0f0d" roughness={0.98} />
      </mesh>
    </group>
  );
}
