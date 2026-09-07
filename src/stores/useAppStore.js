import { create } from 'zustand';

export const useAppStore = create((set) => ({
  systemStatus: 'IDLE',
  setStatus: (status) => set({ systemStatus: status }),
  activeTab: 'hud',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
