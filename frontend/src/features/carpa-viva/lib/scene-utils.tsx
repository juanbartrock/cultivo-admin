'use client';

import { useMemo } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { CatmullRomCurve3, Quaternion, Vector3 } from 'three';

export function stopAndSelect(event: ThreeEvent<MouseEvent>, onSelect?: () => void) {
  if (!onSelect) return;
  event.stopPropagation();
  onSelect();
}

export function Bar({
  position,
  rotation = [0, 0, 0],
  length,
  radius = 0.01,
  color = '#adb4b1',
  metalness = 0.72,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  length: number;
  radius?: number;
  color?: string;
  metalness?: number;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius, length, 12]} />
      <meshStandardMaterial color={color} roughness={0.32} metalness={metalness} />
    </mesh>
  );
}

export function Branch({ from, to, radius = 0.003, color = '#617347' }: {
  from: [number, number, number];
  to: [number, number, number];
  radius?: number;
  color?: string;
}) {
  const transform = useMemo(() => {
    const start = new Vector3(...from);
    const end = new Vector3(...to);
    const direction = end.clone().sub(start);
    return { midpoint: start.add(end).multiplyScalar(0.5), length: direction.length(), quaternion: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize()) };
  }, [from, to]);
  return (
    <mesh position={transform.midpoint} quaternion={transform.quaternion} castShadow>
      <cylinderGeometry args={[radius * 0.65, radius, transform.length, 7]} />
      <meshStandardMaterial color={color} roughness={0.88} />
    </mesh>
  );
}

export function Cable({ points, color = '#161a18', radius = 0.005 }: { points: Vector3[]; color?: string; radius?: number }) {
  const curve = useMemo(() => new CatmullRomCurve3(points), [points]);
  return (
    <mesh castShadow>
      <tubeGeometry args={[curve, 36, radius, 8, false]} />
      <meshStandardMaterial color={color} roughness={0.82} />
    </mesh>
  );
}

export function SelectionHalo({ position, radius = 0.13 }: { position: [number, number, number]; radius?: number }) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius, radius + 0.008, 48]} />
        <meshBasicMaterial color="#76f7aa" transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <pointLight color="#52ee95" intensity={0.12} distance={0.45} />
    </group>
  );
}
