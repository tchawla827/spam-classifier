"use client";

import { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, Html, Trail } from "@react-three/drei";
import * as THREE from "three";
import type { SpamPaperData } from "../../lib/hero/types";
import { useHeroStore } from "../../lib/hero/heroState";
import {
  THROW_DURATION,
  ROTATION_SPEED,
  SQUASH_AMOUNT,
  LANDED_DISPLAY_TIME,
  TRASH_TARGET,
  computeArcPosition,
} from "../../lib/hero/throwConfig";

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
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const hoverPaper = useHeroStore((s) => s.hoverPaper);
  const unhoverPaper = useHeroStore((s) => s.unhoverPaper);
  const selectPaper = useHeroStore((s) => s.selectPaper);
  const landPaper = useHeroStore((s) => s.landPaper);
  const removePaper = useHeroStore((s) => s.removePaper);
  const geometry = CrumpledGeometry();
  const targetScale = hovered ? 1.15 : 1.0;

  const hasLandedRef = useRef(false);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    if (data.status === "flying" && data.flyStartTime && data.flyStartPosition) {
      if (reducedMotion) {
        removePaper(data.id);
        return;
      }
      const elapsed = performance.now() - data.flyStartTime;
      const tLinear = Math.min(elapsed / THROW_DURATION, 1);
      // Ease-in-out for natural throw feel
      const t = tLinear < 0.5
        ? 2 * tLinear * tLinear
        : 1 - Math.pow(-2 * tLinear + 2, 2) / 2;

      const pos = computeArcPosition(data.flyStartPosition, TRASH_TARGET, t);
      meshRef.current.position.set(pos[0], pos[1], pos[2]);

      // Rotation during flight
      meshRef.current.rotation.z += delta * ROTATION_SPEED;
      meshRef.current.rotation.x += delta * ROTATION_SPEED * 0.5;

      // Squash/stretch: stretch at midpoint, squash near end
      const squash = 1 + SQUASH_AMOUNT * Math.sin(tLinear * Math.PI);
      const squeeze = 1 / Math.sqrt(squash);
      // Shrink into bin over the last 25% of flight
      const entryScale = tLinear > 0.75 ? Math.max(0, 1 - ((tLinear - 0.75) / 0.25)) : 1;
      meshRef.current.scale.set(squeeze * entryScale, squash * entryScale, squeeze * entryScale);

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
    <group
      ref={groupRef}
      position={data.status === "flying" || data.status === "landed" ? undefined : data.position}
    >
      {/* Invisible hitbox — larger sphere absorbs Float drift so hover is stable */}
      {isInteractive && (
        <mesh
          visible={false}
          onPointerEnter={(e) => {
            e.stopPropagation();
            setHovered(true);
            hoverPaper(data.id);
            document.body.style.cursor = "pointer";
          }}
          onPointerLeave={() => {
            setHovered(false);
            unhoverPaper(data.id);
            document.body.style.cursor = "auto";
          }}
          onClick={(e) => {
            e.stopPropagation();
            setHovered(false);
            document.body.style.cursor = "auto";
            const worldPos = new THREE.Vector3();
            meshRef.current?.getWorldPosition(worldPos);
            selectPaper(data.id, [worldPos.x, worldPos.y, worldPos.z]);
          }}
        >
          <sphereGeometry args={[0.55, 8, 8]} />
        </mesh>
      )}

      {/* Visible paper mesh with motion trail */}
      <Trail
        width={data.status === "flying" ? 1.5 : 0}
        length={6}
        color={data.color}
        attenuation={(t) => t * t}
        decay={1}
      >
        <mesh ref={meshRef} geometry={geometry}>
          <meshStandardMaterial
            color={data.color}
            roughness={0.7}
            metalness={0.1}
            emissive={data.color}
            emissiveIntensity={hovered ? 0.3 : 0.05}
          />
        </mesh>
      </Trail>

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
    </group>
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
