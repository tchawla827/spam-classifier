"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useHeroStore } from "@/lib/hero/heroState";

export function TrashCan() {
  const groupRef = useRef<THREE.Group>(null);
  const rimRef = useRef<THREE.Mesh>(null);
  const prevFillRef = useRef(0);
  const bounceTimeRef = useRef<number | null>(null);
  const rimGlowRef = useRef(0.3); // base emissive intensity

  const binFillLevel = useHeroStore((s) => s.binFillLevel);

  // Subtle idle breathing animation + impact bounce + rim glow
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.05;

    // Detect fill level increase → trigger bounce
    if (binFillLevel > prevFillRef.current) {
      bounceTimeRef.current = 0;
      rimGlowRef.current = 0.8; // flash rim glow
    }
    prevFillRef.current = binFillLevel;

    // Impact bounce animation (damped sine)
    if (bounceTimeRef.current !== null) {
      bounceTimeRef.current += delta;
      const t = bounceTimeRef.current;
      const bounce = Math.sin(t * 15) * Math.exp(-t * 8) * 0.06;
      groupRef.current.position.y = -0.8 + bounce;

      if (t > 0.5) {
        bounceTimeRef.current = null;
        groupRef.current.position.y = -0.8;
      }
    }

    // Rim glow decay
    if (rimRef.current) {
      const mat = rimRef.current.material as THREE.MeshStandardMaterial;
      rimGlowRef.current = THREE.MathUtils.lerp(rimGlowRef.current, 0.3, delta * 4);
      mat.emissiveIntensity = rimGlowRef.current;
    }
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

  // Fill geometry
  const fillHeight = binFillLevel * 1.4;
  const fillY = -1.0 + fillHeight / 2;

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
      <mesh ref={rimRef} geometry={rimGeometry} position={[0, 1.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
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

      {/* Fill level indicator */}
      {fillHeight > 0 && (
        <mesh position={[0, fillY, 0]}>
          <cylinderGeometry args={[0.75, 0.7, fillHeight, 12]} />
          <meshStandardMaterial
            color="#7c3aed"
            transparent
            opacity={0.35}
            emissive="#a78bfa"
            emissiveIntensity={0.15}
          />
        </mesh>
      )}
    </group>
  );
}
