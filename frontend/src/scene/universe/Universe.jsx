import React, { useMemo } from "react";
import * as THREE from "three";

export default function Universe() {

  const particles = useMemo(() => {

    const count = 3000;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 25;
    }

    return positions;

  }, []);

  return (
    <points>

      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.length / 3}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>

      <pointsMaterial
        size={0.025}
        color="#00E5FF"
        transparent
        opacity={0.7}
        sizeAttenuation
      />

    </points>
  );
}
