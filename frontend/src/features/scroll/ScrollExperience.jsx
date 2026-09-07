import React, { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSceneStore } from "../../stores/useSceneStore";

gsap.registerPlugin(ScrollTrigger);

export default function ScrollExperience() {

  const container = useRef(null);
  const setScrollProgress =
    useSceneStore((state) => state.setScrollProgress);

  useLayoutEffect(() => {

    const ctx = gsap.context(() => {

      ScrollTrigger.create({
        trigger: container.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 1,

        onUpdate: (self) => {
          setScrollProgress(self.progress);
        }
      });

    }, container);

    return () => ctx.revert();

  }, [setScrollProgress]);

  return (
    <div
      ref={container}
      className="scroll-experience"
    >
      <section className="scroll-section">
        <h1>CAOS</h1>
      </section>

      <section className="scroll-section">
        <h1>NUCLEOSSÍNTESE</h1>
      </section>

      <section className="scroll-section">
        <h1>ORDEM GEOMÉTRICA</h1>
      </section>

      <section className="scroll-section">
        <h1>JARVIS CORE</h1>
      </section>
    </div>
  );
}
