import { create } from "zustand";

export const useJarvisStore = create((set) => ({
  state: "READY",

  setState: (state) => set({ state }),

  isListening: false,

  setListening: (isListening) =>
    set({ isListening })
}));
