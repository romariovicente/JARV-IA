import { create } from 'zustand';

export const useChatStore = create((set) => ({
  messages: [],
  isStreaming: false,
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  setStreaming: (status) => set({ isStreaming: status }),
  clearMessages: () => set({ messages: [] }),
}));
