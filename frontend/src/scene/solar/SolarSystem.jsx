import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";

function OrbitPlanet({ radius, speed, color, offset = 0 }) {

  const ref = useRef();

  useFrame((state) => {

    const time = state.clock.elapsedTime * speed + offset;

    const x = Math.cos(time) * radius;
    const z = Math.sin(time) * radius;
    const y = Math.sin(time * 0.5) * 0.6;

    if (ref.current) {
      ref.current.position.set(x, y, z);
      ref.current.rotation.y += 0.01;
    }

  });

  return (
    <mesh ref={ref}>

      <sphereGeometry args={[0.18, 24, 24]} />

      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.5}
      />

    </mesh>
  );
}

export default function SolarSystem() {
  return (
    <group>
      <OrbitPlanet radius={3} speed={0.2} color="#8A2BE2" />
      <OrbitPlanet radius={4} speed={0.14} color="#00E5FF" offset={2} />
      <OrbitPlanet radius={5} speed={0.1} color="#FF4500" offset={4} />
    </group>
  );
}
