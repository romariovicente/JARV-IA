# Arquitetura e Estrutura do Sistema — J.A.R.V.I.S. (v7.0 Core Protocol)

## Visão Geral
O **J.A.R.V.I.S. I.A.** é um sistema operacional web (SPA/PWA) com interface cibernética em estilo Kali Terminal. Ele opera com arquitetura multimodelo via Groq API, suporte a visão computacional local, monitoramento autônomo em tempo real 24/7 com diário unificado de conhecimento, módulos avançados de suporte técnico e resiliência por auto-correção automatizada.

---

## Módulos e Subsistemas v7.0

| Módulo | Arquivo Alvo | Descrição e Responsabilidade |
| :--- | :--- | :--- |
| **Core UI & Roteamento** | `index.html` / `js/app.js` | Interface cibernética, alternância de abas, atalhos globais de voz e síntese de fala (TTS). |
| **Autenticação & DB** | `js/app.js` | Firebase SDK (Auth com Google OAuth 2.0, Firestore `onSnapshot` para feed autônomo e fallback offline). |
| **Motor Autônomo 24/7** | `scripts/jarv-autonomous-runner.js` | Execução autônoma agendada (a cada 6h via GitHub Actions) cobrindo Ciência da Computação, Enfermagem, Medicina e Matemática. |
| **Diário Unificado & Memória** | `IA/diario-unificado.md` | Repositório central de conhecimento acumulado e sincronizado de todas as pesquisas e relatórios autônomos. |
| **Auto-Heal Engine** | `scripts/jarv-heal.js` | Auditoria contínua de código via Node.js + Groq API com cascata de fallback automática entre LLMs e geração de PRs. |
| **Diagnóstico de UI** | `diagnostics.js` | Módulo de captura global de exceções, auditoria de DOM e relatórios de execução no frontend. |
| **Visão Computacional** | CDN / MediaPipe | Rastreamento gestual e visual local via `camera_utils.js`, `control_utils.js` e `hands.js`. |
| **Suporte MIUI 15 / Quiz** | `js/app.js` / `index.html` | Módulo interativo para testes de bancada, comandos MTP e diretrizes de Unlock Tools (Xiaomi). |
| **PWA & Cache Control** | `service-worker.js` / `manifest.json` | Gerenciamento de ativos offline, limpeza de workers legados e suporte a instalação nativa. |

---

## Cadeia de Fallback da IA (Groq Auto-Model)
A engine de auto-correção, os agentes autônomos e as rotinas de pesquisa seguem a seguinte priorização de modelos oficiais:
1. **`llama-3.3-70b-versatile`** (Modelo Primário — Alta inteligência, raciocínio complexo e síntese acadêmica)
2. **`llama-3.1-8b-instant`** (Fallback de Velocidade — Execução rápida e leve para tarefas dinâmicas)
3. **`mixtral-8x7b-32768`** (Fallback de Suportabilidade — Grande janela de contexto para processamento de dados)

---

## Objetivos Estratégicos e Requisitos de Performance

### Identidade Visual e UX Cyberpunk
* Estética baseada no tema Kali/Cyber, utilizando cores neon (`#00ffff`), transparências escuras, bordas holográficas e marca d'água contextual da Legião.
* Animações fluidas e transições suaves (*smooth animations*) com curvas `cubic-bezier`.

### Otimização e Performance
* **Skeletons Shimmer:** Proibição de áreas em branco; uso obrigatório de esqueletos animados durante o carregamento de notas do Segundo Cérebro e chamadas de API.
* **Lazy Loading:** Carregamento sob demanda para módulos de alta densidade (MediaPipe, modais secundários e visualizadores de logs).

### Arquitetura PWA e Offline
* Service Worker com versionamento explícito (`v=7.0`) e desregistro forçado de instâncias obsoletas.
* Web App Manifest configurado com escopo `./index.html`, suporte `standalone` e ícones `maskable`.

---

## Fronteiras de Governança (Alinhado ao AGENTS.md)

* **Zona Autoral (Estratégia Humana):** Os arquivos de documentação (`README.md`, `PRD_Site_Jarvis.md`, `Site_do_Jarvis.md`, `AGENTS.md`) e os manuais de procedimento definem o escopo, as regras de negócio e o direcionamento estratégico.
* **Workspace da IA (Execução e Código):** A implementação em código (`js/app.js`, `css/style.css`), os workflows de automação (`.github/workflows/`), os scripts de suporte (`scripts/jarv-autonomous-runner.js`, `scripts/jarv-heal.js`), a base de conhecimento unificada (`IA/diario-unificado.md`) e os registros de versão são mantidos e auditados pela Inteligência Artificial.
