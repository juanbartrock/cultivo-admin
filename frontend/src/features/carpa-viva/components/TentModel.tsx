'use client';

import { useMemo } from 'react';
import { DoubleSide, PlaneGeometry, Vector3 } from 'three';
import { Bar, Cable } from '../lib/scene-utils';

function FabricPanel({ position, rotation = [0, 0, 0], width, height, tone = '#a4a9a5', seed = 0 }: {
  position: [number, number, number];
  rotation?: [number, number, number];
  width: number;
  height: number;
  tone?: string;
  seed?: number;
}) {
  const geometry = useMemo(() => {
    const panel = new PlaneGeometry(width, height, 28, 38);
    const positions = panel.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const wrinkle = Math.sin(x * 29 + y * 6 + seed) * 0.004 + Math.sin(y * 23 - x * 11 + seed) * 0.003 + Math.sin((x + y) * 52) * 0.0012;
      const tension = Math.sin((x / width + 0.5) * Math.PI) * Math.sin((y / height + 0.5) * Math.PI);
      positions.setZ(i, wrinkle * (0.4 + tension));
    }
    panel.computeVertexNormals();
    return panel;
  }, [width, height, seed]);
  return (
    <mesh geometry={geometry} position={position} rotation={rotation} receiveShadow castShadow>
      <meshStandardMaterial color={tone} roughness={0.46} metalness={0.22} side={DoubleSide} />
    </mesh>
  );
}

function Zipper({ x, z = 0.613 }: { x: number; z?: number }) {
  return (
    <group>
      <Bar position={[x, 0.99, z]} length={1.94} radius={0.009} color="#111513" metalness={0.05} />
      <mesh position={[x + 0.012, 1.84, z + 0.007]}>
        <boxGeometry args={[0.018, 0.038, 0.009]} />
        <meshStandardMaterial color="#262c29" metalness={0.65} roughness={0.35} />
      </mesh>
      <mesh position={[x + 0.012, 1.81, z + 0.009]}>
        <torusGeometry args={[0.012, 0.002, 6, 14]} />
        <meshStandardMaterial color="#8b918e" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

function ScrogNet({ height, layer }: { height: number; layer: number }) {
  const lines = useMemo(() => Array.from({ length: 9 }, (_, index) => -0.48 + index * 0.12), []);
  return (
    <group>
      {lines.map((x, index) => {
        const curve = [new Vector3(x, height, -0.52), new Vector3(x + 0.009 * Math.sin(index * 2), height - 0.012, 0), new Vector3(x - 0.006, height + 0.004, 0.52)];
        return <Cable key={`x-${x}`} points={curve} radius={0.0027} color={index % 2 ? '#d77735' : '#e38a44'} />;
      })}
      {lines.map((z, index) => <Cable key={`z-${z}`} points={[new Vector3(-0.52, height + 0.002, z), new Vector3(0, height - 0.008 + Math.sin(index) * 0.005, z + 0.007), new Vector3(0.52, height, z)]} radius={0.0023} color="#cf6c30" />)}
      {[-0.52, 0.52].flatMap((x) => [-0.52, 0.52].map((z) => (
        <group key={`${x}-${z}`}>
          <Cable points={[new Vector3(x, height - 0.015, z), new Vector3(x * 1.09, height + 0.02, z * 1.08), new Vector3(x * 1.12, height + 0.07 + layer * 0.02, z * 1.12)]} radius={0.0032} color="#d87937" />
          <mesh position={[x, height, z]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[0.011, 0.0025, 6, 16]} /><meshStandardMaterial color="#ee9450" roughness={0.8} /></mesh>
        </group>
      )))}
    </group>
  );
}

export function TentModel({ view, layers }: {
  view: 'perspective' | 'front' | 'top';
  layers: { structure: boolean; nets: boolean; wiring: boolean };
}) {
  return (
    <group>
      <mesh position={[0, -0.005, 0]} receiveShadow>
        <boxGeometry args={[1.26, 0.035, 1.26]} />
        <meshStandardMaterial color="#101412" roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.018, 0]} receiveShadow>
        <boxGeometry args={[1.19, 0.02, 1.19]} />
        <meshStandardMaterial color="#d4d5cf" roughness={0.7} metalness={0.04} />
      </mesh>
      {layers.structure ? (
        <group>
          <FabricPanel position={[0, 1, -0.6]} width={1.2} height={2} seed={1} />
          <FabricPanel position={[-0.6, 1, 0]} rotation={[0, Math.PI / 2, 0]} width={1.2} height={2} tone="#979e99" seed={4} />
          {view !== 'perspective' ? <FabricPanel position={[0.6, 1, 0]} rotation={[0, -Math.PI / 2, 0]} width={1.2} height={2} tone="#a9aeaa" seed={7} /> : null}
          {view !== 'top' ? <FabricPanel position={[0, 2, 0]} rotation={[Math.PI / 2, 0, 0]} width={1.2} height={1.2} tone="#b2b6b1" seed={2} /> : null}
          <FabricPanel position={[0, 1.94, 0.605]} width={1.2} height={0.12} tone="#a6aaa6" seed={8} />
          <FabricPanel position={[-0.565, 0.99, 0.605]} width={0.07} height={1.9} tone="#9ba19c" seed={5} />
          <Zipper x={-0.54} /><Zipper x={0.56} />
          <Bar position={[0, 0.04, 0.612]} rotation={[0, 0, Math.PI / 2]} length={1.2} radius={0.013} color="#101412" metalness={0.05} />
          <mesh position={[0.48, 1.925, 0.616]}>
            <boxGeometry args={[0.13, 0.052, 0.005]} />
            <meshStandardMaterial color="#141a17" roughness={0.7} />
          </mesh>
          {[0, 1, 2].map((index) => <mesh key={index} position={[0.46 + index * 0.018, 1.926, 0.619]}><circleGeometry args={[0.005, 10]} /><meshBasicMaterial color={index === 1 ? '#c88742' : '#62936e'} /></mesh>)}
          <mesh position={[0.602, 0.33, 0.18]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.105, 0.009, 10, 36]} />
            <meshStandardMaterial color="#171c19" roughness={0.8} />
          </mesh>
          <mesh position={[0.605, 0.33, 0.18]} rotation={[0, Math.PI / 2, 0]}>
            <circleGeometry args={[0.097, 36]} />
            <meshStandardMaterial color="#343a36" roughness={0.9} side={DoubleSide} />
          </mesh>
          <mesh position={[0.61, 1.38, -0.34]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.16, 0.009, 10, 40]} />
            <meshStandardMaterial color="#222824" roughness={0.8} />
          </mesh>
        </group>
      ) : null}
      {[-0.585, 0.585].flatMap((x) => [-0.585, 0.585].map((z) => <Bar key={`${x}-${z}`} position={[x, 1, z]} length={1.98} radius={0.011} />))}
      {[-0.585, 0.585].map((z) => <Bar key={`roof-x-${z}`} position={[0, 1.98, z]} rotation={[0, 0, Math.PI / 2]} length={1.17} />)}
      {[-0.585, 0.585].map((x) => <Bar key={`roof-z-${x}`} position={[x, 1.98, 0]} rotation={[Math.PI / 2, 0, 0]} length={1.17} />)}
      <Bar position={[0, 1.96, 0]} rotation={[0, 0, Math.PI / 2]} length={1.17} radius={0.012} />
      {layers.nets ? <>{[0.7, 0.95].map((height, index) => <ScrogNet key={height} height={height} layer={index} />)}</> : null}
      {layers.wiring ? <>
        <Cable points={[new Vector3(-0.54, 1.82, -0.45), new Vector3(-0.52, 1.2, -0.51), new Vector3(-0.51, 0.74, -0.3), new Vector3(-0.54, 0.05, -0.15)]} />
        <Cable points={[new Vector3(-0.49, 0.85, -0.06), new Vector3(-0.52, 0.5, -0.13), new Vector3(-0.49, 0.04, -0.06)]} color="#cfccb6" radius={0.003} />
      </> : null}
    </group>
  );
}
