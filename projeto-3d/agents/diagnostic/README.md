# JARV DIAGNOSTIC AGENT

## Objetivo
Analisar relatórios de erro do Monitor e identificar a causa raiz.

## Fluxo de Execução
1. Receber o alerta do Monitor.
2. Registrar o incidente em log.
3. Identificar módulo afeto (API, UI, Backend).
4. Acionar o Supervisor para criar a branch de correção.
