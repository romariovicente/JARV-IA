# Log de Sessões e Continuidade — J.A.R.V.I.S. (v6.0 Core Protocol)

## Status Atual do Sistema
* **Versão:** v6.0 Core Protocol
* **Infraestrutura Base:** PWA / SPA com interface cibernética em estilo Kali Terminal (`css/style.css` e `index.html`).
* **Inteligência & Auto-Heal:** Motor de auto-recuperação (`scripts/jarv-heal.js`) alimentado por Groq API com cascata de fallback automático (`llama-3.3-70b-versatile` -> `llama-3.1-70b-versatile` -> `llama-3.1-8b-instant`).
* **Visão Computacional:** Rastreamento local via MediaPipe (Hands API) integrado.
* **Backend Realtime:** Firebase Firestore (`onSnapshot`) para o `Autonomous Execution Feed` e Firebase Auth com escopos ativados para Google Calendar.

---

## Histórico de Alterações e Refatoração (31/08/2026)

### 1. Atualizações de Código Core e Interface
* **Refatoração do `index.html`:**
  * Remoção de chamadas a scripts legados e obsoletos (`script.js`).
  * Inclusão do módulo `diagnostics.js` no topo da árvore para auditoria de falhas de UI em tempo real.
  * Integração das dependências de visão computacional MediaPipe (`camera_utils`, `control_utils`, `hands`) e Firebase SDK (v8.10.1).
  * Inclusão dos painéis modulares para o Núcleo Autônomo, Quiz/Diagnóstico MIUI 15 e atalhos de voz (TTS/STT).

* **Refatoração da Engine Auto-Heal (`scripts/jarv-heal.js`):**
  * Atualização da resolução de caminho com `path.resolve(process.cwd(), 'js/app.js')`.
  * Implementação de sanitizador de Markdown para respostas da API de LLM (`replace(/```json\s*|\s*```/gi, '')`), impedindo falhas de `JSON.parse`.

* **Padronização PWA (`manifest.json`):**
  * Ajuste de `start_url` para `./index.html` e adição de `purpose: "any maskable"` aos ícones do aplicativo.

### 2. Sincronização da Documentação Técnica
* **`README.md`:** Atualizado com novidades da versão 6.0, visão geral da arquitetura multimodelo, árvore de diretórios e guia de execução.
* **`AGENTS.md`:** Expandido com regras para a cadeia de fallback de LLMs, sanitização obrigatória de JSON e padrões de resiliência.
* **`PRD_Site_Jarvis.md`:** Atualizado com a especificação funcional completa da v6.0 (Gamificação, MediaPipe, Loop Autônomo e Suporte MIUI 15).
* **`Site_do_Jarvis.md`:** Atualizado com o mapeamento completo dos subsistemas, tabela de prioridade de modelos Groq e regras de governança.

---

## Próximos Passos Técnicos
* [ ] Validar a esteira CI/CD no GitHub Actions para acionamento automático do `scripts/jarv-heal.js` nos Pull Requests.
* [ ] Expandir a base de perguntas e diagnósticos de bancada no módulo de suporte para dispositivos Xiaomi (MIUI 15 / comandos MTP).
* [ ] Testar a latência do rastreamento de mãos MediaPipe em múltiplos navegadores e dispositivos móveis.
