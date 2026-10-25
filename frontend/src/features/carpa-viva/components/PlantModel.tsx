'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useCursor } from '@react-three/drei';
import {
  BufferGeometry,
  Color,
  DoubleSide,
  Euler,
  Float32BufferAttribute,
  InstancedMesh,
  Matrix4,
  Object3D,
} from 'three';
import { Plant } from '@/types';
import { PlantSlot } from '../lib/scene-config';
import { Branch, SelectionHalo, stopAndSelect } from '../lib/scene-utils';

function leafGeometry() {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const segments = 22;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const width = Math.sin(Math.PI * t) * 0.13 * (i % 2 ? 0.82 : 1.08);
    const droop = -0.12 * t * t + 0.055 * Math.sin(Math.PI * t);
    positions.push(-width, t, droop - width * 0.25, 0, t, droop + 0.016, width, t, droop - width * 0.25);
    colors.push(0.64, 0.78, 0.62, 0.9, 1, 0.82, 0.64, 0.78, 0.62);
    if (i < segments) {
      const a = i * 3;
      indices.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
const LEAF_GEOMETRY = leafGeometry();

function seeded(seed: string) {
  let value = Array.from(seed).reduce((sum, letter) => sum + letter.charCodeAt(0), 17);
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

export function PlantModel({ plant, slot, selected, onSelect }: {
  plant: Plant;
  slot: PlantSlot;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const leaves = useRef<InstancedMesh>(null);
  const random = useMemo(() => seeded(slot.key), [slot.key]);
  const model = useMemo(() => {
    const branches: Array<{ from: [number, number, number]; to: [number, number, number] }> = [];
    const instances: Array<{ matrix: Matrix4; shade: number }> = [];
    const dummy = new Object3D();
    const baseY = 0.105;
    const height = slot.height;
    const nodes = 6;
    for (let node = 0; node < nodes; node++) {
      const fraction = (node + 1) / (nodes + 0.4);
      const y = baseY + height * fraction * 0.84;
      const size = (0.115 + random() * 0.035) * (1 - fraction * 0.52);
      for (let side = 0; side < 2; side++) {
        const azimuth = node * 2.34 + side * Math.PI + random() * 0.35;
        const reach = size * (0.7 + random() * 0.25);
        const end: [number, number, number] = [Math.sin(azimuth) * reach * 0.55, y + 0.012, Math.cos(azimuth) * reach * 0.55];
        branches.push({ from: [0, y - 0.014, 0], to: end });
        for (let leaflet = 0; leaflet < 7; leaflet++) {
          const fan = (leaflet - 3) * 0.37;
          const lengthFactor = leaflet === 3 ? 1 : leaflet === 2 || leaflet === 4 ? 0.83 : leaflet === 1 || leaflet === 5 ? 0.63 : 0.4;
          const angle = azimuth + fan;
          dummy.position.set(end[0], end[1], end[2]);
          dummy.quaternion.setFromEuler(new Euler(-Math.PI / 2 + 0.18 + random() * 0.16, 0, -angle, 'XYZ'));
          dummy.scale.set(size * (0.75 + lengthFactor * 0.3), size * lengthFactor, size);
          dummy.updateMatrix();
          instances.push({ matrix: dummy.matrix.clone(), shade: random() });
        }
      }
    }
    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * 0.4;
      dummy.position.set(0, baseY + height * 0.84, 0);
      dummy.quaternion.setFromEuler(new Euler(-1.15, 0, -angle));
      dummy.scale.set(0.045, 0.065, 0.05);
      dummy.updateMatrix();
      instances.push({ matrix: dummy.matrix.clone(), shade: 0.8 + random() * 0.2 });
    }
    return { branches, instances };
  }, [random, slot.height]);

  useLayoutEffect(() => {
    if (!leaves.current) return;
    model.instances.forEach((instance, index) => {
      leaves.current!.setMatrixAt(index, instance.matrix);
      leaves.current!.setColorAt(index, new Color().setHSL(0.31 + instance.shade * 0.025, 0.42 + instance.shade * 0.18, 0.23 + instance.shade * 0.13));
    });
    leaves.current.instanceMatrix.needsUpdate = true;
    if (leaves.current.instanceColor) leaves.current.instanceColor.needsUpdate = true;
  }, [model]);
  useCursor(Boolean(onSelect));
  const [x, y, z] = slot.position;

  return (
    <group position={[x, y, z]} onClick={(event) => stopAndSelect(event, onSelect)} name={`plant-${plant.id}`}>
      <mesh position={[0, 0.057, 0]} rotation={[0, Math.PI / 4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.071, 0.052, 0.114, 4]} />
        <meshStandardMaterial color="#101311" roughness={0.68} />
      </mesh>
      <mesh position={[0, 0.111, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <cylinderGeometry args={[0.074, 0.074, 0.012, 4]} />
        <meshStandardMaterial color="#1b201d" roughness={0.62} />
      </mesh>
      <mesh position={[0, 0.118, 0]} rotation={[0, Math.PI / 4, 0]}>
        <cylinderGeometry args={[0.063, 0.063, 0.005, 4]} />
        <meshStandardMaterial color="#282219" roughness={1} />
      </mesh>
      <mesh position={[0, 0.062, 0.058]} rotation={[-0.09, 0, 0]}>
        <planeGeometry args={[0.065, 0.052]} />
        <meshStandardMaterial color="#c5b92c" roughness={0.74} />
      </mesh>
      {[0.052, 0.061, 0.07].map((line) => <mesh key={line} position={[0, line, 0.0588]}><planeGeometry args={[0.043, 0.0015]} /><meshBasicMaterial color="#35371c" /></mesh>)}
      <mesh position={[0.073, 0.045, 0.025]} rotation={[0, 0, -0.25]}>
        <boxGeometry args={[0.003, 0.09, 0.024]} />
        <meshStandardMaterial color="#d1ba24" roughness={0.8} />
      </mesh>
      <Branch from={[0, 0.105, 0]} to={[0.006, 0.105 + slot.height * 0.9, 0]} radius={0.005} color="#607544" />
      {model.branches.map((branch, index) => <Branch key={index} {...branch} radius={0.0024} />)}
      <instancedMesh ref={leaves} args={[LEAF_GEOMETRY, undefined, model.instances.length]} castShadow receiveShadow>
        <meshStandardMaterial vertexColors side={DoubleSide} roughness={0.72} metalness={0.02} />
      </instancedMesh>
      {selected ? <SelectionHalo position={[0, 0.012, 0]} radius={0.1} /> : null}
    </group>
  );
}
