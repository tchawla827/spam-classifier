"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function TrashCan() {
  const groupRef = useRef<THREE.Group>(null);

  // Subtle idle breathing animation
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.05;
  });

  // Wireframe bin body — tapered cylinder
  const bodyGeometry = useMemo(
    () => new THREE.CylinderGeometry(1.1, 0.85, 2.0, 16, 1, true),
    []
  );

  // Bottom disc
  const bottomGeometry = useMemo(
    () => new THREE.CircleGeometry(0.85, 16),
    []
  );

  // Rim torus at top
  const rimGeometry = useMemo(
    () => new THREE.TorusGeometry(1.1, 0.04, 8, 32),
    []
  );

  return (
    <group ref={groupRef} position={[0, -0.8, 0]}>
      {/* Bin body wireframe */}
      <mesh geometry={bodyGeometry}>
        <meshStandardMaterial
          wireframe
          color="#a78bfa"
          transparent
          opacity={0.5}
          emissive="#7c3aed"
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Bottom */}
      <mesh geometry={bottomGeometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.0, 0]}>
        <meshStandardMaterial
          color="#7c3aed"
          transparent
          opacity={0.15}
        />
      </mesh>

      {/* Top rim */}
      <mesh geometry={rimGeometry} position={[0, 1.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial
          color="#c4b5fd"
          emissive="#a78bfa"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Inner glow plane for depth */}
      <mesh position={[0, -0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.95, 16]} />
        <meshStandardMaterial
          color="#4c1d95"
          transparent
          opacity={0.2}
        />
      </mesh>
    </group>
  );
}
