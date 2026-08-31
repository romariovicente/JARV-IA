# PRD — Documento de Requisitos do Produto: J.A.R.V.I.S. (v6.0 Core Protocol)

## 1. Visão Geral do Produto
O **J.A.R.V.I.S. v6.0** é um sistema operacional web (SPA/PWA) com estética cibernética e arquitetura de inteligência artificial multimodelo. O sistema atua como central de operações, integrando execução autônoma de tarefas, monitoramento em tempo real, suporte técnico especializado para bancada de hardware/software e auto-recuperação contínua do código fonte.

---

## 2. Escopo das Funcionalidades (Versão 6.0)

### 2.1 Interface Base e Estilização Terminal Cyber
* **Módulo Base:** Interface de Terminal / Cyber Futurista estruturada na página principal (`index.html`).
* **Estilização Visual:** Tema holográfico Kali (`css/style.css`), com elementos em tom neon (`#00ffff`), transparências, bordas tecnológicas e marca d'água contextual.
* **Navegação Dinâmica:** Alternância fluida entre o Master Agent, Segundo Cérebro, Autonomous Core e Suporte Técnico sem recarregamento de página.

### 2.2 Dashboard de Gamificação & Métricas em Tempo Real
* **Indicadores Globais:** Exibição de relógio digital com precisão de segundos e status operacional (`Optimal v6.0`).
* **Gamificação:** Sistema visual para acompanhar o progresso de tarefas executadas e o desempenho dos subsistemas ativos.

### 2.3 Visão Computacional Local (MediaPipe)
* **Processamento no Cliente:** Rastreamento gestual e detecção de mãos utilizando as bibliotecas `camera_utils.js`, `control_utils.js` e `hands.js` da MediaPipe.
* **Privacidade & Performance:** Execução direta no navegador do usuário, garantindo baixa latência e dispensa de servidores externos de processamento de imagem.

### 2.4 Autonomous Execution Feed (Loop Autônomo)
* **Sincronização Realtime:** Integração com Firebase Firestore através do método `onSnapshot` para atualização instantânea dos logs de execução autônoma.
* **Terminal Feed:** Painel dedicado para exibição estruturada das relatorias e tarefas concluídas pelos agentes de segundo plano.

### 2.5 Suporte Técnico & Quiz MIUI 15
* **Base de Conhecimento Prática:** Módulo focado no diagnóstico e reparo de dispositivos móveis Xiaomi (ex: modelo 23053RN02L rodando MIUI 15).
* **Guia Interativo:** Testes de bancada, rotinas para contorno de restrições de software, execução de comandos MTP e diretrizes para ferramentas de Unlock Tools.

### 2.6 Autenticação Firebase & Escopos Google
* **Login Social:** Autenticação via Google OAuth 2.0 através do SDK do Firebase (`firebase-auth.js`).
* **Integração de APIs:** Conexão com escopos expandidos para Google Calendar, Gmail Agent e gerenciamento de permissões.
* **Modo Offline:** Suporte a login temporário de fallback para operação sem conexão com os serviços do Firebase.

### 2.7 Engine de Auto-Heal (Groq API)
* **Diagnóstico e Correção de Código:** Script em Node.js (`scripts/jarv-heal.js`) responsável por analisar `js/app.js` e aplicar correções automáticas de bugs.
* **Cascata de Fallback (LLMs):** Roteamento inteligente de requisições na ordem:
  1. `llama-3.3-70b-versatile` (Modelo Primário)
  2. `llama-3.1-70b-versatile` (Modelo Secundário)
  3. `llama-3.1-8b-instant` (Fallback de Alta Velocidade)

---

## 3. Diretrizes de Engenharia e Arquitetura (Alinhadas ao AGENTS.md)

### 3.1 Performance, Skeletons e Motion Principles
* **Componentes Shimmer:** Uso obrigatório de esqueletos animados durante a busca ou carregamento de notas do Segundo Cérebro e chamadas de API.
* **Lazy Loading:** Carregamento sob demanda das bibliotecas pesadas de visão computacional e modais secundários.
* **Transições Suaves:** Animações baseadas em `cubic-bezier` para abertura de modais, troca de abas e feedback de ações.

### 3.2 Resiliência e Tratamento de Erros
* **Auditoria Contínua:** Módulo `diagnostics.js` posicionado no topo da árvore de scripts para capturar exceções não tratadas globalmente.
* **Sanitização de Respostas:** Remoção automática de delimitadores de bloco Markdown (` ```json `) antes da serialização/parsing de respostas enviadas por modelos de linguagem.
* **Tratamento de Exceções de Conexão:** Fallback automático em caso de falha de modelos da Groq ou indisponibilidade da API do Firebase.

### 3.3 Compatibilidade PWA e Gerenciamento de Cache
* **Service Worker v6.0:** Controle dinâmico de cache para ativos estáticos, com lógica de desregistro automático de instâncias de Service Workers legadas.
* **Manifesto PWA:** Arquivo `manifest.json` atualizado com parâmetros `standalone`, escopo `./` e suporte a ícones otimizados (`purpose: "any maskable"`).

---

## 4. Requisitos Não Funcionais

| Requisito | Critério de Aceite |
| :--- | :--- |
| **Segurança** | Nenhuma API key sensível hardcoded no repositório público (utilização de Secrets). |
| **Compatibilidade** | Suporte total aos navegadores modernos baseados em Chromium, Firefox e Safari. |
| **Acessibilidade** | Atalhos globais de teclado (ex: tecla Espaço para ativamento de entrada por voz). |
| **Observabilidade** | Geração de logs claros no console com prefixos categorizados (ex: `[JARV-HEAL]`, `[DIAGNOSTICS]`). |
