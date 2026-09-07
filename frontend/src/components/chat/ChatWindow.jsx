import React from "react";
import { useChatStore } from "../../stores/useChatStore";

export default function ChatWindow() {
  const messages = useChatStore((state) => state.messages);
  const loading = useChatStore((state) => state.loading);

  return (
    <section className="chat-window">

      <div className="chat-header glass-panel">
        <span>◉ CONVERSA ATIVA</span>
        <span>MEMÓRIA</span>
        <span>CONHECIMENTO</span>
        <span>FERRAMENTAS</span>
      </div>

      <div className="messages">

        {messages.map((message) => (
          <article
            key={message.id}
            className={`message ${message.role}`}
          >
            <div className="message-role">
              {message.role === "user" ? "VOCÊ" : "J.A.R.V.I.S."}
            </div>

            <div className="message-content">
              {message.content}
            </div>
          </article>
        ))}

        {loading && (
          <article className="message assistant">
            <div className="message-role">
              J.A.R.V.I.S.
            </div>

            <div className="thinking">
              ◌ PROCESSANDO...
            </div>
          </article>
        )}

      </div>
    </section>
  );
}
