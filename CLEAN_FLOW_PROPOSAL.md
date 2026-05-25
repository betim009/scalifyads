# CLEAN_FLOW_PROPOSAL — Proposta de fluxo operacional “limpo” (sem implementar agora)

Última atualização: [2026-05-25 18:57]

Objetivo:
documentar uma proposta para um fluxo operacional mais simples e seguro, preservando o `/meta-test` como laboratório técnico.

Regras:

- Não implementar wizard completo agora.
- Não remover/alterar o `/meta-test` de forma que quebre o laboratório.
- Toda criação REAL continua `PAUSED`.
- Token continua apenas no backend.

## Problema atual

O `/meta-test` é poderoso e auditável, mas é técnico demais para um fluxo “de operação” guiado (demo/cliente).
Ele mistura:

- operação normal (criar Campaign/AdSet/Creative/Ad + evidências)
- troubleshooting (diagnostics, pages list, logs, recovery)

## Proposta de separação

1) **Fluxo limpo (novo)**
   - foco: operação normal guiada
   - interface: passos claros + validações
   - saída: bundle de evidências (IDs + status + Graph reads + preview quando existir)
   - guardrails explícitos: “REAL sempre PAUSED”

2) **Console técnico (`/meta-test`)**
   - foco: diagnóstico e auditoria
   - mantém todas as ferramentas e visões detalhadas

## Roteamento sugerido (documentação apenas)

Opções:

- `/console` (fluxo limpo)
- `/campaign-builder` (fluxo limpo)
- `/meta-test` (console técnico; permanece)

## Etapas do fluxo limpo (rascunho)

1) **Campanha**
   - nome + objetivo + `metaAdAccountId`
2) **AdSet**
   - país/público/orçamento + otimização
3) **Creative**
   - textos + `destinationUrl` + (opcional) asset + `pageId`
4) **Revisão**
   - mostrar payloads e validações (somente leitura)
5) **Criar tudo `PAUSED`**
   - executar Campaign/AdSet/Creative/Ad
   - mostrar evidências copiáveis

## Critérios de sucesso (quando implementar)

- Um operador consegue criar o fluxo REAL completo sem abrir troubleshooting.
- Qualquer falha aponta “o que faltou” e direciona para o `/meta-test`.
- O `/meta-test` continua sendo a fonte de auditoria e diagnóstico.

