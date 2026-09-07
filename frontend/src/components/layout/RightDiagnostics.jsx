import React from "react";

function Metric({ label, value }) {
  return (
    <div className="metric-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function RightDiagnostics() {
  return (
    <aside className="right-diagnostics">

      <section className="glass-panel diagnostic-panel">
        <div className="panel-title">
          DIAGNÓSTICOS DO SISTEMA
        </div>

        <Metric label="CPU" value="--" />
        <Metric label="GPU" value="--" />
        <Metric label="MEMÓRIA" value="--" />
        <Metric label="FPS" value="--" />
        <Metric label="LATÊNCIA" value="--" />
      </section>

      <section className="glass-panel diagnostic-panel">
        <div className="panel-title">
          INTELIGÊNCIA
        </div>

        <Metric label="CORE" value="READY" />
        <Metric label="VOICE" value="STANDBY" />
        <Metric label="SCENE" value="ACTIVE" />
      </section>

    </aside>
  );
}
