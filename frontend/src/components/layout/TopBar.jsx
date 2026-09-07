import React from "react";

export default function TopBar() {
  return (
    <header className="top-bar glass-panel">

      <div>
        <div className="brand">
          J.A.R.V.I.S. <span>I.A.</span>
        </div>

        <div className="brand-subtitle">
          v6.0 DEEP TECH CORE
        </div>
      </div>

      <div className="system-status">
        <span className="status-dot online" />
        SYSTEM ONLINE
      </div>

      <div className="clock">
        {new Date().toLocaleTimeString("pt-BR")}
      </div>

    </header>
  );
}
