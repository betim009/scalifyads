# P48 - Limitações Atuais

Data: 2026-06-06

Este documento resume o estado atual do ScalifyAds/CampaignBuilder para demonstração operacional.

## Já Funciona

Templates:

- Criar templates base.
- Armazenar textos base em `adVariants`.
- Usar template como origem da geração operacional.

Traduções por mercado:

- Gerar traduções para mercados selecionados.
- Salvar traduções em `payload.translationsByMarket`.
- Preservar traduções existentes por padrão.
- Sobrescrever traduções quando solicitado.
- Visualizar traduções por mercado.

Mercados operacionais:

- Selecionar mercados como ARM, AREU, ENCA e ENAU.
- Resolver nome do mercado, idioma e localizações.
- Gerar nome operacional no padrão `CODIGO-NICHO-FB`.
- Gerar `utm_campaign` com o código do mercado.
- Gerar `src` igual ao nome operacional.
- Resolver países para pré-visualização.

Conferência:

- Persistir gerações em `operational_market_generations`.
- Abrir detalhe da campanha.
- Conferir mercado, nome gerado, UTM, SRC, status e países resolvidos.
- Visualizar o targeting operacional como pré-visualização.

Segurança:

- Tudo permanece local/operacional.
- Status operacional permanece `PAUSED`.
- `publishable=false`.
- `previewOnly=true`.
- `metaPublishing=false`.

## Ainda Não Faz

Publicação Meta:

- Não cria Campaign real na Meta a partir de mercados operacionais.
- Não cria AdSet real na Meta a partir de mercados operacionais.
- Não cria Ad real na Meta a partir de mercados operacionais.
- Não publica automaticamente.

Integração final de targeting:

- O targeting por mercado está resolvido internamente para conferência.
- A conversão final para payload real de AdSet Meta ainda não está habilitada.

Aprovação final:

- Ainda falta uma etapa explícita de aprovação antes da primeira publicação real por mercado.
- A publicação real deve continuar começando como `PAUSED`.

Idiomas:

- Alguns idiomas sem alvo seguro no LibreTranslate local continuam bloqueados para tradução automática.
- Esses casos exigem política operacional antes de liberar geração automática.

## Guardrails Atuais

- Nenhum token é exposto no frontend.
- Nenhuma credencial foi alterada.
- Nenhuma chamada Meta REAL é feita no fluxo operacional validado.
- Nenhum `ACTIVE` é criado pelo fluxo operacional.
- Nenhum scheduler/publicador automático foi alterado.

## Mensagem Recomendada para o Cliente

O sistema já reproduz o núcleo do operacional:

> escolher template, escolher mercados, gerar traduções, gerar estruturas operacionais e conferir tudo por mercado.

O próximo passo é transformar essa conferência em publicação controlada, mantendo aprovação explícita e status inicial `PAUSED`.
