import { create } from "zustand";

export const useSceneStore = create((set) => ({
  phase: "landing",

  scrollProgress: 0,

  energy: 0.25,

  voiceLevel: 0,

  setScrollProgress: (scrollProgress) =>
    set({ scrollProgress }),

  setEnergy: (energy) =>
    set({ energy }),

  setVoiceLevel: (voiceLevel) =>
    set({ voiceLevel })
}));
