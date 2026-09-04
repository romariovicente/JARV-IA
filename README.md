# README.md — J.A.R.V.I.S. v6.0 (Core Protocol & Development Guidelines)

Este documento estabelece o padrão obrigatório de engenharia, arquitetura, design e governança que qualquer agente de inteligência artificial ou colaborador humano deve seguir obrigatoriamente ao desenvolver, corrigir ou expandir o projeto **J.A.R.V.I.S. v6.0**.

---

## 1. Governança de Código e Fluxo Git (Issues & PRs)
* **Criação de Issues:** Toda e qualquer tarefa (seja correção de bug, melhoria de código ou implementação de uma nova função) deve obrigatoriamente iniciar com a criação prévia de uma **GitHub Issue** detalhando o escopo.
* **Branches e Pull Requests:** O código nunca deve ser enviado diretamente para a branch principal (`main`). O desenvolvimento deve ocorrer em branches dedicadas e ser integrado exclusivamente via **Pull Request (PR)**.
* **Vinculação Obrigatória:** A descrição de todo PR **deve** mencionar explicitamente o número da Issue correspondente (utilizando termos como `Closes #ID` ou `Resolve #ID`).
* **Deploys:** Os fluxos de deploy automático (GitHub Pages ou pipelines de CI/CD) apenas podem ser consolidados após o merge bem-sucedido do PR e a validação da suíte de testes de Auto-Heal.

---

## 2. Padrões de Interface, Motion Principles e Performance
O J.A.R.V.I.S. possui uma identidade visual futurista e imersiva (cyberpunk / holográfica Kali Theme). Toda nova interface desenvolvida deve cumprir os seguintes critérios de UI/UX:
* **Skeletons e Carregamento:** Proibição de telas em branco ou spinners estáticos. É obrigatório o uso de componentes de esqueleto animados com efeito *shimmer* durante requisições de API ou carregamentos assíncronos.
* **Lazy Loading:** Módulos pesados (MediaPipe Hands, modais de quiz, painéis secundários) e recursos gráficos devem ser carregados sob demanda (*lazy loading*) para otimizar o tempo de resposta e o consumo de banda.
* **Smooth Animations:** Aplicação estrita de animações fluidas e transições suaves de entrada, saída, carregamento e progresso em todos os elementos da interface, utilizando curvas de aceleração consistentes (ex: `cubic-bezier`).

---

## 3. Qualidade, Testes e Observabilidade
Para garantir a estabilidade e a manutenibilidade corporativa do sistema:
* **Observabilidade:** Monitoramento ativo de erros e exceções em tempo de execução utilizando a suíte `diagnostics.js`, Sentry (captura de falhas no front-end) e logs estruturados em tempo real.
* **Qualidade e Lint de Código:** Padronização rígida utilizando **Biome** para linting/formatação e **Commitlint** para assegurar commits semânticos (`feat:`, `fix:`, `refactor:`, `docs:`, etc.).
* **Testes Automatizados:** Suítes de testes cobrindo fluxos de ponta a ponta (**Playwright**), testes unitários e de integração, com rastreamento de cobertura via **Codecov**.

---

## 4. Arquitetura Multimodelo, Resiliência e Auto-Heal (Groq API)
* **Fallback de Inteligência:** As chamadas à API de LLM devem seguir estritamente a ordem de prioridade definida no módulo `scripts/jarv-heal.js` (`llama-3.3-70b-versatile` -> `llama-3.1-70b-versatile` -> `llama-3.1-8b-instant`).
* **Auto-Recuperação Contínua:** Qualquer alteração no arquivo central `js/app.js` deve passar pelo validador autônomo de sintaxe e estrutura antes da promoção para produção.
* **Sanitização de Respostas:** Todo o tráfego de dados estruturados vindo de IAs deve ser higienizado para remoção de wrappers Markdown (` ```json `) antes de ser processado via `JSON.parse`.

---

## 5. Segurança, Autenticação e PWA
* **Gerenciamento de Cache:** O Service Worker (`service-worker.js`) deve ser atualizado com versionamento explícito (`?v=6.0`) e desregistrar proativamente instâncias legadas.
* **Firebase & Google OAuth 2.0:** As integrações de autenticação devem garantir fallback seguro para o modo offline temporário caso ocorra indisponibilidade de rede.
