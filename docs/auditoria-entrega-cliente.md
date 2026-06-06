# Auditoria de Entrega — ScalifyAds

Data da auditoria: 2026-06-02

Escopo: leitura estática do frontend, backend, infraestrutura e documentação operacional. Não foram lidos, alterados ou expostos tokens/credenciais locais. Esta auditoria não altera regras de negócio, integração Meta, guardrail `PAUSED`, banco de dados ou migrations.

## 1. Resumo Executivo

O projeto parece apto para uma entrega controlada e acompanhada, mas ainda não está pronto para uma entrega autônoma ao cliente sem supervisão.

O fluxo operacional principal já existe: login, perfil, contas Meta, países/idiomas, templates, traduções, criação de campanhas em lote, criação REAL com `PAUSED`, diagnóstico técnico e ROI operacional. O backend também possui guardrails relevantes para criação Meta, incluindo criação de Campaign, AdSet e Ad como `PAUSED`.

Os principais impedimentos para uma entrega sem acompanhamento são: credenciais iniciais/dev ainda aparecem no login e na documentação, autenticação interna usa senha em texto puro no banco, produção não está totalmente fechada no `docker-compose.prod.yml` (sem frontend e sem LibreTranslate), e o cliente ainda pode se perder entre fluxo operacional e tela técnica `/meta-test`.

Recomendação objetiva: entregar apenas como piloto controlado, com checklist de onboarding, operador acompanhando o primeiro lote real e validação manual no Ads Manager de que tudo nasceu `PAUSED`.

## 2. Estado Atual do Projeto

O que já funciona ou está implementado:

- SPA React/Vite com rotas protegidas por login para Home, Perfil, Templates, Campaign Flow, ROI operacional e Meta Test.
- Login interno com cookie `HttpOnly` e fluxo de sessão básico.
- Perfil com países/idiomas da operação e múltiplas contas Meta por usuário.
- Cadastro de `Meta Access Token`, `Meta Page ID`, `Meta Ad Account ID`, Instagram Actor ID e conta padrão.
- Listagem de contas Meta mascarando o token salvo com apenas `saved` e `last4`.
- Templates operacionais em `/templates`, incluindo payload de campanha, mídias por país, variações A-E e traduções.
- Geração de traduções via backend usando LibreTranslate.
- `/campaign-flow` como fluxo guiado com etapas de Campaign, AdSet, Creative, revisão e resultado.
- Criação REAL no backend para Campaign, AdSet, Creative e Ad, com `PAUSED` forçado nas entidades que suportam status.
- Execução em lote por países, com continuação em caso de erro por país.
- Upload local de mídias em `uploads/creative-assets` e geração/uso de thumbnail para vídeos.
- ROI operacional com receita manual, leitura de métricas, cálculo de lucro/ROI, pausa de campanhas e ajuste de budget com confirmação.
- `/meta-test` como console técnico para diagnóstico, validação de token, pages, permissões, Graph, logs e evidências.
- Infra de desenvolvimento com Postgres, backend, frontend e LibreTranslate em Docker.
- Infra de produção inicial com backend, Postgres, Nginx e volume de uploads.

## 3. Pontos Fortes

- Guardrail `PAUSED` está presente em UI, documentação e backend, reduzindo risco de ativação acidental.
- Token Meta não é retornado completo para o frontend após salvo; a UI mostra apenas presença e final.
- Logs operacionais possuem redaction para chaves com `token`, `access_token`, `authorization` e `cookie`.
- O fluxo `/campaign-flow` reduz o uso do laboratório técnico para operação comum.
- Há separação conceitual clara entre operação principal (`/campaign-flow`) e diagnóstico (`/meta-test`).
- O projeto tem runbook, planos, checklist de segurança, checklist Meta e documentação de deploy.
- O lote por país é resiliente: erro em um país não precisa interromper os demais.
- Existem mensagens de confirmação explícita para operação REAL e ações sensíveis de ROI.
- Uploads têm volume dedicado em produção, preservando arquivos entre recriações do container.
- O build frontend está padronizado via `npm run build`.

## 4. Riscos Antes da Entrega

- Login abre com usuário e senha dev preenchidos por padrão (`beto` / `beto123`), o que é inadequado para cliente.
- Autenticação interna persiste `password_plain`, então não deve ser tratada como segurança pronta para produção.
- Registro aberto (`/register`) pode permitir criação de usuários se exposto publicamente.
- Cliente pode confundir `/meta-test` com fluxo normal e executar ações técnicas sem entendimento.
- `Meta Access Token` é digitado no frontend para ser salvo no backend; depois não é exibido completo, mas o onboarding deve deixar claro que isso só deve ocorrer via HTTPS e em ambiente confiável.
- `Meta Ad Account ID` e `Meta Page ID` ainda dependem de o cliente saber coletar IDs corretos ou de suporte operacional.
- Produção define `LIBRETRANSLATE_URL` apontando para `scalifyads-libretranslate`, mas o `infra/docker-compose.prod.yml` não sobe esse serviço.
- `infra/docker-compose.prod.yml` não sobe frontend; o frontend depende do build estático + Nginx fora do compose.
- `deploy.sh` roda migrations em produção automaticamente; isso exige aprovação operacional explícita no dia do deploy.
- Schedulers vêm habilitados por padrão em produção; podem sincronizar/atuar antes de validação cuidadosa do ambiente.
- Uploads são servidos publicamente por `/uploads`; não devem conter material confidencial.
- O endpoint de healthcheck valida apenas disponibilidade básica (`ok: true`), não DB, LibreTranslate, Meta ou storage.
- A configuração CORS do backend aceita `*` por padrão quando `CORS_ORIGIN` não é definido.
- A documentação ainda mistura instruções dev, produção e histórico, aumentando chance de execução do procedimento errado.

## 5. Pendências Bloqueantes

Itens que impedem entrega autônoma ao cliente:

- Remover preenchimento automático de credenciais dev no login antes de expor ao cliente.
- Definir credenciais reais de usuário do cliente e desativar ou controlar cadastro público.
- Trocar armazenamento de senha em texto puro por hash antes de tratar como produção segura.
- Fechar decisão de deploy: frontend via Nginx estático, backend via compose e LibreTranslate via serviço separado ou compose atualizado.
- Garantir que o primeiro deploy de produção não rode migrations sem aprovação explícita e backup.
- Criar roteiro de onboarding Meta para o cliente obter/verificar Token, Page ID e Ad Account ID sem improviso.
- Validar em ambiente real que Campaign, AdSet e Ads nascem `PAUSED` no Ads Manager antes de liberar o uso.

## 6. Pendências Importantes

Itens que não impedem totalmente um piloto acompanhado, mas deveriam ser corrigidos logo:

- Esconder `/meta-test` da navegação principal para perfil de cliente ou rotular como "Suporte técnico".
- Simplificar textos e ordem do `/profile`, deixando "Conta Meta padrão" e validação como passo obrigatório.
- Adicionar checklist visual no `/campaign-flow` antes do botão final: conta Meta, Page ID, vídeos, thumbnails, países, budget e confirmação REAL.
- Melhorar mensagens de erro Meta para orientar ação prática: token inválido, app em dev mode, page sem acesso, ad account inválida, permissão ausente.
- Colocar `COOKIE_SECURE=true` e `CORS_ORIGIN` específico em produção.
- Desabilitar schedulers por padrão no primeiro deploy e habilitar somente após validação de token/contas.
- Documentar restauração/backup do volume Postgres e do volume de uploads.
- Definir limite operacional inicial: 1 campanha STUB, 1 campanha REAL, depois lote pequeno de 2-3 países.
- Revisar `frontend/.env.production`, que aponta para domínio placeholder.
- Adicionar healthcheck operacional que valide DB, uploads e LibreTranslate.

## 7. Pendências Desejáveis

- Melhorar labels em campos Meta com exemplos e validação visual: `act_<id>`, Page ID numérico, token salvo.
- Criar estados de "pronto/não pronto" no Home para Perfil, Templates, Traduções e Meta.
- Renomear botões técnicos como "Diagnóstico técnico" e evitar chamadas como "Meta Test" para cliente.
- Reduzir exposição de JSON, Graph e IDs técnicos fora do diagnóstico.
- Criar modo "cliente" com apenas Home, Perfil, Templates, Campaign Flow e ROI.
- Melhorar feedback visual de upload de mídia e geração de thumbnail.
- Adicionar um resumo pós-criação com links diretos para copiar IDs e validar no Ads Manager.
- Criar glossário curto para Campaign, AdSet, Creative e Ad.
- Separar docs de "dev", "produção" e "cliente" para reduzir ambiguidade.

## 8. Pendências Pós-Entrega

- Evoluir autenticação para controle de papéis/permissões.
- Criptografar tokens Meta em repouso, além de mascarar retorno.
- Adicionar auditoria por usuário em todas as ações sensíveis.
- Adicionar testes automatizados de guardrail `PAUSED`.
- Criar painel de status operacional em vez de depender do `/meta-test`.
- Criar integração OAuth Meta para reduzir cópia manual de token.
- Implementar observabilidade de produção com logs estruturados, métricas e alertas.
- Adicionar limpeza/expiração de uploads antigos.
- Criar fila/background jobs para uploads e criação de lotes maiores.

## 9. Análise do Fluxo do Cliente

Caminho avaliado: Login -> Home -> Perfil -> Templates -> Traduções -> Campaign Flow -> ROI.

Login:

- Funciona, mas não está pronto para cliente por vir preenchido com credenciais dev.
- Mensagem "Acesso interno controlado" é clara, mas a presença de link para "Criar conta" pode ser inadequada em produção.
- Erros são simples e compreensíveis, mas poderiam explicar "usuário ou senha inválidos" sem detalhes técnicos.

Home:

- A Home orienta bem o próximo passo e posiciona `/campaign-flow` como entrada operacional.
- A ordem recomendada está correta: Perfil -> Templates -> Campaign Flow -> ROI -> Diagnóstico.
- O botão "Diagnóstico técnico" aparece como atalho; para cliente, deveria ser secundário ou restrito.

Perfil:

- Reúne países, idiomas e contas Meta em um lugar coerente.
- O cadastro de múltiplas contas Meta é um ponto forte para operação real.
- Há risco de complexidade para cliente: muitos campos técnicos sem onboarding guiado.
- O botão "Criar todos os países possíveis" pode levar a configuração ampla demais para uma primeira entrega.
- Validação da conta Meta existe, mas deveria ser tratada como etapa obrigatória antes do REAL.

Templates:

- A página de templates suporta payload operacional robusto, incluindo variações de anúncios e mídias.
- O modelo permite traduções e mídias por país, o que reduz trabalho repetitivo.
- O risco é o cliente não entender quando um template está completo para REAL, especialmente vídeos e thumbnails A-E.
- Falta um indicador simples de "template pronto para lote REAL".

Traduções:

- Fluxo via LibreTranslate está documentado e integrado aos templates.
- A revisão humana está prevista, o que é correto para anúncios.
- Risco: se LibreTranslate não estiver disponível em produção, a geração falha e vira suporte manual.
- O cliente precisa entender que tradução automática não deve ser publicada sem revisão.

Campaign Flow:

- É o fluxo principal correto para entrega.
- Etapas e confirmação REAL ajudam a reduzir risco.
- O botão final deixa claro que cria `PAUSED`.
- O fluxo ainda tem muitos detalhes técnicos, especialmente em mídia, creative, Page ID e fallback.
- A execução em lote é forte, mas deve começar pequena para evitar erros repetidos em muitos países.

ROI operacional:

- Entrega valor operacional rápido: gasto, receita manual, lucro e ROI.
- Ações sensíveis têm confirmação e mantêm lógica segura.
- Depende de métricas sincronizadas e receita manual correta; sem isso, decisões podem ser ruins.
- A data padrão D-1 é adequada para operação diária.

Meta Test / diagnóstico técnico:

- Muito útil para suporte e investigação.
- Não deve ser tratado como tela principal do cliente.
- Deve ficar acessível para operador técnico ou suporte, não para uso casual.

## 10. Análise do Fluxo Meta

Fluxo avaliado: Token -> Page ID -> Ad Account ID -> Campanha REAL -> `PAUSED`.

Token:

- Pode ser salvo por conta Meta no Perfil.
- Depois de salvo, o backend retorna apenas presença e final do token.
- O backend também aceita fallback por env e tabela legada, o que ajuda compatibilidade, mas aumenta caminhos de configuração.
- Risco: token inválido, expirado, sem permissões ou associado a app em modo de desenvolvimento.

Page ID:

- Pode ser salvo na conta Meta ou informado no fluxo.
- É necessário para publicar Creative REAL.
- Há endpoints para listar/validar Pages, mas isso está mais concentrado no diagnóstico técnico.
- Risco: cliente não saber qual Page usar ou token não ter acesso a Page.

Ad Account ID:

- O sistema aceita formato `act_<digits>` e tem normalização no backend.
- Deve ser validado antes de execução REAL.
- Risco: ID de ad account errado, sem permissão de criação ou pertencente a BM diferente.

Campanha REAL:

- `/campaign-flow` chama backend para criar Campaign, AdSet, Creative e Ads.
- No backend, Campaign, AdSet e Ad forçam `PAUSED` mesmo se o client mandar outro status.
- Creative não tem o mesmo conceito de `ACTIVE`, mas depende de Page ID, destino e mídia válidos.
- O lote continua país a país, registrando erro sem interromper o restante.

Garantia de `PAUSED`:

- A UI repete que tudo será criado como `PAUSED`.
- O botão final exige confirmação explícita em modo REAL.
- O backend força `PAUSED` em `metaCreateCampaign`, `metaCreateAdSet` e `metaCreateAd`.
- O ROI também confirma pausas e ajustes de budget sem criar `ACTIVE`.
- Recomendação: antes da entrega, validar novamente no Ads Manager com uma criação REAL mínima.

O que ainda depende de suporte manual:

- Obtenção e qualidade do token Meta.
- Garantia de permissões do token e app Live quando necessário.
- Escolha correta de Page ID e Ad Account ID.
- Diagnóstico de erros de permissão, BM, Page e dev mode.
- Conferência visual no Ads Manager no primeiro uso real.

## 11. Análise da Infraestrutura

Docker:

- Desenvolvimento está bem coberto com `docker-compose.yml`: DB, backend, frontend e LibreTranslate.
- Produção tem `infra/docker-compose.prod.yml` com Postgres e backend, mas não inclui frontend nem LibreTranslate.
- O compose de produção usa volume persistente para Postgres e `scalifyads_uploads` para uploads.

Volumes de uploads:

- Backend monta `scalifyads_uploads:/app/uploads`, preservando mídias.
- Nginx pode proxyar `/uploads/` para o backend.
- Risco: uploads são públicos por URL; não usar para material confidencial.

LibreTranslate:

- Desenvolvimento sobe LibreTranslate.
- Produção aponta `LIBRETRANSLATE_URL` para `http://scalifyads-libretranslate:5000`, mas o serviço não existe no compose de produção.
- Isso deve ser corrigido ou documentado como serviço externo obrigatório.

Variáveis de ambiente:

- Existem exemplos para backend e raiz.
- Produção exige `DATABASE_URL`, `DB_PASSWORD`, Meta vars, CORS e scheduler vars.
- Placeholders como `dominio.com` e `frontend/.env.production` precisam ser substituídos antes do deploy real.

Build do frontend:

- Build é Vite e deve gerar `frontend/dist`.
- Deploy esperado: Nginx servindo `frontend/dist`.
- Produção depende de build fora do compose.

Backend:

- Express com healthcheck básico, API REST e schedulers.
- CORS precisa estar fechado por domínio real em produção.
- `express.json()` não define limite explícito; uploads usam multipart em rota própria.

Healthcheck:

- `/healthz` valida apenas que o processo responde.
- Falta healthcheck operacional para DB, LibreTranslate, uploads e status Meta.

Persistência:

- Postgres e uploads têm volumes.
- Falta runbook claro de backup/restore desses volumes antes de deploy/migration.

Riscos ao fazer deploy:

- `deploy.sh` executa migrations automaticamente.
- Nginx usa placeholders de domínio.
- Porta 8081 precisa ser liberada se mantiver a arquitetura atual.
- Schedulers podem começar a operar com credenciais erradas se habilitados por padrão.

## 12. Análise de Segurança Mínima

Pontos positivos:

- Sessão usa cookie `HttpOnly`.
- Token Meta salvo não volta completo para a UI.
- Ops logs redigem campos sensíveis por nome.
- Backend força `PAUSED` nas criações Meta principais.
- Documentação reforça "token nunca em logs/docs/frontend".

Riscos mínimos encontrados:

- Senhas são armazenadas em texto puro (`password_plain`).
- Login vem preenchido com credenciais dev.
- Cadastro de usuário pode ficar aberto em produção.
- `COOKIE_SECURE` depende de env e precisa estar `true` em HTTPS.
- `CORS_ORIGIN` pode ficar amplo se mal configurado.
- Token é digitado no frontend para envio ao backend; isso exige HTTPS obrigatório e orientação clara.
- Tokens Meta em repouso parecem persistidos em texto no banco; ideal é criptografia ou secret manager.
- `/uploads` é público e sem autenticação.
- Logs de erro genéricos usam `console.error` com objeto de erro; é baixo risco se os erros não carregarem token, mas deve ser observado.

Conclusão de segurança mínima: suficiente para piloto controlado em ambiente fechado, insuficiente para entrega pública/autônoma sem ajustes de autenticação, cadastro, cookies, CORS e armazenamento de segredos.

## 13. Recomendações Prioritárias

Ordem recomendada antes da entrega:

1. Remover credenciais dev preenchidas no login e trocar usuário/senha padrão.
2. Restringir ou remover cadastro público em produção.
3. Substituir `password_plain` por hash de senha.
4. Confirmar `COOKIE_SECURE=true`, `CORS_ORIGIN` fechado e HTTPS antes de salvar token via UI.
5. Definir deploy final: frontend estático via Nginx, backend compose, LibreTranslate externo ou no compose.
6. Desabilitar schedulers no primeiro deploy até validar Meta, DB e operação.
7. Criar Guia de Credenciais Meta para cliente: token, Page ID, Ad Account ID, permissões e validação.
8. Criar Checklist de Onboarding: Perfil -> Conta Meta validada -> Países -> Template -> Traduções revisadas -> STUB -> REAL 1 país -> lote pequeno.
9. Criar "modo cliente" ou esconder `/meta-test` da navegação principal.
10. Adicionar indicador "pronto para REAL" em Perfil/Templates/Campaign Flow.
11. Executar build frontend e validar rotas principais em produção.
12. Fazer criação REAL mínima e confirmar `PAUSED` no Ads Manager antes de liberar.

## 14. Sugestão de Novos Progressos para PLANS.md

### P30 — Hardening mínimo de autenticação para entrega

Prioridade: Bloqueante

Objetivo: remover riscos óbvios de autenticação antes da entrega ao cliente.

Tarefas:

- Remover credenciais dev preenchidas no login.
- Trocar seed/senha inicial por processo controlado.
- Implementar hash de senha.
- Restringir `/register` em produção por env ou remover da navegação.
- Garantir `COOKIE_SECURE=true` em produção.

Critérios de aceite:

- Login não exibe credenciais por padrão.
- Senha nova não é persistida em texto puro.
- Cadastro público não fica disponível sem decisão explícita.
- Build frontend passa.
- Login/logout continuam funcionando.

### P31 — Guia de Credenciais Meta e Onboarding do Cliente

Prioridade: Bloqueante

Objetivo: reduzir dependência de suporte manual e erro na coleta de Token, Page ID e Ad Account ID.

Tarefas:

- Criar `docs/guia-credenciais-meta.md`.
- Documentar como obter Ad Account ID, Page ID e validar permissões.
- Documentar erros comuns: token inválido, app dev mode, page sem acesso, ad account sem permissão.
- Criar checklist de onboarding no primeiro uso.
- Definir roteiro do primeiro lote real.

Critérios de aceite:

- Um operador consegue validar uma conta Meta sem abrir código.
- O guia não contém tokens reais.
- O roteiro termina com campanha REAL criada como `PAUSED`.

### P32 — Produção fechada e previsível

Prioridade: Bloqueante

Objetivo: alinhar compose, Nginx, frontend, LibreTranslate e deploy para evitar surpresa em produção.

Tarefas:

- Decidir se LibreTranslate roda no compose de produção ou como serviço externo.
- Atualizar documentação de deploy com essa decisão.
- Validar `frontend/.env.production` com domínio real.
- Documentar backup de Postgres e uploads antes de migrations.
- Separar comando de deploy de comando de migrations, ou exigir confirmação.

Critérios de aceite:

- `infra/docker-compose.prod.yml` e docs descrevem a mesma arquitetura.
- Traduções funcionam ou ficam claramente marcadas como indisponíveis.
- Deploy não roda migration sem decisão operacional.
- Uploads persistem após recriação do backend.

### P33 — UX de prontidão operacional

Prioridade: Importante

Objetivo: deixar claro quando o cliente está pronto para criar campanhas REAL.

Tarefas:

- Adicionar status no Home: Perfil OK, Conta Meta validada, Template OK, Traduções revisadas, Mídias OK.
- Adicionar checklist na etapa final do `/campaign-flow`.
- Destacar bloqueios de mídia/thumbnail antes do botão final.
- Trocar labels técnicos por textos de operação.
- Reduzir destaque do diagnóstico técnico.

Critérios de aceite:

- Cliente entende o próximo passo sem suporte em cada tela.
- Execução REAL fica bloqueada ou alertada quando faltar requisito crítico.
- Diagnóstico continua disponível sem virar fluxo principal.

### P34 — Healthcheck operacional de produção

Prioridade: Importante

Objetivo: detectar rapidamente falhas de DB, uploads, LibreTranslate e configuração Meta.

Tarefas:

- Criar endpoint de status operacional sem segredos.
- Validar DB conectado.
- Validar diretório de uploads gravável.
- Validar LibreTranslate acessível.
- Exibir presença de config Meta sem expor token.

Critérios de aceite:

- Suporte consegue abrir um endpoint e saber o que está indisponível.
- Nenhum segredo aparece na resposta.
- Falhas de LibreTranslate não são confundidas com falhas Meta.

### P35 — Segurança de tokens em repouso

Prioridade: Pós-entrega

Objetivo: reduzir impacto caso o banco seja acessado indevidamente.

Tarefas:

- Avaliar criptografia de `meta_access_token` no banco.
- Definir chave via env/secret manager.
- Migrar leitura/escrita preservando compatibilidade.
- Criar plano de rotação.

Critérios de aceite:

- Tokens não ficam legíveis diretamente no banco.
- Rotação de chave/token fica documentada.
- Fluxo Meta continua funcionando com `PAUSED`.

## 15. Checklist Final de Entrega

Antes de entregar ao cliente:

- [ ] Build frontend executado com sucesso.
- [ ] Domínio real definido e HTTPS ativo.
- [ ] `VITE_BACKEND_URL` aponta para API real via HTTPS.
- [ ] `CORS_ORIGIN` aponta apenas para domínio real.
- [ ] `COOKIE_SECURE=true` em produção.
- [ ] Login não vem com credenciais dev preenchidas.
- [ ] Usuário inicial do cliente criado de forma controlada.
- [ ] Cadastro público revisado/desativado.
- [ ] Senhas não ficam em texto puro ou risco aceito formalmente para piloto fechado.
- [ ] `DATABASE_URL` e `DB_PASSWORD` definidos fora do Git.
- [ ] Backup/restore de Postgres documentado.
- [ ] Volume de uploads persistente validado.
- [ ] LibreTranslate definido: ativo em produção ou fluxo sem traduções automáticas documentado.
- [ ] Schedulers desabilitados no primeiro deploy ou habilitados conscientemente.
- [ ] Conta Meta cadastrada no Perfil.
- [ ] Token salvo e exibindo apenas final mascarado.
- [ ] Ad Account ID validado.
- [ ] Page ID validado.
- [ ] Países e idiomas configurados.
- [ ] Template operacional criado.
- [ ] Traduções geradas e revisadas.
- [ ] Mídias A-E por país conferidas.
- [ ] Thumbnails de vídeo conferidas.
- [ ] Execução STUB feita com sucesso.
- [ ] Execução REAL de 1 país feita com sucesso.
- [ ] Ads Manager conferido manualmente: Campaign/AdSet/Ads nasceram `PAUSED`.
- [ ] Lote pequeno de 2-3 países validado.
- [ ] ROI operacional validado com receita manual.
- [ ] Cliente recebeu roteiro de uso e limites do primeiro dia.
- [ ] Cliente sabe que `/meta-test` é diagnóstico técnico, não fluxo normal.

