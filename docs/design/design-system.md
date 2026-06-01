# Campaign Builder
## Design System & Especificação Técnica
`Versão 1.1 · Junho 2026`

---

## 1. Filosofia de Design

O Campaign Builder é uma ferramenta operacional — não um produto de marketing. O design reflete isso: as decisões visuais servem à clareza e velocidade de uso, nunca à ornamentação. A diretriz central é **premium-minimalista**: elevação sem exagero, sofisticação sem peso.

Três princípios guiam todas as decisões:

**1. Hierarquia antes de beleza.**
O usuário deve entender o que fazer sem ler. Tipografia, espaçamento e cor criam essa hierarquia.

**2. Contenção nos efeitos.**
Transições são curtas (150ms). Sombras são leves. Nenhum gradiente colorido. Sofisticação vem da precisão, não do excesso.

**3. Contexto técnico visível.**
IDs de API, códigos de país e rotas usam fonte monospace para sinalizar que são dados de sistema — não texto editorial.

---

## 2. Paleta de Cores

A paleta usa temperatura fria: fundo azul-acinzentado suave, superfícies brancas, texto quase-preto com tom azulado. O único preto puro (`#0f1624`) é o accent — reservado para ações primárias e texto principal, criando máximo contraste e hierarquia clara.

### Fundação

| Hex | Token CSS | Uso |
|-----|-----------|-----|
| `#f1f3f8` | `--bg` | Fundo global da aplicação |
| `#ffffff` | `--surface` | Cards, modais, painéis — superfície primária |
| `#f8f9fc` | `--surface-2` | Linhas de tabela, seções secundárias |
| `#eef0f6` | `--surface-3` | Tabs inativo, cabeçalhos de seção, hover states |
| `#e3e7ef` | `--border` | Bordas padrão em todos os componentes |
| `#cdd2de` | `--border-mid` | Bordas em hover, divisores mais fortes |
| `#9aa3b8` | `--border-strong` | Bordas em foco (input) |

### Texto

| Hex | Token CSS | Uso |
|-----|-----------|-----|
| `#0f1624` | `--text-1` | Texto principal, títulos, valores importantes |
| `#4a5568` | `--text-2` | Labels, subtítulos, botões secundários |
| `#94a3b8` | `--text-3` | Hints, placeholders, metadados, ícones |
| `#cbd5e0` | `--text-4` | Placeholders suaves, separadores de texto |

### Accent & Semântica

| Hex | Token CSS | Uso |
|-----|-----------|-----|
| `#0f1624` | `--accent` | Botão primário, borda de item selecionado |
| `#0d9467` | `--green` | Status positivo: Rascunho, Pronto, Traduzido |
| `#ecfdf5` | `--green-soft` | Background de badge verde |
| `#2563eb` | `--blue` | Informativo: variações, badges de contagem |
| `#eff6ff` | `--blue-soft` | Background de badge azul |
| `#c2730a` | `--orange` | Alerta: guardrail banner |
| `#fffbeb` | `--orange-soft` | Background de banner de alerta |
| `#dc2626` | `--red` | Destrutivo: hover em Excluir, hover em Limpar |
| `#fef2f2` | `--red-soft` | Background de ação destrutiva em hover |

---

## 3. Tipografia

O sistema usa três fontes com papéis semânticos bem definidos. A distinção visual cria clareza imediata sobre o tipo de informação — o usuário não precisa saber disso conscientemente para sentir o benefício.

### Syne — Títulos e labels de seção
> Google Fonts · pesos: 600, 700, 800

Fonte geométrica com personalidade forte. Usada em títulos de página (`h1`), títulos de feature cards, nomes de template no painel de detalhe e labels de seção em ALL CAPS. Transmite confiança e estrutura sem ser corporativa.

| Contexto | Especificação |
|----------|---------------|
| `h1` de página | `26px`, weight `700`, letter-spacing `-0.5px` |
| Brand name topbar | `15px`, weight `700` |
| Section labels | `10px`, weight `700`, uppercase, letter-spacing `0.14em` |
| Stat values | `34px`, weight `700`, letter-spacing `-1px` (Roboto, não Syne) |
| Detail panel name | `20px`, weight `700`, letter-spacing `-0.4px` |

---

### Roboto — Corpo e interface
> Google Fonts · pesos: 300, 400, 500, 700

Fonte sans-serif neutra e altamente legível, desenvolvida pelo Google. Usada em todo texto de interface: labels de campo, botões, navegação, metadados, conteúdo de cards. Excelente renderização em todos os tamanhos e pesos, ideal para ferramentas operacionais de uso intensivo.

| Contexto | Especificação |
|----------|---------------|
| Body / interface | `13px`, weight `400–500` |
| Labels de campo | `11.5px`, weight `600` |
| Botões | `12.5px`, weight `600`, letter-spacing `0.01em` |
| Nav items | `12.5px`, weight `600` |
| Hints / muted | `11–12px`, weight `400` |

---

### JetBrains Mono — Dados técnicos e de sistema
> Google Fonts · pesos: 400, 500

Fonte monospace para programadores. Usada exclusivamente para dados de sistema: IDs da API Meta, códigos de país (`BR`, `AE`), valores numéricos de orçamento, rotas de navegação (`/campaign-flow`), Meta Campaign IDs. A diferença visual sinaliza: *"este é um dado técnico, não texto editorial"*.

| Contexto | Especificação |
|----------|---------------|
| Route chips | `10.5px`, weight `500`, letter-spacing `0.01em` |
| Country tags | `10.5px`, weight `500` |
| Values no painel de detalhe | `11.5px`, weight `500` |
| Input de orçamento | `13px`, weight `400` |
| Meta Campaign IDs na tabela | `11.5px`, weight `400` |

---

## 4. Componentes

### Botões — 4 variantes semânticas

| Variante | Comportamento | Exemplos de uso |
|----------|---------------|-----------------|
| `btn-primary` | Bg `#0f1624`, texto branco, sombra leve. Hover: `translateY(-1px)` + sombra upgrade | "Salvar template", "Usar no fluxo de campanha" |
| `btn-secondary` | Bg branco, border `--border`, shadow xs. Hover: border mais escura, bg `--surface-2` | "Editar", "Duplicar", "Ver Detalhes" |
| `btn-ghost` | Sem borda, sem background. Texto `--text-3`, hover `--red` | "Limpar" no rodapé de formulário — único uso |
| `btn-danger-soft` | Igual secondary em repouso. Hover: texto vermelho, border vermelha suave, bg `--red-soft` | "Excluir", "Remover", "Desativar" |

> **Regra:** sempre **um único** `btn-primary` por tela. Ele define o ponto focal de ação.

---

### Cards & Border-radius

| Token | Valor | Uso |
|-------|-------|-----|
| `--r-xl` | `18px` | Cards principais (feature cards, list panels, detail panels) |
| `--r-lg` | `14px` | Cards internos, itens de campanha, guardrail banner |
| `--r-md` | `11px` | Accordions, dropzone, video containers |
| `--r-sm` | `8px` | Inputs, botões, route chips, tags |
| `--r-xs` | `5px` | Badges xs, detalhes internos |

---

### Badges & Tags

Border-radius `20px` (pílula). Texto uppercase, `10–10.5px`, weight `700`, letter-spacing `0.04em`. **Nunca decorativos** — sempre comunicam um estado real do sistema.

| Classe | Cor | Estados |
|--------|-----|---------|
| `badge-green` | `#0d9467` em `#ecfdf5` | Rascunho, Revisado, Pronto, Traduzido |
| `badge-blue` | `#2563eb` em `#eff6ff` | Contagens, variações, informativos |
| `badge-gray` | `--text-2` em `--surface-3` | REAL, PAUSED, Sem mídia, Sem vídeo |
| `mono-tag` | `--text-2`, border `--border-mid` | Códigos de país inline: `AE`, `BR`, `ES` |

---

### Inputs

- **Background:** `--surface` (branco puro)
- **Border:** `1px solid --border`
- **Border-radius:** `--r-sm` (8px)
- **Box-shadow:** `var(--shadow-xs)` em repouso
- **Focus:** `border-color: --border-strong` + ring de `3px` com `rgba(15,22,36,.07)`
- **Placeholder:** `--text-4` (suave, não confunde com valor preenchido)
- Campos com valores técnicos usam `JetBrains Mono` (orçamento, países)

---

### Topbar

- **Position:** `sticky top 0` — acompanha o scroll
- **Background:** `rgba(255,255,255, 0.92)` + `backdrop-filter: blur(20px)` — vidro fosco
- **Border-bottom:** `1px solid --border`
- **Altura:** `56px`
- **Logo:** quadrado `32px`, border-radius `9px`, background `--text-1`, ícone branco SVG

---

## 5. Espaçamento & Grid

Sistema baseado em múltiplos de `4px`.

| Valor | Uso |
|-------|-----|
| `4px` | Micro espaçamentos (gap ícone ↔ texto em botão) |
| `8px` | Gap entre botões, gap interno de badges |
| `10–12px` | Gap entre cards no grid de página |
| `14px` | Padding interno de itens de lista |
| `18–22px` | Padding padrão de cards (`card-pad`) |
| `24px` | Padding de seções de detalhe e perfil |
| `28–32px` | Padding lateral do shell (container principal) |

### Grids de página

| Grid | Onde |
|------|------|
| 4 colunas | Stat cards (Home) |
| 3 + 2 colunas | Feature cards (Home) |
| 2 colunas | Formulário de criação (Campanha \| AdSet) |
| 1 sidebar 280px + conteúdo | Meus Templates, Perfil |
| `max-width: 1140px` | Páginas de conteúdo largo |
| `max-width: 860px` | Páginas de formulário vertical (Perfil) |

---

## 6. Efeitos & Animações

> Regra: efeito só se tiver propósito. Transições excessivas criam sensação de lentidão em ferramentas usadas repetidamente.

```css
--t: 150ms;
--ease: cubic-bezier(.16, 1, .3, 1); /* aceleração rápida, desaceleração suave */
```

| Gatilho | Propriedades animadas | Duração |
|---------|----------------------|---------|
| Hover em botões | `color`, `background`, `border-color`, `box-shadow` | `150ms` |
| Hover em feature cards | `box-shadow`, `border-color` | `150ms` |
| Hover em itens de lista | `background` | `150ms` |
| Focus em inputs | `border-color`, `box-shadow` (ring) | `150ms` |
| Entrada de página | `opacity 0→1`, `translateY 10px→0` | `220ms` |
| `btn-primary` hover | `translateY(-1px)` + box-shadow upgrade | `150ms` |

---

## 7. Páginas do Sistema

### Home (Dashboard)
4 stat cards com valores em Roboto 700 para leitura instantânea. Feature cards em grid 3+2 — o "Fluxo de campanha" tem botão primário (preto), os demais têm botão secundário (outline). Lista de campanhas com hover e navegação para detalhe.

### Templates / Criar template
Layout 2 colunas (Campanha | AdSet) + card full-width para Criativo (accordion Ads A–E) + card full-width para Vídeos (dropzone + slots por país). Rodapé fixo com "Limpar" (ghost, discreto) e "Salvar template" (primary, preto).

### Templates / Meus templates
Sidebar 280px com lista + painel de detalhe expansivo. Item selecionado tem **acento vertical de 2.5px** em `--text-1` — detalhe sutil que sinaliza seleção sem uso de cor de destaque. Detalhe mostra Campaign, AdSet, Creative, Vídeos e barra de Traduções.

### Perfil / Países e Idiomas da Operação *(componente melhorado)*
O componente foi reestruturado em três partes com hierarquia clara:

1. **Linha de adicionar país** — `select` + botão "Adicionar" + divisor vertical + "Criar todos os países possíveis", agrupados em container com background `--surface-2` e borda. Comunica visualmente que é uma área de ação.
2. **Header da lista** — label "Lista do usuário" à esquerda + pill "6 países" à direita com border-radius `20px`. Mostra a contagem sem poluir o layout.
3. **Tabela com header** — colunas País / Idioma / Ação com labels uppercase em `--text-3`. Cada linha exibe: flag emoji (`19px`) + nome completo do país + código monospace abaixo (`JetBrains Mono 10px`, `--text-3`). Hover nas linhas com `--surface-2`. Padding horizontal consistente de `16px`.

### ROI Operacional
Guardrail banner em `--orange-soft` com borda `--orange-border` — visualmente importante sem ser alarmante. 4 metric cards com Roboto 700 para leitura rápida. Tabela de dados com hover em linhas.

### Detalhes da Campanha
Status card compacto no topo com ações contextuais. Tabela com dados de API em `JetBrains Mono`. Badges `PAUSED` em cinza neutro — porque PAUSED é o estado esperado e correto, não um problema.

---

## 8. Decisões de Não-Design

Tão importante quanto o que foi feito é o que foi deliberadamente evitado.

| ❌ Evitado | Motivo |
|------------|--------|
| Gradientes coloridos | Envelhecem rápido. O preto sólido `#0f1624` é mais atemporal e premium |
| Background cinza nos inputs | Inputs com fundo acinzentado parecem desabilitados. Branco puro com borda fina é mais limpo e acessível |
| Sombras pesadas | Box-shadows exageradas criam ruído visual. Opacidade máxima de 10%, spread mínimo |
| Animações por componente | Apenas a página inteira tem `fadeUp`. Animar cada card separadamente seria lento em uso repetido |
| Inter ou Arial | Fontes sem identidade comprometem o visual. Syne + Roboto formam um par eficaz: um com personalidade geométrica, o outro com máxima legibilidade operacional |
| Modo escuro automático | Ferramentas operacionais usadas em ambiente de escritório se beneficiam do modo claro — mais conforto para leitura prolongada de dados |

---

*Campaign Builder Design System — gerado em Junho 2026*
