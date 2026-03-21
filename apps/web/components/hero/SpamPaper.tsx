"use client";

import { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, Html } from "@react-three/drei";
import * as THREE from "three";
import type { SpamPaperData } from "@/lib/hero/types";
import { useHeroStore } from "@/lib/hero/heroState";

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
  const geometry = CrumpledGeometry();
  const targetScale = hovered ? 1.15 : 1.0;

  useFrame(() => {
    if (!meshRef.current) return;
    const current = meshRef.current.scale.x;
    const lerped = THREE.MathUtils.lerp(current, targetScale, 0.1);
    meshRef.current.scale.setScalar(lerped);
  });

  if (data.status === "removed") return null;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={data.position}
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
        selectPaper(data.id);
      }}
    >
      <meshStandardMaterial
        color={data.color}
        roughness={0.7}
        metalness={0.1}
        emissive={data.color}
        emissiveIntensity={hovered ? 0.3 : 0.05}
      />

      {/* Label tooltip on hover */}
      {hovered && (
        <Html center distanceFactor={8} style={{ pointerEvents: "none" }}>
          <div className="bg-card/90 backdrop-blur-sm border border-border rounded-md px-3 py-1.5 text-xs font-medium text-foreground whitespace-nowrap shadow-lg">
            {data.label}
          </div>
        </Html>
      )}
    </mesh>
  );
}

export function SpamPaper({ data, reducedMotion }: SpamPaperProps) {
  if (reducedMotion) {
    return <PaperMesh data={data} reducedMotion />;
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
