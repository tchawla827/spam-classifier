"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, Html } from "@react-three/drei";
import * as THREE from "three";
import type { SpamPaperData } from "@/lib/hero/types";
import { useHeroStore } from "@/lib/hero/heroState";
import {
  THROW_DURATION,
  ROTATION_SPEED,
  SQUASH_AMOUNT,
  LANDED_DISPLAY_TIME,
  TRASH_TARGET,
  computeArcPosition,
} from "@/lib/hero/throwConfig";

interface SpamPaperProps {
  data: SpamPaperData;
  reducedMotion?: boolean;
}

function CrumpledGeometry() {
  const geometry = useMemo(() => {
    const geo = new THREE.DodecahedronGeometry(0.35, 1);
    const positions = geo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      positions.setX(i, positions.getX(i) + (Math.random() - 0.5) * 0.08);
      positions.setY(i, positions.getY(i) + (Math.random() - 0.5) * 0.08);
      positions.setZ(i, positions.getZ(i) + (Math.random() - 0.5) * 0.08);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);
  return geometry;
}

function PaperMesh({ data, reducedMotion }: SpamPaperProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const hoverPaper = useHeroStore((s) => s.hoverPaper);
  const unhoverPaper = useHeroStore((s) => s.unhoverPaper);
  const selectPaper = useHeroStore((s) => s.selectPaper);
  const landPaper = useHeroStore((s) => s.landPaper);
  const removePaper = useHeroStore((s) => s.removePaper);
  const geometry = CrumpledGeometry();
  const targetScale = hovered ? 1.15 : 1.0;

  // Flight state refs
  const startPosRef = useRef<[number, number, number] | null>(null);
  const hasLandedRef = useRef(false);

  // Capture world position when flight starts
  useEffect(() => {
    if (data.status === "flying" && meshRef.current) {
      if (reducedMotion) {
        // Skip animation entirely for reduced motion
        removePaper(data.id);
        return;
      }
      const worldPos = new THREE.Vector3();
      meshRef.current.getWorldPosition(worldPos);
      startPosRef.current = [worldPos.x, worldPos.y, worldPos.z];
      hasLandedRef.current = false;
    }
  }, [data.status, data.id, reducedMotion, removePaper]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    if (data.status === "flying" && data.flyStartTime && startPosRef.current) {
      const elapsed = performance.now() - data.flyStartTime;
      const tLinear = Math.min(elapsed / THROW_DURATION, 1);
      // Ease-out
      const t = 1 - (1 - tLinear) * (1 - tLinear);

      const pos = computeArcPosition(startPosRef.current, TRASH_TARGET, t);
      meshRef.current.position.set(pos[0], pos[1], pos[2]);

      // Rotation during flight
      meshRef.current.rotation.z += delta * ROTATION_SPEED;
      meshRef.current.rotation.x += delta * ROTATION_SPEED * 0.5;

      // Squash/stretch: stretch at midpoint, squash near end
      const squash = 1 + SQUASH_AMOUNT * Math.sin(tLinear * Math.PI);
      const squeeze = 1 / Math.sqrt(squash);
      meshRef.current.scale.set(squeeze, squash, squeeze);

      // Landing
      if (tLinear >= 1 && !hasLandedRef.current) {
        hasLandedRef.current = true;
        landPaper(data.id);
        setTimeout(() => removePaper(data.id), LANDED_DISPLAY_TIME);
      }
      return;
    }

    // Idle/hovered scale lerp
    if (data.status === "idle" || data.status === "hovered") {
      const current = meshRef.current.scale.x;
      const lerped = THREE.MathUtils.lerp(current, targetScale, 0.1);
      meshRef.current.scale.setScalar(lerped);
    }
  });

  if (data.status === "removed") return null;

  const isInteractive = data.status === "idle" || data.status === "hovered";

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={data.status === "flying" || data.status === "landed" ? undefined : data.position}
      onPointerEnter={
        isInteractive
          ? (e) => {
              e.stopPropagation();
              setHovered(true);
              hoverPaper(data.id);
              document.body.style.cursor = "pointer";
            }
          : undefined
      }
      onPointerLeave={
        isInteractive
          ? () => {
              setHovered(false);
              unhoverPaper(data.id);
              document.body.style.cursor = "auto";
            }
          : undefined
      }
      onClick={
        isInteractive
          ? (e) => {
              e.stopPropagation();
              setHovered(false);
              document.body.style.cursor = "auto";
              selectPaper(data.id);
            }
          : undefined
      }
    >
      <meshStandardMaterial
        color={data.color}
        roughness={0.7}
        metalness={0.1}
        emissive={data.color}
        emissiveIntensity={hovered ? 0.3 : 0.05}
      />

      {/* Label tooltip on hover */}
      {hovered && isInteractive && (
        <Html center distanceFactor={8} style={{ pointerEvents: "none" }}>
          <div className="bg-card/90 backdrop-blur-sm border border-border rounded-md px-3 py-1.5 text-xs font-medium text-foreground whitespace-nowrap shadow-lg">
            {data.label}
          </div>
        </Html>
      )}

      {/* Classification label on impact */}
      {data.status === "landed" && (
        <Html center distanceFactor={8} position={[0, 0.6, 0]} style={{ pointerEvents: "none" }}>
          <div className="animate-fade-up bg-primary/90 text-primary-foreground rounded-md px-3 py-1 text-xs font-bold whitespace-nowrap shadow-lg">
            {data.label}
          </div>
        </Html>
      )}
    </mesh>
  );
}

export function SpamPaper({ data, reducedMotion }: SpamPaperProps) {
  // Skip Float wrapper when flying/landed or reduced motion
  if (reducedMotion || data.status === "flying" || data.status === "landed") {
    return <PaperMesh data={data} reducedMotion={reducedMotion} />;
  }

  // Each paper gets unique float parameters for organic variation
  const floatConfig = useMemo(() => {
    const seed = data.id.charCodeAt(data.id.length - 1);
    return {
      speed: 1.2 + (seed % 5) * 0.3,
      rotationIntensity: 0.2 + (seed % 3) * 0.1,
      floatIntensity: 0.4 + (seed % 4) * 0.15,
    };
  }, [data.id]);

  return (
    <Float
      speed={floatConfig.speed}
      rotationIntensity={floatConfig.rotationIntensity}
      floatIntensity={floatConfig.floatIntensity}
    >
      <PaperMesh data={data} />
    </Float>
  );
}
