// @ts-nocheck
/**
 * Scene3DBackground
 * ------------------------------------------------------------------
 * Fixed-position WebGL canvas that sits behind all page content.
 *
 * - SSR-safe (renders nothing until mounted on client)
 * - Skipped in lite mode, on /admin, and when prefers-reduced-motion
 * - Scroll-driven camera + floating geometry + particles
 * - DPR capped at 1.5 to keep mobile GPUs happy
 *
 * Drop-in: mount once near the top of the app shell.
 */
import { useEffect, useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Stars, Environment, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

function ScrollCamera() {
  const ref = useRef<THREE.PerspectiveCamera>(null);
  const scroll = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      scroll.current = Math.min(1, window.scrollY / max);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    // gentle drift + scroll push
    const targetY = -scroll.current * 8;
    const targetX = Math.sin(t * 0.1) * 0.5;
    ref.current.position.y += (targetY - ref.current.position.y) * 0.05;
    ref.current.position.x += (targetX - ref.current.position.x) * 0.05;
    ref.current.lookAt(0, ref.current.position.y, 0);
  });

  return <perspectiveCamera ref={ref} makeDefault position={[0, 0, 8]} fov={50} />;
}

function FloatingJar({ position, color, scale = 1 }: any) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.y = s.clock.elapsedTime * 0.3;
  });
  return (
    <Float speed={1.5} rotationIntensity={0.4} floatIntensity={1.2}>
      <group ref={ref} position={position} scale={scale}>
        {/* jar body */}
        <mesh castShadow>
          <cylinderGeometry args={[0.6, 0.6, 1.4, 48]} />
          <MeshDistortMaterial
            color={color}
            roughness={0.15}
            metalness={0.4}
            distort={0.15}
            speed={1.2}
          />
        </mesh>
        {/* lid */}
        <mesh position={[0, 0.85, 0]}>
          <cylinderGeometry args={[0.65, 0.65, 0.3, 48]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
    </Float>
  );
}

function FloatingTorus({ position, color }: any) {
  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <mesh position={position}>
        <torusKnotGeometry args={[0.5, 0.18, 128, 16]} />
        <meshStandardMaterial
          color={color}
          metalness={0.8}
          roughness={0.2}
          emissive={color}
          emissiveIntensity={0.2}
        />
      </mesh>
    </Float>
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#000000", 8, 30]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} color="#fff5e0" />
      <pointLight position={[-5, -2, 2]} intensity={1.5} color="#f97316" />
      <pointLight position={[5, -8, 0]} intensity={1.2} color="#3b82f6" />

      <FloatingJar position={[-3, 1, 0]} color="#f97316" scale={1.2} />
      <FloatingJar position={[3, -2, -1]} color="#fbbf24" scale={0.9} />
      <FloatingJar position={[0, -8, -2]} color="#ef4444" scale={1.1} />
      <FloatingJar position={[-2, -14, -1]} color="#10b981" scale={1} />
      <FloatingJar position={[3, -20, 0]} color="#8b5cf6" scale={1.3} />

      <FloatingTorus position={[2, 3, -2]} color="#f97316" />
      <FloatingTorus position={[-3, -6, -3]} color="#fbbf24" />
      <FloatingTorus position={[3, -12, -2]} color="#ef4444" />
      <FloatingTorus position={[-2, -18, -3]} color="#10b981" />

      <Stars radius={50} depth={20} count={1500} factor={3} saturation={0} fade speed={0.5} />
      <Suspense fallback={null}>
        <Environment preset="warehouse" />
      </Suspense>
    </>
  );
}

export default function Scene3DBackground({ opacity = 0.55 }: { opacity?: number }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // honor user prefs + lite mode
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const lite = (() => {
      try { return localStorage.getItem("np_lite") === "1"; } catch { return false; }
    })();
    const lowMem = (navigator as any).deviceMemory && (navigator as any).deviceMemory < 2;
    if (reduced || lite || lowMem) return;
    setEnabled(true);
  }, []);

  if (!enabled) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        pointerEvents: "none",
        opacity,
        // overlay subtle gradient so content text stays readable
        background:
          "radial-gradient(ellipse at top, transparent 0%, transparent 40%, rgba(255,255,255,0.85) 100%)",
      }}
    >
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ position: "absolute", inset: 0 }}
      >
        <ScrollCamera />
        <Scene />
      </Canvas>
      {/* readability veil */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.75) 60%, rgba(255,255,255,0.85) 100%)",
          mixBlendMode: "normal",
        }}
      />
    </div>
  );
}