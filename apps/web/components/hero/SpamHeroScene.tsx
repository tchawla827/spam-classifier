"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { TrashCan } from "./TrashCan";
import { SpamPaper } from "./SpamPaper";
import { useHeroStore } from "../../lib/hero/heroState";
import { useReducedMotion } from "../../hooks/useReducedMotion";

function Scene() {
  const papers = useHeroStore((s) => s.papers);
  const reducedMotion = useReducedMotion();

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.6} castShadow />
      <pointLight position={[-3, 3, 2]} intensity={0.3} color="#c4b5fd" />
      <pointLight position={[3, 2, -1]} intensity={0.2} color="#22d3ee" />
      <fog attach="fog" args={["#0a0a0f", 8, 18]} />

      <TrashCan />

      {papers.map((paper) => (
        <SpamPaper key={paper.id} data={paper} reducedMotion={reducedMotion} />
      ))}
    </>
  );
}

export default function SpamHeroScene() {
  return (
    <div className="w-full aspect-[4/3] lg:aspect-[3/2] relative" style={{ touchAction: "manipulation" }}>
      <Canvas
        camera={{ position: [0, 1.5, 7], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}
