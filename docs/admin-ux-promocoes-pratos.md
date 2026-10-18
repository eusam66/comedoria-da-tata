# Comedoria da Tata — painel 2.0, promoções e compatibilidade de publicação

18/10/2026 — continuidade no Codex Cloud. **COMPATIBILIDADE CORRIGIDA E HOMOLOGADA — PRONTO PARA AUTORIZAÇÃO DE PUBLICAÇÃO.**

Escopo desta etapa: corrigir exclusivamente a transição entre a API publicada, promoções e rollback. Implementação anterior preservada. Nenhum commit, push, merge, deploy, migration ou escrita em produção foi executado. A autorização de publicação da etapa anterior não foi reutilizada: nesta etapa publicar está expressamente proibido.

## A — Causa exata da incompatibilidade

A migration `20261018153509` preservava a assinatura SQL, mas substituía o corpo da RPC e passava a exigir expectativas de preço dentro do JSON. A API publicada monta seus próprios objetos e descarta esses campos. A RPC levantaria `PRICE_CONFIRMATION_REQUIRED`, erro que a API publicada não trata, resultando em HTTP 500. O bloqueio anterior foi reproduzido e registrado; não houve nova tentativa de publicar o pacote incompatível.

A ausência desses dados não pode ser resolvida inventando preços confirmados pelo cliente. A correção preserva explicitamente o contrato legado de preço regular e mantém a confirmação estrita somente no contrato V2. O novo cliente utiliza um endpoint HTTP versionado, evitando depender de uma API antiga que descartaria suas expectativas.

## B — RPC e parâmetros afetados

| Contrato | Nome e assinatura | JSON de entrada | Regra financeira |
| --- | --- | --- | --- |
| Publicado/legado | `public.create_order_with_stock(p_id uuid,p_code text,p_customer jsonb,p_items jsonb)` | Cliente, entrega, fingerprint; ID/tipo/quantidade/adicionais/observações dos itens | Preço regular do catálogo, adicionais reais e taxa real. Não concede promoção. |
| Confirmado | `public.create_order_with_stock_v2(p_id uuid,p_code text,p_customer jsonb,p_items jsonb)` | Mesmos argumentos, com `p_customer.expected_total_cents` e `p_items[].expected_unit_cents` | Preço efetivo regular/promocional do servidor, com precondições estritas de confirmação. |

Não há parâmetros SQL opcionais, defaults de função ou sobrecargas: um nome por contrato, quatro argumentos nomeados com os mesmos tipos. O PostgREST resolveu ambos os nomes reais durante os testes. Probes com lista vazia receberam `EMPTY_ORDER`, sem pedido ou baixa de estoque.

A API publicada continua enviando os quatro argumentos originais. A API nova encaminha expectativas somente como precondições; nunca encaminha preço de venda manipulável. Campo ausente/inválido na V2 é rejeitado com 409, e expectativas parciais em `/api/orders` nunca fazem fallback para legado.

Permissões conferidas após a migration: `SECURITY DEFINER`, search_path vazio, execute apenas postgres/service_role, anon e authenticated sem execute. RLS e autenticação administrativa não foram alterados. Nenhuma chave privada é enviada ao navegador.

## C — Estratégia de compatibilidade

**Expand-contract, com dois contratos financeiros e uma ponte HTTP de rollback.**

- RPC original restaurada com cálculo regular no servidor; sem ler promoção. Foram mantidos validação de adicionais, transação, locks, taxa e estoque. A disponibilidade é verificada. Adicional duplicado usa erro que a API antiga já traduz para 400.
- V2 conserva a lógica financeira da promoção homologada: valores reais do catálogo, locks estáveis, estoque atômico e confirmação estrita. Não foi retirada nenhuma precondição da V2.
- `/api/orders` da feature aceita o corpo legado sem expectativas e usa a RPC original. Corpos com expectativas completas usam V2; parciais/inválidos são recusados. Isso mantém PWAs antigos funcionando na aplicação nova.
- Novo frontend usa **`/api/orders/v2`**, que exige confirmação. Não há fallback automático de uma tentativa promocional para preço regular.
- A ponte é a árvore do commit publicado com apenas o handler compartilhado e `/api/orders/v2` adicionados. A API `/api/orders` e a interface antigas permanecem byte a byte iguais à main de referência. Seu build foi aprovado separadamente.
- Antes da feature, publicar essa ponte e registrar seu deployment READY. Assim, feature e ponte atendem `/api/orders/v2`; rollback restaura a API/interface antigas e mantém o endpoint confirmado para abas/PWAs novos. Não depende de substituição instantânea de instâncias.
- O contrato legado não tem confirmação de preço do navegador: conserva o comportamento anterior de preços regulares recalculados no servidor. Não recebe descontos promocionais; o cliente precisa atualizar a interface para visualizar e confirmar a oferta pela V2. Essa é a regra transitória explícita do cenário E.
- Não remover a ponte/RPC legada nesta publicação. Uma eventual fase contract dependerá de outra avaliação de clientes antigos, fora deste escopo.

**Importante:** a migration original e a complementar precisam entrar **na mesma transação** em produção. Aplicá-las como duas operações com commits separados continua sendo inseguro. O pacote atômico foi preparado, sem execução.

## D — Arquivos e migrations alterados

Git: `eusam66/comedoria-da-tata`, origin `https://github.com/eusam66/comedoria-da-tata.git`, checkout `/workspace/comedoria-da-tata`, branch `feat/admin-ux-promocoes-pratos`. HEAD inicial/final e origin/main conferidos em `8e5ef5430be8658d6852cf1c98832a9fbaea7ea9`, divergência 0/0 após fetch. Working tree anterior preservado, sem staging.

| Arquivo | Mudança desta etapa |
| --- | --- |
| `supabase/migrations/20261018163002_dish_promotions_rpc_compatibility.sql` | Nova migration complementar; cria V2 e restaura legado sem remover dados/constraints. |
| `src/lib/orderRoute.ts` | Handler compartilhado, seleção explícita de contrato e erros controlados. |
| `src/app/api/orders/route.ts` | Entrada compatível para clientes antigos/novos. |
| `src/app/api/orders/v2/route.ts` | Endpoint confirmado preservado na ponte/rollback; GET de identificação sem escrita. |
| `src/app/page.tsx`, `src/lib/repos/ordersRepo.ts` | Envio das tentativas novas ao endpoint V2. |
| `scripts/rpc-compatibility.test.cjs` | Sete testes novos de contrato, validação e preservação da migration original. |
| `scripts/verify-rpc-compatibility-real.cjs` | Matriz A–J com código publicado real e Supabase real; cleanup e casos de erro adicionais. |
| `scripts/prepare-admin-promotions-release.cjs` | Gera patch da ponte, SQL atômico e manifest local, sem conectar/publicar. |
| `scripts/promotions-routes.test.cjs` | Mesmos testes da implementação financeira, apontando ao handler extraído. |
| Scripts de browser/integração existentes | Observadores de rede acompanham a URL V2; sem refazer fluxos aprovados. |
| SQLs de teste existentes | Chamadas da implementação promocional passam a nomear explicitamente V2. |
| `supabase/rollback/dish_promotions_manual.sql` | Removido rollback destrutivo; agora contém somente orientação e consulta diagnóstica de leitura. |
| `package.json` | Comando `test:compatibility`, sem nova dependência ou mudança de lockfile. |

A migration `20261018153509_dish_promotions_manual.sql` **não foi alterada**, SHA-256 `a186a01c7d008abb129596831153cb4baa531029211cdcb3414eaed3b15118de`.

A complementar foi criada com Supabase CLI e alinhada à versão efetivamente registrada pelo aplicador da homologação: **`20261018163002/dish_promotions_rpc_compatibility`**. SHA-256 `53b0272bb6c532e7d5835a65b24cce6a9dc7b64e6437d3da8cf0221c22aed5b1`. Aplicada uma vez, exclusivamente em `nkywpsftihxcuvdxeexn`; não houve edição posterior do SQL aplicado.

Colunas e constraints originais permanecem: `promo_price numeric(10,2)` opcional, `promo_active boolean not null default false`, preço regular positivo/finito/com precisão, promocional positivo e menor que regular, ativo exige valor. A complementar não altera preços, estoque, pedidos históricos, colunas ou constraints; nenhuma fixture está em migration.

Artefatos locais ignorados pelo Git:

- `artifacts/admin-ux-promocoes-pratos.patch`: diff completo atualizado, incluindo arquivos novos.
- `artifacts/admin-promotions-expand.sql`: migrations original e complementar em BEGIN/COMMIT único, com registros das duas versões no mesmo commit, preflight, timeouts, lock de migração e reload do schema.
- `artifacts/admin-promotions-bridge.patch`: dois arquivos adicionais aplicáveis à main de referência.
- `artifacts/admin-promotions-release-manifest.json`: base, migrations e hash da rota legada.

Nenhum desses artefatos publica automaticamente. O pacote exige revisar o projeto de destino e o estado anterior antes de eventual execução autorizada. Não executar db push indiscriminado: produção e homologação têm baselines de histórico diferentes.

## E — API antiga funcionando no banco atualizado

Foi carregado por `git show` o código real de `src/app/api/orders/route.ts` no commit `8e5ef5430be8658d6852cf1c98832a9fbaea7ea9`, juntamente com seus módulos de horário, idempotência e fulfillment dessa versão. SHA-256 da rota: `a048b686fda6cf3060674ea63239048b65750ba1b07dccf6d87633cf35b67f84`.

A única troca de ambiente foi fornecer um cliente Supabase direcionado à homologação validada. Não foram simulados RPC, preços, estoque, configuração operacional ou respostas financeiras. Requests HTTP reais passaram pelo handler e pela Data API/PostgREST reais.

Resultado: HTTP 200, R$ 59,90, estoque reduzido uma vez, tanto com promoção inativa como ativa. Concorrência entre a rota publicada e o corpo legado na API nova devolveu o mesmo pedido para a mesma chave, com uma única baixa.

A mesma árvore da main recebeu o patch da ponte em checkout temporário, preservando por comparação binária a rota e a Home antigas. Build aprovado. Um servidor Next real dessa árvore recebeu `/api/orders` e registrou o pedido fictício por R$ 59,90 no Supabase atualizado. Isso complementa o harness e confirma o contrato publicado sem simplificar seus argumentos.

## F — API nova funcionando no banco atualizado

Handlers e RPC V2 reais aprovaram preço normal/promocional, desativação, manipulação, adicionais, quantidade, taxas, snapshot e concorrência. Servidores Next reais da feature e da ponte recuperaram a mesma tentativa confirmada: mesmo ID, total R$ 49,90 e nenhuma nova baixa.

No Chromium 390×844, o fluxo Home → oferta → sacola → checkout → `/api/orders/v2` detectou desativação da promoção: primeiro POST 409, resumo R$ 59,90, nenhum pedido confirmado; segundo clique consciente retornou 200 com R$ 59,90. Confirmação usou snapshot, ABRIR WHATSAPP permaneceu visível/desabilitado na homologação e COPIAR MENSAGEM visível. Nenhum envio externo.

Página correta e conteúdo não vazio; sem erro de runtime/overlay ou transbordamento horizontal no cenário verificado. Screenshot: `/tmp/compat-checkout-v2-390.png`. Browser plugin sem ferramenta/runtime utilizável nesta sessão; utilizado Playwright/Chromium do Cloud dentro da autorização de testes. Somente assets externos foram bloqueados no browser, sem mock financeiro.

## G — Matriz obrigatória A–J

| Cenário | Resultado real em homologação |
| --- | --- |
| A — API antiga + banco atualizado | PASS: 200, 5.990 centavos, uma baixa. |
| B — API nova, pedido normal | PASS: V2 200, 5.990; PWA antigo em `/api/orders` novo também 200. |
| C — API nova, promoção ativa | PASS: 200, 4.990; regular 59,90 preservado no snapshot. |
| D — Promoção desativada | PASS: 200, 5.990; pedido promocional anterior permanece 4.990. |
| E — API antiga, promoção ativa | PASS: 200, 5.990 no contrato regular; nenhum desconto indevido. |
| F — Desativação durante checkout | PASS: 409 PRICE_CHANGED, resumo 5.990, nenhuma gravação/baixa; confirmação seguinte 200 pelo novo valor. Também validado no browser. |
| G — Rollback da aplicação | PASS: rota antiga 200 pelo regular; ponte V2 200 por 4.990 para cliente novo; mesmo pedido recuperado entre ponte e feature. |
| H — Simultâneos | PASS: legado antigo/novo mesma chave → 200/200, mesmo ID e uma baixa; V2/ponte mesma chave idem; última unidade → um 200 e um 409. |
| I — Ausentes/inválidos/manipulados | PASS: 400/409 sem corrupção/baixa; preço 0,01 adulterado não cobrado; adicionais inválidos/duplicados recusados. JSON nulo e item primitivo também 400. |
| J — Adicionais e entrega | PASS: 2×(49,90+2,00)+2×5,50+7,25 = 122,05; legado 142,05; subtotal promocional 114,80 e taxa 7,25 preservados. |

Evidências: `artifacts/rpc-compatibility-real.json` (29 chamadas, matriz completa), `rpc-compatibility-edges.json`, `rpc-compatibility-next-browser.json`. Todos com status e cleanup aprovados. Fixtures exclusivas removidas, pedidos fictícios cancelados e mantidos no histórico; funcionamento e catálogo anterior de homologação restaurados. Cancelamento repetido também executado sem erro. Nunca foi utilizado pedido ou estoque real.

## H — Validações consolidadas

| Check | Resultado final |
| --- | --- |
| TypeScript `npx tsc --noEmit` | PASS |
| ESLint `npm run lint` | PASS: zero erros, seis avisos existentes |
| `test:hours` | PASS: 8 |
| `test:checkout` | PASS: 13 |
| `test:promotions` | PASS: 10 |
| Delivery zones + order operations unit/rotas | PASS: 13 |
| `test:compatibility` | PASS: 7 novos |
| Total automatizado unitário/rotas | **51/51**, incluindo todos os 44 anteriores |
| Build local da feature | PASS |
| Build da main real com apenas a ponte | PASS |
| Matriz integrada real | PASS A–J, ambos os contratos resolvidos pelo PostgREST |
| SQL de promoções + integração de homologação | PASS, alterações desfeitas com rollback |
| Smoke HTTP em Next + checkout móvel V2 | PASS |
| `git diff --check` e validação reversa do patch | PASS |

Os sete testes novos verificam seleção legada, seleção V2, expectativas parciais/inválidas sem downgrade, confirmação obrigatória no endpoint V2, payloads/quantidades inválidos, preservação da migration original e SQL não destrutivo, e rejeição controlada de adicional duplicado.

Foi feita uma bateria consolidada. Um erro ESLint no novo harness (`no-inner-declarations`) foi corrigido; a revisão de entrada também identificou adicional duplicado que precisava mapear para 400 na API nova. Foram repetidos somente os checks afetados e o cenário de erro específico. A matriz A–J completa não foi repetida. Não houve repetição da auditoria visual global.

Os seis avisos ESLint permanecem: cinco usos de img e uma variável não usada em `scripts/create_buckets.js`. Node informa MODULE_TYPELESS_PACKAGE_JSON em testes existentes, sem impedir execução. O script SQL exclusivo local de delivery zones tem uma guarda que bloqueou corretamente a tentativa remota antes das fixtures; ela não foi removida ou contornada. A validação remota de taxas foi feita pela matriz J e pelo SQL próprio da homologação.

Advisors da homologação após DDL: seis informações de [RLS sem policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), aviso de [proteção contra senhas vazadas desabilitada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), cinco informações de [índices sem uso](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index) e seis avisos de [índices duplicados](https://supabase.com/docs/guides/database/database-linter?lint=0009_duplicate_index). Referem-se ao schema/configurações anteriores; a complementar só altera funções e seus GRANTs. Não foram removidos índices ou alterada autenticação fora do escopo.

Logs: `/tmp/compat-{typescript,lint,hours,checkout,promotions,compatibility,other-tests,build}.log`, `/tmp/compat-check-results.json`, `/tmp/compat-compat-real.log`, `/tmp/compat-compat-edges.log`, `/tmp/compat-bridge-build.log`, `/tmp/compat-browser-smoke.log`.

## I — Ordem segura de publicação futura

**Preparada, não executada. Depende de nova autorização.**

1. Confirmar novamente origin/main, diff aprovado, projeto COMEDORIA DA TATA `kjxivrltvdiswpaxjowa`, estado de schema/histórico e definição/GRANTs da RPC anterior. Produção deve continuar sem as colunas/versões promocionais. Preservar snapshot de leitura para comparação.
2. Revisar/gerar o pacote `admin-promotions-expand.sql`. Aplicar **as duas migrations e seus dois registros de histórico em uma única transação**, com os timeouts/preflight preparados. Não aplicar `20261018153509` isolada. Falha aborta a transação inteira e conserva o contrato publicado; não executar rollback destrutivo.
3. Conferir por leitura os dois registros, colunas/defaults/constraints, uma assinatura por nome, permissões, cache PostgREST e advisors. O legado continua regular antes/depois do commit, comprovado na matriz A/E. Promoções começam inativas. Não ativar oferta, mudar preço ou criar pedido real para teste.
4. Publicar primeiro a **ponte**, baseada na main aprovada e contendo somente os dois arquivos do patch da ponte. Manter Home e `/api/orders` antigos. Aguardar READY, conferir commit/domínio e GET `/api/orders/v2`; registrar o commit e deployment dessa ponte como alvo seguro de rollback.
5. Só depois integrar/publicar a feature completa, preservando a ponte V2. Requests antigos continuam no legado; clientes novos encontram V2 tanto na ponte quanto na feature. Não presumir que instâncias/requisições antigas desapareceram instantaneamente.
6. Após READY, verificar por leitura catálogo, login, status operacional, endpoints e logs; conferir commit/domínio. Sem escrita de teste em produção. Não ativar ofertas automaticamente.
7. Se necessário, reverter o código para a ponte registrada, mantendo banco e endpoint V2. A sequência é sustentada pelos cenários A–J e pelo teste real entre dois servidores Next.

O banco pode ser expandido antes da aplicação **somente com o pacote atômico completo**. A aprovação isolada da migration complementar na homologação não torna seguro um commit intermediário da migration original em produção.

## J — Rollback seguro

Alvo: main antiga **mais a ponte compatível**, cujo commit/deployment deverá ser registrado antes da feature. A API antiga usa o preço regular; o cliente novo em cache continua chamando V2 com preço confirmado. Pedidos em andamento/retries mantêm a chave e recuperam snapshot, sem nova baixa. Não reverter diretamente para o deployment original sem a ponte enquanto houver clientes V2.

Preservar `promo_price`, `promo_active`, constraints, RPCs, configurações promocionais e snapshots. Não excluir colunas, não reescrever pedidos, não restaurar a RPC incompatível e não usar force push. Nenhum rollback foi executado nesta etapa.

A referência de produção continua: commit `8e5ef5430be8658d6852cf1c98832a9fbaea7ea9`, deployment `dpl_A8z3QCA3g9GgY3U8F26VNZcTNsdY` (READY na leitura anterior). Não há commit/deployment novo ou alvo de ponte publicado nesta etapa.

## K — Produção intacta e funcionalidades preservadas

Produção consultada **somente para leitura**, pelo connector COMEDORIA DA TATA. Definição da RPC permanece com MD5 `f52ec1694e327a49b294a38f4fe658f4`; zero colunas promocionais e zero registros das versões `20261018153509`/`20261018163002`. Nenhuma escrita nossa em preços, pedidos, estoque, funcionamento ou credenciais. Nenhum acesso ao LuziCred, envio de WhatsApp, serviço pago, commit, push, merge ou deploy.

Homologação exclusiva: `comedoria-da-tata-homologacao`, ref `nkywpsftihxcuvdxeexn`, organização `kngtolcorjmbbhrktdpq` / `eusam66`, ACTIVE_HEALTHY. Baseline `20261017154838`, original promocional `20261018153509`, complementar `20261018163002`.

Preservadas as melhorias anteriores: edição com título/foco/rolagem/retorno, feedback e bloqueio de repetição; mobile com Mais/safe area; desktop completo; filtros/pesquisa; campos numéricos apagáveis; preço regular separado, promoções manuais sem expiração, destaque na Home, duplicação sem oferta e estoque zero; adicionais/taxas/snapshot/idempotência; abertura manual sem expiração, fechamento/horários; upload e autenticação. Botões ABRIR WHATSAPP e COPIAR MENSAGEM continuam organizados conforme referência, sem envio automático e com bloqueio de homologação.

A homologação visual anterior em 390×844, 1440×1000 e 320×700 foi reaproveitada. Nesta etapa, só o checkout móvel afetado pelo endpoint foi exercitado novamente. iPhone/Safari, Android físico, teclado virtual, rotação, VoiceOver/TalkBack e PWA instalado permanecem pendentes para homologação humana. O comportamento de coexistência de clientes antigos/novos foi testado por contratos/servidores reais, sem alegar teste de PWA instalado no sistema.

## L — Próxima ação necessária

Revisar este relatório, o diff completo, o pacote SQL atômico e o patch da ponte; depois fornecer autorização específica para a publicação em fases descrita em I. Esta etapa não executa qualquer publicação, mesmo com os testes aprovados.

**STATUS: COMPATIBILIDADE CORRIGIDA E HOMOLOGADA — PRONTO PARA AUTORIZAÇÃO DE PUBLICAÇÃO.**

## Arquivos da implementação consolidada

55 arquivos locais no total, incluindo a implementação anterior; nenhum secret, .env, log ou artefato temporário incluído.

- `package.json`
- `scripts/verify-checkout-browser.cjs`
- `scripts/verify-homologacao-real.cjs`
- `scripts/verify-order-operations-browser.cjs`
- `src/app/admin/banners/page.tsx`
- `src/app/admin/beverages/page.tsx`
- `src/app/admin/categories/page.tsx`
- `src/app/admin/dishes/page.tsx`
- `src/app/admin/layout.tsx`
- `src/app/admin/orders/page.tsx`
- `src/app/api/admin/dishes/[id]/route.ts`
- `src/app/api/admin/dishes/route.ts`
- `src/app/api/admin/orders/route.ts`
- `src/app/api/dishes/route.ts`
- `src/app/api/menu/route.ts`
- `src/app/api/orders/route.ts`
- `src/app/dishes/[slug]/page.tsx`
- `src/app/page.tsx`
- `src/app/storefront-enhancements.css`
- `src/components/CartContext.tsx`
- `src/components/CartDrawer.tsx`
- `src/components/DeliveryZonesSettings.tsx`
- `src/components/DishCard.tsx`
- `src/components/DishDetailClient.tsx`
- `src/components/DishesBrowser.tsx`
- `src/components/OrderConfirmation.tsx`
- `src/lib/addons.ts`
- `src/lib/adminApi.ts`
- `src/lib/adminAuthSafe.ts`
- `src/lib/api.ts`
- `src/lib/repos/ordersRepo.ts`
- `src/lib/toast.ts`
- `src/lib/types.ts`
- `src/styles/globals.css`
- `supabase/homologacao/integration.sql`
- `supabase/tests/delivery_zones.sql`
- `docs/admin-ux-promocoes-pratos.md`
- `scripts/prepare-admin-promotions-release.cjs`
- `scripts/promotions-routes.test.cjs`
- `scripts/rpc-compatibility.test.cjs`
- `scripts/verify-admin-promotions.cjs`
- `scripts/verify-rpc-compatibility-real.cjs`
- `src/app/admin/admin.css`
- `src/app/api/orders/v2/route.ts`
- `src/components/DishPrice.tsx`
- `src/lib/orderRoute.ts`
- `src/lib/pricing.test.ts`
- `src/lib/pricing.ts`
- `src/lib/useAdminEditor.ts`
- `src/lib/useAdminListContext.ts`
- `src/lib/useDialogFocus.ts`
- `supabase/migrations/20261018153509_dish_promotions_manual.sql`
- `supabase/migrations/20261018163002_dish_promotions_rpc_compatibility.sql`
- `supabase/rollback/dish_promotions_manual.sql`
- `supabase/tests/dish_promotions.sql`
