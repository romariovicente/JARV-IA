import { create } from "zustand";
import { sendChatMessage } from "../services/api/chatApi";

export const useChatStore = create((set, get) => ({
  messages: [
    {
      id: "system-001",
      role: "assistant",
      type: "system",
      content: "J.A.R.V.I.S. CORE inicializado."
    }
  ],

  loading: false,

  sendMessage: async (content) => {

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      type: "message",
      content
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      loading: true
    }));

    try {

      const response = await sendChatMessage(
        content,
        get().messages
      );

      const assistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        type: "response",
        content: response
      };

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        loading: false
      }));

    } catch (error) {

      const errorMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        type: "error",
        content:
          "Não foi possível processar a solicitação."
      };

      set((state) => ({
        messages: [...state.messages, errorMessage],
        loading: false
      }));

      console.error(error);
    }
  }
}));
