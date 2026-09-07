import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function JarvisPlanet() {

  const planetRef = useRef();
  const glowRef = useRef();

  useFrame((state, delta) => {

    if (planetRef.current) {
      planetRef.current.rotation.y += delta * 0.08;
    }

    if (glowRef.current) {
      glowRef.current.rotation.y -= delta * 0.03;
    }

  });

  return (
    <group>

      <mesh ref={planetRef}>

        <sphereGeometry args={[2, 128, 128]} />

        <meshStandardMaterial
          color="#06131F"
          emissive="#007BFF"
          emissiveIntensity={1.2}
          metalness={0.8}
          roughness={0.35}
        />

      </mesh>

      <mesh ref={glowRef} scale={1.06}>

        <sphereGeometry args={[2, 64, 64]} />

        <meshBasicMaterial
          color="#00E5FF"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />

      </mesh>

      <pointLight
        color="#00E5FF"
        intensity={10}
        distance={8}
      />

    </group>
  );
}
