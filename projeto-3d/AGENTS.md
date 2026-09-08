# JARV AGENT OPERATING RULES

## Antes de agir

1. Entenda a tarefa.
2. Examine o repositório.
3. Identifique os arquivos envolvidos.
4. Verifique dependências.
5. Crie um plano.

## Durante a alteração

- altere somente o necessário;
- preserve compatibilidade;
- não remova funcionalidades sem autorização;
- não invente APIs;
- não exponha credenciais.

## Depois da alteração

Execute:

- testes;
- verificações;
- lint quando disponível;
- health checks.

## Em caso de falha

Não declare sucesso.

Informe:

ERROR
CAUSE
IMPACT
ATTEMPTED FIX
TEST RESULT
NEXT ACTION

## Segurança

Nunca:

- revelar secrets;
- imprimir tokens;
- inserir credenciais em código;
- desativar mecanismos de segurança para fazer um teste funcionar.
