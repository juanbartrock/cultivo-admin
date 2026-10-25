'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useCursor } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Group, InstancedMesh, Object3D, Vector3 } from 'three';
import { Device } from '@/types';
import { Bar, Cable, SelectionHalo, stopAndSelect } from '../lib/scene-utils';

interface InteractiveProps { selected?: boolean; onSelect?: () => void }

export function LedModel({ active, selected, onSelect, wiring }: { active: boolean; wiring: boolean } & InteractiveProps) {
  const diodes = useRef<InstancedMesh>(null);
  const count = 6 * 4 * 12;
  useLayoutEffect(() => {
    if (!diodes.current) return;
    const dummy = new Object3D();
    let index = 0;
    for (let panelX = 0; panelX < 3; panelX++) {
      for (let panelZ = 0; panelZ < 2; panelZ++) {
        for (let diode = 0; diode < 12; diode++) {
          dummy.position.set(-0.18 + panelX * 0.18 + (diode % 4) * 0.028, 1.711, -0.22 + panelZ * 0.24 + Math.floor(diode / 4) * 0.036);
          dummy.updateMatrix();
          diodes.current.setMatrixAt(index++, dummy.matrix);
        }
      }
    }
    diodes.current.instanceMatrix.needsUpdate = true;
  }, []);
  useCursor(Boolean(onSelect));
  return (
    <group onClick={(event) => stopAndSelect(event, onSelect)}>
      <mesh position={[0, 1.75, -0.08]} castShadow>
        <boxGeometry args={[0.5, 0.075, 0.5]} />
        <meshStandardMaterial color="#202624" roughness={0.35} metalness={0.72} />
      </mesh>
      {[-0.245, 0.245].map((x) => <mesh key={x} position={[x, 1.75, -0.08]}><boxGeometry args={[0.012, 0.087, 0.5]} /><meshStandardMaterial color="#353c39" metalness={0.8} roughness={0.3} /></mesh>)}
      {Array.from({ length: 18 }, (_, index) => <mesh key={index} position={[-0.22 + index * 0.026, 1.796, -0.08]}><boxGeometry args={[0.008, 0.025, 0.43]} /><meshStandardMaterial color="#303633" metalness={0.76} roughness={0.38} /></mesh>)}
      {[-0.18, 0, 0.18].flatMap((x) => [-0.2, 0.04].map((z) => (
        <group key={`${x}-${z}`}>
          <mesh position={[x, 1.709, z]}>
            <boxGeometry args={[0.15, 0.009, 0.2]} />
            <meshStandardMaterial color="#9ba19b" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[x, 1.703, z]}>
            <planeGeometry args={[0.14, 0.19]} />
            <meshStandardMaterial color={active ? '#f2e7ce' : '#555c58'} emissive={active ? '#d9c8ff' : '#000000'} emissiveIntensity={active ? 1.5 : 0} />
          </mesh>
        </group>
      )))}
      <instancedMesh ref={diodes} args={[undefined, undefined, count]}>
        <sphereGeometry args={[0.006, 6, 4]} />
        <meshStandardMaterial color={active ? '#fff0d8' : '#777d78'} emissive={active ? '#d4baff' : '#000000'} emissiveIntensity={active ? 3 : 0} toneMapped={!active} />
      </instancedMesh>
      {[-0.18, 0.18].map((x) => <group key={x}>
        <mesh position={[x, 1.88, -0.08]}><boxGeometry args={[0.022, 0.23, 0.032]} /><meshStandardMaterial color="#121614" roughness={0.92} /></mesh>
        <mesh position={[x, 1.805, -0.045]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.025, 0.004, 8, 20]} /><meshStandardMaterial color="#8d9691" metalness={0.8} roughness={0.25} /></mesh>
      </group>)}
      {wiring ? <Cable points={[new Vector3(-0.22, 1.78, -0.15), new Vector3(-0.3, 1.55, -0.34), new Vector3(-0.38, 1.43, -0.43), new Vector3(-0.46, 1.84, -0.5), new Vector3(-0.51, 1.35, -0.52)]} radius={0.0055} /> : null}
      {active ? <><pointLight position={[0, 1.65, -0.08]} color="#eee0ff" intensity={2.8} distance={2.8} decay={2} /><rectAreaLight position={[0, 1.68, -0.08]} rotation={[-Math.PI / 2, 0, 0]} args={['#eadfff', 3.5, 0.48, 0.48]} /></> : null}
      {selected ? <SelectionHalo position={[0, 1.69, 0.25]} radius={0.08} /> : null}
    </group>
  );
}

export function ExtractorModel({ active, selected, onSelect, wiring }: { active: boolean; wiring: boolean } & InteractiveProps) {
  const rotor = useRef<Group>(null);
  useCursor(Boolean(onSelect));
  useFrame((_, delta) => { if (active && rotor.current) rotor.current.rotation.z += delta * 2; });
  return (
    <group onClick={(event) => stopAndSelect(event, onSelect)}>
      <mesh position={[0.39, 1.76, -0.39]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.135, 0.135, 0.27, 32]} />
        <meshStandardMaterial color="#b4bab7" roughness={0.31} metalness={0.52} />
      </mesh>
      {[-0.1, 0.1].map((offset) => <mesh key={offset} position={[0.39, 1.76, -0.39 + offset]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.135, 0.009, 8, 32]} /><meshStandardMaterial color="#222825" roughness={0.7} /></mesh>)}
      <mesh position={[0.39, 1.76, -0.245]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.012, 32]} />
        <meshStandardMaterial color="#101412" roughness={0.8} />
      </mesh>
      <group ref={rotor} position={[0.39, 1.76, -0.235]}>
        {[0, 1, 2, 3, 4].map((blade) => <mesh key={blade} rotation={[0, 0, blade * Math.PI * 0.4]} position={[0, 0.042, 0]}><boxGeometry args={[0.035, 0.09, 0.006]} /><meshStandardMaterial color="#424a45" roughness={0.55} /></mesh>)}
      </group>
      <Cable points={[new Vector3(0.39, 1.78, -0.49), new Vector3(0.4, 1.92, -0.5), new Vector3(0.42, 2.05, -0.36), new Vector3(0.47, 2.07, 0.38)]} radius={0.065} color="#a3aaa6" />
      {Array.from({ length: 12 }, (_, index) => <mesh key={index} position={[0.47, 2.07, -0.18 + index * 0.047]}><torusGeometry args={[0.065, 0.0035, 7, 24]} /><meshStandardMaterial color="#c1c5c1" metalness={0.5} roughness={0.4} /></mesh>)}
      {wiring ? <Cable points={[new Vector3(0.46, 1.75, -0.35), new Vector3(0.51, 1.5, -0.46), new Vector3(0.48, 1.18, -0.5)]} radius={0.004} /> : null}
      {selected ? <SelectionHalo position={[0.39, 1.53, -0.26]} radius={0.075} /> : null}
    </group>
  );
}

export function FanModel({ active, selected, onSelect, reducedMotion, wiring }: { active: boolean; reducedMotion: boolean; wiring: boolean } & InteractiveProps) {
  const blades = useRef<Group>(null);
  useCursor(Boolean(onSelect));
  useFrame((_, delta) => { if (active && !reducedMotion && blades.current) blades.current.rotation.z -= delta * 9; });
  return (
    <group position={[-0.46, 1.4, -0.4]} rotation={[0.05, 0.25, -0.08]} onClick={(event) => stopAndSelect(event, onSelect)}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.12, 0.105, 0.065, 32]} /><meshStandardMaterial color="#c6cbc6" roughness={0.4} metalness={0.22} /></mesh>
      <mesh position={[0, 0, 0.037]}><circleGeometry args={[0.105, 32]} /><meshStandardMaterial color="#193b4b" roughness={0.6} /></mesh>
      <group ref={blades} position={[0, 0, 0.043]}>
        {[0, 1, 2, 3].map((blade) => <mesh key={blade} position={[0.018, 0.046, 0]} rotation={[0, 0, blade * Math.PI / 2 + 0.35]}><sphereGeometry args={[0.05, 12, 8]} /><meshStandardMaterial color="#247aa0" roughness={0.48} /></mesh>)}
      </group>
      {[0.036, 0.058, 0.08, 0.103, 0.121].map((radius) => <mesh key={radius} position={[0, 0, 0.065]}><torusGeometry args={[radius, 0.002, 6, 40]} /><meshStandardMaterial color="#c4cbc7" metalness={0.75} roughness={0.28} /></mesh>)}
      {Array.from({ length: 12 }, (_, index) => <mesh key={index} position={[0, 0, 0.064]} rotation={[0, 0, index * Math.PI / 12]}><boxGeometry args={[0.003, 0.24, 0.003]} /><meshStandardMaterial color="#bcc4bf" metalness={0.72} roughness={0.3} /></mesh>)}
      <mesh position={[0, 0, 0.069]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.023, 0.023, 0.015, 20]} /><meshStandardMaterial color="#d4d8d4" roughness={0.4} /></mesh>
      <Bar position={[0, -0.17, -0.025]} length={0.19} radius={0.015} color="#c3c9c5" />
      <mesh position={[0, -0.27, -0.025]}><boxGeometry args={[0.07, 0.065, 0.05]} /><meshStandardMaterial color="#b5bcb7" roughness={0.48} /></mesh>
      {wiring ? <Cable points={[new Vector3(0, -0.06, -0.06), new Vector3(-0.07, -0.35, -0.06), new Vector3(-0.05, -0.65, -0.08), new Vector3(-0.03, -1.34, -0.05)]} /> : null}
      {selected ? <SelectionHalo position={[0, -0.15, 0.09]} radius={0.075} /> : null}
    </group>
  );
}

export function SensorShelf({ selected, onSelect, wiring }: InteractiveProps & { wiring: boolean }) {
  useCursor(Boolean(onSelect));
  return (
    <group position={[-0.49, 0.79, -0.02]} onClick={(event) => stopAndSelect(event, onSelect)}>
      <mesh castShadow><boxGeometry args={[0.2, 0.018, 0.25]} /><meshStandardMaterial color="#315c48" roughness={0.64} metalness={0.12} /></mesh>
      <mesh position={[-0.035, 0.043, 0.005]} castShadow><boxGeometry args={[0.075, 0.068, 0.09]} /><meshStandardMaterial color="#176a9c" roughness={0.45} /></mesh>
      <mesh position={[-0.035, 0.079, 0.005]}><boxGeometry args={[0.055, 0.006, 0.065]} /><meshStandardMaterial color="#0f2733" roughness={0.4} /></mesh>
      <mesh position={[0.052, 0.035, 0.02]}><boxGeometry args={[0.06, 0.052, 0.075]} /><meshStandardMaterial color="#1b201d" roughness={0.75} /></mesh>
      <mesh position={[0.052, 0.063, 0.02]}><planeGeometry args={[0.04, 0.052]} /><meshStandardMaterial color="#343b37" roughness={0.4} /></mesh>
      {wiring ? <Cable points={[new Vector3(-0.04, 0.05, -0.04), new Vector3(-0.06, -0.18, -0.06), new Vector3(-0.04, -0.5, -0.04)]} radius={0.003} color="#d3d0ba" /> : null}
      {selected ? <SelectionHalo position={[0, 0.11, 0]} radius={0.07} /> : null}
    </group>
  );
}

export function Co2Equipment({ wiring }: { wiring: boolean }) {
  return (
    <group>
      <mesh position={[0.82, 0.36, -0.24]} castShadow><cylinderGeometry args={[0.09, 0.1, 0.62, 28]} /><meshStandardMaterial color="#1d2421" roughness={0.38} metalness={0.65} /></mesh>
      <mesh position={[0.82, 0.69, -0.24]}><cylinderGeometry args={[0.026, 0.04, 0.09, 16]} /><meshStandardMaterial color="#737c77" metalness={0.8} roughness={0.26} /></mesh>
      {[-0.045, 0.045].map((x) => <group key={x}><mesh position={[0.82 + x, 0.68, -0.15]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.037, 0.037, 0.026, 24]} /><meshStandardMaterial color="#d0d3ce" metalness={0.45} roughness={0.3} /></mesh><mesh position={[0.82 + x, 0.68, -0.135]}><circleGeometry args={[0.028, 24]} /><meshStandardMaterial color="#e2e0d5" roughness={0.65} /></mesh><mesh position={[0.82 + x, 0.68, -0.132]} rotation={[0, 0, x > 0 ? 0.6 : -0.4]}><boxGeometry args={[0.002, 0.025, 0.002]} /><meshBasicMaterial color="#333a35" /></mesh></group>)}
      {wiring ? <Cable points={[new Vector3(0.82, 0.65, -0.24), new Vector3(0.7, 0.95, -0.36), new Vector3(0.6, 1.25, -0.43), new Vector3(0.51, 1.72, -0.46)]} radius={0.005} color="#d6d2b8" /> : null}
    </group>
  );
}

export const GENERIC_DEVICE_POSITIONS: Partial<Record<Device['type'], [number, number, number]>> = {
  HUMIDIFICADOR: [0.36, 0.24, 0.18],
  DESHUMIDIFICADOR: [0.36, 0.24, 0.18],
  AIRE_ACONDICIONADO: [0.4, 1.2, -0.42],
  BOMBA_RIEGO: [0.34, 0.13, 0.2],
  CALEFACTOR: [0.35, 0.24, 0.15],
  ENCHUFE: [0.49, 0.82, -0.36],
};

export function GenericDeviceModel({ device, active, selected, onSelect }: {
  device: Device;
  active: boolean;
} & InteractiveProps) {
  const position = GENERIC_DEVICE_POSITIONS[device.type];
  useCursor(Boolean(onSelect));
  if (!position) return null;
  const isHumidifier = device.type === 'HUMIDIFICADOR' || device.type === 'DESHUMIDIFICADOR';
  return (
    <group position={position} onClick={(event) => stopAndSelect(event, onSelect)}>
      {isHumidifier ? <>
        <mesh castShadow><cylinderGeometry args={[0.09, 0.105, 0.28, 24]} /><meshStandardMaterial color="#c1c8c4" roughness={0.46} /></mesh>
        <mesh position={[0, 0.15, 0]}><cylinderGeometry args={[0.075, 0.09, 0.025, 24]} /><meshStandardMaterial color="#303835" roughness={0.5} /></mesh>
        <mesh position={[0, 0.185, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[0.024, 0.008, 8, 24]} /><meshStandardMaterial color="#171d1a" roughness={0.7} /></mesh>
      </> : <>
        <mesh castShadow><boxGeometry args={[0.16, 0.19, 0.11]} /><meshStandardMaterial color="#343c38" roughness={0.48} metalness={0.24} /></mesh>
        <mesh position={[0, 0.025, 0.057]}><planeGeometry args={[0.11, 0.065]} /><meshStandardMaterial color="#111714" roughness={0.5} /></mesh>
      </>}
      <mesh position={[0.05, 0.075, 0.058]}><sphereGeometry args={[0.006, 8, 6]} /><meshBasicMaterial color={active ? '#61ed9b' : '#59615c'} /></mesh>
      {selected ? <SelectionHalo position={[0, -0.15, 0]} radius={0.07} /> : null}
    </group>
  );
}
