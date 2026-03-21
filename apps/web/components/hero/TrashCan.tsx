"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useHeroStore } from "@/lib/hero/heroState";

const PARTICLE_COUNT = 8;
const PARTICLE_LIFETIME = 0.4; // seconds

type ParticleData = { age: number; active: boolean; vx: number; vy: number; vz: number };

export function TrashCan() {
  const groupRef = useRef<THREE.Group>(null);
  const rimRef = useRef<THREE.Mesh>(null);
  const prevFillRef = useRef(0);
  const bounceTimeRef = useRef<number | null>(null);
  const rimGlowRef = useRef(0.3); // base emissive intensity

  const particleDataRef = useRef<ParticleData[]>(
    Array.from({ length: PARTICLE_COUNT }, () => ({ age: 0, active: false, vx: 0, vy: 0, vz: 0 }))
  );
  const particleMeshRefs = useRef<(THREE.Mesh | null)[]>(Array(PARTICLE_COUNT).fill(null));

  const binFillLevel = useHeroStore((s) => s.binFillLevel);

  // Subtle idle breathing animation + impact bounce + rim glow
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.05;

    // Detect fill level increase → trigger bounce + particle burst
    if (binFillLevel > prevFillRef.current) {
      bounceTimeRef.current = 0;
      rimGlowRef.current = 0.8; // flash rim glow

      // Spawn particles bursting from the rim (local y=1.0)
      particleDataRef.current.forEach((p, i) => {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
        const speed = 1.2 + Math.random() * 0.8;
        p.age = 0;
        p.active = true;
        p.vx = Math.cos(angle) * speed;
        p.vy = 1.8 + Math.random() * 1.2;
        p.vz = Math.sin(angle) * speed;
        const mesh = particleMeshRefs.current[i];
        if (mesh) {
          // Start at rim radius, spread around the opening
          mesh.position.set(Math.cos(angle) * 0.9, 1.0, Math.sin(angle) * 0.9);
          mesh.scale.setScalar(1);
          mesh.visible = true;
        }
      });
    }
    prevFillRef.current = binFillLevel;

    // Update particles
    particleDataRef.current.forEach((p, i) => {
      if (!p.active) return;
      p.age += delta;
      const mesh = particleMeshRefs.current[i];
      if (!mesh) return;
      if (p.age >= PARTICLE_LIFETIME) {
        p.active = false;
        mesh.visible = false;
        return;
      }
      // Move with gravity
      mesh.position.x += p.vx * delta;
      mesh.position.y += p.vy * delta;
      mesh.position.z += p.vz * delta;
      p.vy -= 9 * delta;
      // Scale to zero as particle ages
      const lifeRatio = 1 - p.age / PARTICLE_LIFETIME;
      mesh.scale.setScalar(lifeRatio);
    });

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

      {/* Impact particles — pooled, driven by refs */}
      {Array.from({ length: PARTICLE_COUNT }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => { particleMeshRefs.current[i] = el; }}
          visible={false}
        >
          <sphereGeometry args={[0.07, 4, 4]} />
          <meshBasicMaterial color="#c4b5fd" />
        </mesh>
      ))}
    </group>
  );
}
