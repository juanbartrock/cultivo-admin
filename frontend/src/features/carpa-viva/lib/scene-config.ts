import { Device, DeviceType, Plant } from '@/types';

export const TENT = {
  width: 1.2,
  depth: 1.2,
  height: 2,
  ledSize: 0.5,
  ledHeight: 1.75,
  netHeights: [0.7, 0.95],
} as const;

export type SceneSelection =
  | { kind: 'plant'; id: string }
  | { kind: 'device'; id: string }
  | null;

export type SceneView = 'perspective' | 'front' | 'top';

export interface PlantSlot {
  key: string;
  strain: string;
  position: [number, number, number];
  height: number;
}

export const PLANT_SLOTS: PlantSlot[] = [
  { key: 'back-left', strain: 'tropicana', position: [-0.36, 0.02, -0.27], height: 0.29 },
  { key: 'back-center', strain: 'tropicana', position: [-0.1, 0.02, -0.29], height: 0.32 },
  { key: 'back-right', strain: 'guarani', position: [0.17, 0.02, -0.25], height: 0.27 },
  { key: 'front-left', strain: 'guarani', position: [-0.39, 0.02, 0.04], height: 0.25 },
  { key: 'front-center', strain: 'choque', position: [-0.12, 0.02, 0.07], height: 0.27 },
  { key: 'front-right', strain: 'celosa', position: [0.16, 0.02, 0.05], height: 0.24 },
];

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function mainZone(plant: Plant) {
  const [zone] = [...(plant.zones ?? [])].sort((a, b) => b.coverage - a.coverage);
  return zone?.zone;
}

// PLANT_SLOTS sigue la grilla de zonas mirando desde la puerta: 1-2-3 fondo, 4-5-6 frente.
// La zona cargada manda; sin zona, la planta cae en el slot de su genética.
export function resolvePlantSlots(plants: Plant[]) {
  const remaining: Plant[] = [];
  const assignments: Array<{ plant: Plant; slot: PlantSlot }> = [];
  const taken = new Set<string>();
  const assign = (plant: Plant, slot: PlantSlot) => {
    assignments.push({ plant, slot });
    taken.add(slot.key);
  };

  for (const plant of plants) {
    const zone = mainZone(plant);
    const slot = zone ? PLANT_SLOTS[zone - 1] : undefined;
    if (slot && !taken.has(slot.key)) assign(plant, slot);
    else remaining.push(plant);
  }

  for (const slot of PLANT_SLOTS) {
    if (taken.has(slot.key)) continue;
    const index = remaining.findIndex((plant) =>
      normalize(plant.strain?.name ?? '').includes(slot.strain),
    );
    if (index >= 0) assign(remaining.splice(index, 1)[0], slot);
  }

  for (const slot of PLANT_SLOTS) {
    if (!remaining.length) break;
    if (!taken.has(slot.key)) assign(remaining.shift()!, slot);
  }

  return assignments;
}

export function primaryDevice(devices: Device[], type: DeviceType) {
  return devices.find((device) => device.type === type) ?? null;
}
