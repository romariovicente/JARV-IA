import React from "react";

const modules = [
  ["CORE", "Painel principal"],
  ["CHAT", "Conversas inteligentes"],
  ["QUANTUM", "Computação quântica"],
  ["RESEARCH", "Pesquisa em tempo real"],
  ["CYBER", "Segurança e análise"],
  ["TOOLS", "Ferramentas"],
  ["CREATIVE", "Geração multimídia"],
  ["SETTINGS", "Configurações"]
];

export default function LeftSidebar() {
  return (
    <aside className="left-sidebar">

      <div className="panel-title">
        NAVEGAÇÃO PRINCIPAL
      </div>

      {modules.map(([title, subtitle]) => (
        <button
          key={title}
          className="nav-item"
          type="button"
        >
          <strong>{title}</strong>
          <span>{subtitle}</span>
        </button>
      ))}

    </aside>
  );
}
