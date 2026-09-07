import { create } from 'zustand';

export const useSceneStore = create((set) => ({
  rotationSpeed: 0.01,
  activeNode: null,
  setRotationSpeed: (speed) => set({ rotationSpeed: speed }),
  setActiveNode: (node) => set({ activeNode: node }),
}));
