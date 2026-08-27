# AGENTS.md - Diretrizes de Desenvolvimento e Governança para Agentes de IA

Este documento estabelece o padrão obrigatório de engenharia, arquitetura, design e governança que qualquer agente de inteligência artificial ou colaborador humano deve seguir obrigatoriamente ao desenvolver, corrigir ou expandir o projeto **J.A.R.V.I.S.**

---

## 1. Governança de Código e Fluxo Git (Issues & PRs)
* **Criação de Issues:** Toda e qualquer tarefa (seja correção de bug, melhoria de código ou implementação de uma nova função) deve obrigatoriamente iniciar com a criação prévia de uma **GitHub Issue** detalhando o escopo.
* **Branches e Pull Requests:** O código nunca deve ser enviado diretamente para a branch principal (`main`). O desenvolvimento deve ocorrer em branches dedicadas e ser integrado exclusivamente via **Pull Request (PR)**.
* **Vinculação Obrigatória:** A descrição de todo PR **deve** mencionar explicitamente o número da Issue correspondente (utilizando termos como `Closes #ID` ou `Resolve #ID`).
* **Deploys:** Os fluxos de deploy automático (GitHub Pages ou pipelines de CI/CD) apenas podem ser consolidados após o merge bem-sucedido do PR.

---

## 2. Padrões de Interface, Motion Principles e Performance
O J.A.R.V.I.S. possui uma identidade visual futurista e imersiva (cyberpunk / holográfica). Toda nova interface desenvolvida deve cumprir os seguintes critérios de UI/UX:
* **Skeletons e Carregamento:** Proibição de telas em branco ou spinners estáticos. É obrigatório o uso de componentes de esqueleto animados com efeito *shimmer* durante requisições de API ou carregamentos assíncronos.
* **Lazy Loading:** Módulos pesados, iframes, modais secundários e recursos gráficos devem ser carregados sob demanda (*lazy loading*) para otimizar o tempo de resposta e o consumo de banda.
* **Smooth Animations:** Aplicação estrita de animações fluidas e transições suaves de entrada, saída, carregamento e progresso em todos os elementos da interface, utilizando curvas de aceleração consistentes (ex: `cubic-bezier`).

---

## 3. Qualidade, Testes e Observabilidade
Para garantir a estabilidade e a manutenibilidade corporativa do sistema:
* **Observabilidade:** Monitoramento ativo de erros e exceções em tempo de execução utilizando ferramentas como **Sentry** (para captura de falhas no front-end e requisições de API) e compatibilidade com padrões de rastreio (**OpenTelemetry**, **Datadog** ou **NewRelic**).
* **Qualidade e Lint de Código:** Padronização rígida de código utilizando **Biome** para linting/formatação ultrarrápida e **Commitlint** para assegurar que o histórico de commits siga um padrão semântico claro (`feat:`, `fix:`, `refactor:`, etc.).
* **Testes Automatizados:** Implementação e manutenção de suítes de testes cobrindo fluxos de ponta a ponta (**Playwright**), testes unitários e de integração, com rastreamento de cobertura via **Codecov**.
