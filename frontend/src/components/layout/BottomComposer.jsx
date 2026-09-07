import React, { useState } from "react";
import { useChatStore } from "../../stores/useChatStore";

export default function BottomComposer() {
  const [input, setInput] = useState("");
  const sendMessage = useChatStore((state) => state.sendMessage);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const text = input.trim();

    if (!text) return;

    setInput("");

    await sendMessage(text);
  };

  return (
    <form className="bottom-composer glass-panel" onSubmit={handleSubmit}>

      <button
        type="button"
        className="voice-button"
        aria-label="Ativar voz"
      >
        🎙
      </button>

      <input
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="Faça uma pergunta ao J.A.R.V.I.S..."
      />

      <button className="execute-button" type="submit">
        EXECUTAR →
      </button>

    </form>
  );
}
