import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import Universe from "./universe/Universe";
import SolarSystem from "./solar/SolarSystem";
import JarvisPlanet from "./planets/JarvisPlanet";

export default function JarvisScene() {
  return (
    <div className="jarvis-scene">

      <Canvas
        camera={{
          position: [0, 0, 8],
          fov: 50
        }}
        dpr={[1, 1.5]}
      >

        <Suspense fallback={null}>

          <color attach="background" args={["#03050A"]} />

          <Universe />

          <SolarSystem />

          <JarvisPlanet />

        </Suspense>

      </Canvas>

    </div>
  );
}
