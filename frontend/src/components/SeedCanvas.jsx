import { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Spores({ count = 240 }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 14;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    ref.current.rotation.y = t * 0.03;
    ref.current.position.y = Math.sin(t * 0.2) * 0.3;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.045} color="#1A3626" transparent opacity={0.55} sizeAttenuation depthWrite={false} />
    </points>
  );
}

// The drifting spores are decoration. Where WebGL is unavailable — blocked by
// policy, disabled in the browser, no GPU path at all — mounting the Canvas
// throws out of react-three-fiber as an uncaught render error, and with no error
// boundary above it that can take the section down with it. Cheaper to ask first
// and render nothing.
let webglSupported;
function hasWebGL() {
  if (webglSupported !== undefined) return webglSupported;
  try {
    const c = document.createElement("canvas");
    webglSupported = !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl"))
    );
  } catch {
    webglSupported = false;
  }
  return webglSupported;
}

export default function SeedCanvas() {
  const reduce =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (typeof window === "undefined" || !hasWebGL()) return null;
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 6], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      style={{ pointerEvents: "none" }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.7} />
        <Spores count={reduce ? 120 : 240} />
      </Suspense>
    </Canvas>
  );
}
