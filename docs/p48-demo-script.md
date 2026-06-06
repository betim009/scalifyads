# P48 - Demo Script Operacional

Data: 2026-06-06

Objetivo da demonstração:

Mostrar o fluxo operacional validado para o Victor:

Template -> Traduções por Mercado -> Geração Operacional -> Conferência.

Esta demonstração não publica nada na Meta.

## Dados da Demo

Template:

- Plantas BTN

Nicho:

- PlantasBTN

Mercados:

- ARM - Árabe Mundo
- AREU - Árabe Europa
- ENCA - Inglês Canadá
- ENAU - Inglês Austrália

Resultado esperado:

- ARM-PlantasBTN-FB
- AREU-PlantasBTN-FB
- ENCA-PlantasBTN-FB
- ENAU-PlantasBTN-FB

Regras esperadas:

- `utm_source=facebook`
- `utm_medium=cpa`
- `utm_campaign={CODIGO_MERCADO}`
- `src={CODIGO_MERCADO}-PlantasBTN-FB`
- status sempre `PAUSED`
- pré-visualização operacional, sem publicação Meta

## Passo 1 - Selecionar Template

1. Abrir a área de templates de campanha.
2. Selecionar ou criar o template `Plantas BTN`.
3. Confirmar que o template possui textos base em `adVariants`.

Mensagem para explicar:

> O template concentra a estrutura base. Entre mercados, a estrutura permanece igual; o que muda é mercado, idioma, localização e tracking.

## Passo 2 - Gerar Traduções

1. Abrir a seção `Traduções por Mercado`.
2. Selecionar:
   - ARM
   - AREU
   - ENCA
   - ENAU
3. Deixar `Sobrescrever traduções existentes` desmarcado, exceto quando for uma regeneração intencional.
4. Clicar em `Gerar Traduções`.

Resultado esperado:

- Traduções aparecem por mercado.
- Cada mercado mostra idioma e quantidade de `adVariants`.
- Ao expandir, aparecem:
  - `primaryText`
  - `headline`
  - `description`

Mensagem para explicar:

> As traduções ficam armazenadas localmente para revisão. Nada é publicado na Meta.

## Passo 3 - Selecionar Mercados

1. Abrir o Fluxo de Campanha.
2. Escolher o modo `Mercados Operacionais`.
3. Selecionar o template `Plantas BTN`.
4. Selecionar os mercados:
   - ARM
   - AREU
   - ENCA
   - ENAU

Mensagem para explicar:

> O usuário escolhe mercados, não países soltos. O sistema resolve idioma, localização, URL/tracking e nomes operacionais.

## Passo 4 - Gerar Operacional

1. Revisar o preview antes de gerar.
2. Confirmar que aparecem:
   - código do mercado
   - nome do mercado
   - países resolvidos
   - UTM
   - SRC
   - status de pré-visualização
3. Clicar para gerar campanhas operacionais.

Resultado esperado:

- 4 mercados gerados com sucesso.
- Nenhuma Campaign Meta criada.
- Nenhum AdSet Meta criado.
- Nenhum Ad Meta criado.
- Tudo permanece `PAUSED`.

Mensagem para explicar:

> Esta etapa cria a estrutura operacional local para conferência. A publicação Meta ainda não está habilitada.

## Passo 5 - Conferir Resultado

1. Abrir o detalhe da campanha gerada.
2. Conferir a seção `Mercados Operacionais`.
3. Validar os registros:

| Mercado | Nome gerado | UTM | SRC | Status |
| --- | --- | --- | --- | --- |
| ARM | ARM-PlantasBTN-FB | ARM | ARM-PlantasBTN-FB | PAUSED |
| AREU | AREU-PlantasBTN-FB | AREU | AREU-PlantasBTN-FB | PAUSED |
| ENCA | ENCA-PlantasBTN-FB | ENCA | ENCA-PlantasBTN-FB | PAUSED |
| ENAU | ENAU-PlantasBTN-FB | ENAU | ENAU-PlantasBTN-FB | PAUSED |

Ao expandir um mercado, conferir:

- código
- nome do mercado
- nome gerado
- UTM
- SRC
- países resolvidos
- pré-visualização do targeting

Mensagem para explicar:

> Aqui o Victor consegue revisar o que seria criado por mercado antes de qualquer publicação real.

## Passo 6 - Próximos Passos Futuros

Explicar que o sistema já cobre:

- template base;
- tradução por mercado;
- geração operacional;
- conferência por mercado;
- guardrail de segurança.

Ainda falta antes da primeira publicação real:

- etapa explícita de aprovação;
- integração final MarketCode -> payload Meta;
- checklist final de publicação;
- manter publicação inicial sempre como `PAUSED`.

## Checklist da Demo

- [ ] Template `Plantas BTN` selecionado.
- [ ] `adVariants` confirmados.
- [ ] Traduções geradas para ARM, AREU, ENCA, ENAU.
- [ ] Mercados selecionados no fluxo operacional.
- [ ] Geração operacional concluída.
- [ ] Detalhe da campanha conferido.
- [ ] Status `PAUSED` confirmado.
- [ ] Explicado que nada foi publicado na Meta.
