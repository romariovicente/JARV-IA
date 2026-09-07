# Manual de Escalamento e Procedimentos de N2 - Stone & TON

## Visão Geral e Objetivo
Este Procedimento Operacional Padrão (POP) define as diretrizes para a análise, diagnóstico e escalação de chamados de **Nível 2 (N2)** nas plataformas **Stone** e **TON**. O escopo abrange desde falhas em terminais de pagamento (POS/Smart) e problemas em integrações de API/Gateway até divergências complexas de transações financeiras que exigem intervenção técnica especializada ou validação de engenharia.

---

## 1. Triagem Inicial e Validação de Dados
Antes de iniciar qualquer intervenção técnica ou escalonamento, o analista de N2 deve assegurar a integridade dos dados cadastrais e transacionais do lojista:
* **Identificação do Cliente:** Validação de CNPJ/CPF, Razão Social/Nome e o **StoneCode** principal.
* **Rastreabilidade:** Localização do chamado e histórico de interações prévias no **Salesforce** e **Oráculo**.
* **Dados da Ocorrência:** Obtenção de detalhes precisos (data, horário exato, valor da transação, NSU, ID do pedido/transação e os 4 últimos dígitos do cartão utilizado).

---

## 2. Diagnóstico Técnico: Terminais (POS / Smart / Maquininhas)
Para ocorrências envolvendo travamentos, falhas de impressão, problemas de leitura de chip/aproximação ou erros de conexão nos dispositivos:
1. **Conectividade:** Validar a alternância entre rede Wi-Fi e chip de dados (GPRS/4G) para descartar instabilidades de operadora.
2. **Atualização de Software:** Verificar se o aplicativo de pagamento e o sistema operacional do terminal encontram-se na versão mais recente homologada.
3. **Fechamento e Limpeza de Lote:** Orientar ou executar a conferência de lote pendente e reinicialização forçada do equipamento caso haja travamento de processos em segundo plano.
4. **Testes de Diagnóstico:** Utilizar as ferramentas internas de teste de hardware disponíveis no menu de suporte do terminal.

---

## 3. Análise de Integrações, APIs e Webhooks
Para lojistas que utilizam e-commerce, gateways de pagamento, links de cobrança ou automações via API StoneCode:
* **Validação de Payloads:** Checar o formato das requisições JSON enviadas pelo cliente em comparação com a documentação oficial da API.
* **Códigos de Erro HTTP:** Analisar os retornos de erro (`400 Bad Request`, `401 Unauthorized`, `422 Unprocessable Entity`, `500 Internal Server Error`).
* **Logs de Transação:** Consultar os logs de requisição no painel de desenvolvedor ou ferramentas de monitoramento interno para identificar timeouts ou rejeições por regras antifraude/adquirente.

---

## 4. Critérios e Fluxo de Escalamento (N3 / Engenharia)
Se o problema não puder ser resolvido no Nível 2 após a aplicação dos procedimentos de diagnóstico, o chamado deverá ser escalado para o **Nível 3 (Engenharia / Produto / SRE)** seguindo estritamente estas etapas:
1. **Preenchimento do Chamado:** Abertura de ticket detalhado no portal interno utilizando o template padrão de escalamento.
2. **Evidências Obrigatórias:** Anexar prints de tela, logs de erro extraídos do sistema, arquivos de payload (quando aplicável) e o histórico completo das ações já realizadas.
3. **Classificação de Severidade:** Definir o impacto com base na criticidade do negócio do cliente (ex: Parada total de vendas, falha intermitente, divergência pontual de repasse).

---

## 5. Boas Práticas de Fechamento e Documentação
* **Base de Conhecimento (Ajudai / Oráculo):** Documentar soluções para novos cenários identificados durante o atendimento para enriquecer as macros e o repositório de suporte.
* **Comunicação com o Lojista:** Manter o lojista informado com clareza, utilizando uma linguagem objetiva, profissional e empática, seguindo os padrões de qualidade da Stone e TON.
