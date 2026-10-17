# Comedoria da Tata — relatório consolidado

> Preservação: o histórico abaixo descreve a homologação anterior. A autorização posterior permite commit e push somente da branch `fix/estabilizacao-checkout-cloud`, sem merge ou deploy. Consulte `docs/recuperacao-github.md` para a recuperação remota. A classificação abaixo se refere à integração de homologação, não à preservação do código.

Classificação atual: **HOMOLOGAÇÃO PARCIAL — AÇÃO MANUAL NECESSÁRIA**.

Data: 17/10/2026, horário de Fortaleza. Nenhum commit, push, PR, merge, deploy, envio real de WhatsApp ou escrita em produção foi executado. A conta/projeto LuziCred não foi acessada. As operações remotas de escrita foram restritas à nova homologação gratuita da Comedoria.

## Retomada — Auth confirmado, configuração publicada ainda ausente no runtime

A imagem enviada pelo proprietário confirma as variáveis cadastradas, os valores mascarados e as alterações salvas/publicadas. A verificação da execução atual, porém, ainda não permite confirmar a disponibilidade dos secrets: `SUPABASE_SERVICE_ROLE_KEY` e `HOMOLOGACAO_ADMIN_PASSWORD` estão ausentes do processo e da configuração local conhecida. Nenhum valor foi exibido ou registrado.

O status do Cloud está atual (`observations_current=true`), revisão desejada e observada **17**, mas retorna **`secrets: []` e `runtime_variables: []`**. A versão vinculada à execução é `e80381bc-62e4-479d-b563-a5dfcbcc7b81~cecfgver_6ad393d06c90819fb17a2ab9f87d8eff`. Isso diferencia a publicação informada da disponibilidade efetivamente observada nesta tarefa; não se conclui que a chave ou a senha cadastradas sejam inválidas, pois elas não estão acessíveis para validação.

### Auth e autorização — aprovados na consulta da homologação

A consulta exclusiva ao projeto `nkywpsftihxcuvdxeexn` confirmou:

- Um usuário Auth `admin-homologacao@example.invalid`.
- Email confirmado.
- Um membership correspondente em `public.admins`, com `role=admin`.
- Um vínculo válido por email normalizado entre Auth e admins.
- Marcador de ambiente igual a `nkywpsftihxcuvdxeexn`.

**Não é necessário criar outro usuário ou alterar o membership.** O código atual vincula os registros pelo email; os UUIDs das duas tabelas não precisam ser iguais. O login real com senha ainda depende dos secrets no runtime.

### Pendência operacional específica

Aplicar à execução desta mesma tarefa a versão da configuração que contém os dois secrets, preservando o checkout e as alterações locais. Se o painel indicar outra configuração/versão, conferir o vínculo com a versão acima. Reiniciar apenas o servidor Next não injeta variáveis que estão ausentes do ambiente Cloud. Não inserir os valores em chat, logs, Git ou variáveis `NEXT_PUBLIC_*`; não usar as credenciais da Vercel de produção como alternativa.

Após a imagem, o status foi consultado novamente e permaneceu na revisão 17, sem bindings de secrets ou variáveis. A ferramenta disponível nesta sessão só consulta o estado; não oferece reinício, reconexão ou aplicação de outra versão da configuração. É necessária a aplicação/reconexão da versão publicada pela plataforma, sem recadastrar ou expor valores. Até a disponibilidade ser observada, o teste de integração permanece interrompido no preflight, sem tentativa de login com senha fictícia. A pertença da chave ao projeto **ainda não pode ser confirmada** nesta execução; sua ausência não autoriza assumir que esteja correta.

### Validações desta retomada

- Catálogo real da homologação: **HTTP 200, três pratos fictícios**.
- TypeScript: **PASS**, executado novamente após o build terminar. A primeira checagem concorrente com o build encontrou arquivos temporários de `.next/types` removidos durante a geração; a execução sequencial passou, sem alteração de fonte.
- ESLint: **PASS, zero erros e seis avisos preexistentes**.
- Testes existentes e novos: **PASS, 22 testes** na execução conjunta.
- Build: **PASS**.
- `git diff --check`: **PASS**.
- Revalidação de interface desktop/mobile, link simulado e PWA: usa os harnesses já preparados e não substitui o fluxo HTTP/backend autenticado.

O código da aplicação, as correções de WhatsApp/idempotência/PWA/ESLint, a branch e o HEAD foram preservados. Não houve nova migration, criação de usuário ou escrita remota nesta retomada. Não houve commit, push, merge, deploy, WhatsApp real, alteração de produção ou acesso a LuziCred.

### Próxima execução quando os secrets estiverem disponíveis

O harness existente valida ambas as URLs, o modo de homologação, o ref da chave JWT administrativa e o marcador do banco antes de qualquer escrita. Ref diferente do esperado bloqueia a execução. Usa servidor local próprio; uma porta ocupada interrompe o teste antes de enviar credenciais. O comando é:

```sh
node --use-env-proxy --use-system-ca --env-file=.env.local scripts/verify-homologacao-real.cjs
```

Com as credenciais disponíveis, executa login/autorização reais, horários, loja fechada/aberta, taxas, criação concorrente com a mesma chave, conflito de chave, estoque, retirada, checkout desktop/mobile, mensagem, cópia real, recuperação/reload, cancelamento e reposição. Cancela somente seus próprios pedidos fictícios e restaura a configuração de funcionamento anterior. O WhatsApp permanece bloqueado. Nenhum desses testes autenticados será considerado aprovado com base em mocks ou apenas no preflight.

Evidências atuais: `artifacts/retomada-verification.json`, `artifacts/retomada-validation.log` e `artifacts/homologacao-real-results.json`. Foi preparado o backup `/workspace/comedoria-homologacao-backup.tar.gz`, contendo diff e arquivos novos, sem `.env.local`, chaves ou senhas. Antes de qualquer recriação que possa eliminar o checkout, esse backup deve ser preservado fora da instância. O ambiente atual não foi excluído ou recriado.

## A — Git

- Repositório: `eusam66/comedoria-da-tata`, checkout `/workspace/comedoria-da-tata`.
- Estado inicial: branch `work`, working tree limpa.
- Branch local criada: `fix/estabilizacao-checkout-cloud`.
- HEAD inicial e final: `a2b8a9be23592c579140991c2c5cb64fdfaea72f`. HEAD permanece igual porque commits não foram autorizados.
- `git fetch origin` passou após habilitar acesso de rede ao comando. Comparação `HEAD...origin/main`: `0 0`; a API do GitHub também confirmou `identical`.
- Estado final: alterações locais e arquivos novos, sem staging. Nenhum trabalho preexistente foi descartado.
- Diff revisado; `git diff --check` passou. Estatísticas de arquivos rastreados não incluem os novos arquivos ainda não adicionados ao Git. Inventário completo ao final deste relatório.

## B — WhatsApp e checkout

### Evidências e causa

O fluxo ativo em `src/app/page.tsx` registrava o pedido pela API, limpava a sacola e navegava imediatamente para `wa.me` depois do `await`. Não mantinha confirmação, mensagem copiável ou botão de reabertura. Uma falha na passagem ao aplicativo deixava o cliente sem esse caminho de recuperação. Esse fluxo usa navegação na mesma aba: não se pode atribuir seu incidente especificamente a bloqueio de pop-up sem reprodução no dispositivo.

O componente legado `src/components/Checkout.tsx`, sem importadores no checkout ativo, não registrava pedidos no backend: apresentava confirmação, abria `window.open` após 800 ms, limpava a sacola e fechava a tela. Seu fallback era um número fictício. Esse caminho tinha risco comprovável de bloqueio de pop-up e divergência de destino.

O backend gerava um novo UUID em cada POST; não havia identificação persistente da tentativa. Uma resposta perdida após o commit permitia criar outro pedido ao tentar novamente.

Foram pesquisados carrinho global, carrinho da página, detalhe do prato, componentes de WhatsApp, página de acompanhamento, repositório legado de pedidos e endpoint administrativo. O endpoint administrativo autenticado de criação manual e `ordersRepo` legado não são chamados pelo checkout público. O primeiro continua como dívida técnica: cria manualmente pedidos sem usar a RPC de estoque; não foi alterado nesta estabilização do fluxo público.

### Implementação

- Pedido confirmado somente depois da resposta de registro. Tela com código, itens, atendimento, zona/taxa e total histórico, além da mensagem completa.
- `ABRIR WHATSAPP` é um link HTTPS acionado diretamente pelo cliente, com `target="_blank"` e proteção de opener. A tela permanece disponível se a abertura não funcionar.
- `COPIAR MENSAGEM` informa sucesso ou falha de permissão. O texto selecionável permanece disponível como alternativa.
- O cliente é orientado a confirmar o envio dentro do WhatsApp. Não se afirma que a mensagem foi enviada.
- O cliente pode voltar ao cardápio e reabrir a confirmação; ela também é recuperada após recarregar a mesma aba.
- Construção centralizada em `src/lib/whatsapp.ts`. Código, cliente, quantidades, adicionais, observações, endereço/referência, entrega/retirada, zona, subtotal, taxa, pagamento/troco e total usam os dados devolvidos pelo servidor.
- Número comercial preservado: `5581992743126`. `NEXT_PUBLIC_WHATSAPP_PHONE` pode substituí-lo; valor vazio/inválido desabilita o link. Nenhum número fictício continua como fallback.
- `NEXT_PUBLIC_APP_ENV=homologacao` desabilita todos os links de WhatsApp, inclusive os componentes de contato.
- O checkout legado agora encaminha ao checkout único que registra estoque e taxas.

### Idempotência

A tentativa guarda UUID e corpo imutável em memória e `sessionStorage`. Um bloqueio síncrono com `useRef` impede duplo submit antes de o React renderizar o loading. A requisição tem timeout de 20 segundos; falhas incertas mantêm a tentativa original e oferecem consulta/retry. Erros de validação conhecidos permitem corrigir os dados.

A API exige `Idempotency-Key` UUID v4, grava o UUID em `orders.id` e associa um SHA-256 do corpo à metadata existente. Repetições devolvem o registro original antes de conferir novamente horário/estoque. Reutilização da chave com conteúdo diferente retorna conflito. Na disputa concorrente, a chave primária existente provoca rollback da segunda transação, incluindo a baixa de estoque; a API recupera o pedido vencedor. Não foi criada migration nem alterada RPC de produção para essa proteção.

Reabrir o WhatsApp ou copiar a mensagem não chama a API, não gera código, não baixa estoque, não recalcula o total e não cria movimentação financeira. A proteção é por tentativa/UUID; dois pedidos deliberadamente iniciados com chaves diferentes são pedidos distintos.

### Testes e limites

Passaram testes de mensagem, URL/encoding com acentos, emoji, quebras de linha e caracteres reservados, retirada, total persistido, falha/retry, conflito de chave e recuperação após falha de RPC. No navegador, houve dois POSTs com a mesma chave/corpo — o primeiro foi interrompido de propósito e o segundo confirmou — e nenhum POST ao reabrir/recarregar a confirmação.

O componente real de confirmação também foi renderizado isoladamente e recebeu dois cliques no link de WhatsApp. As duas navegações externas foram abortadas pelo navegador de teste antes de sair; a mensagem foi decodificada corretamente e não houve POST de pedido. Não houve envio real.

Safari/iPhone, Chrome/Android, Instagram e abertura do aplicativo nativo não foram usados. Não se declara aprovação nesses dispositivos. O comprimento máximo de mensagem suportado por cada aplicativo também exige homologação real; a cópia é o fallback.

## C — Supabase de homologação

### Ambiente e custo

A descoberta pela conexão **COMEDORIA DA TATA** encontrou somente produção. Foram confirmados a organização `eusam66` (`kngtolcorjmbbhrktdpq`), plano `free`, e custo de criação de **US$ 0/mês**.

Foi criado:

- Nome: `comedoria-da-tata-homologacao`.
- Project ref: `nkywpsftihxcuvdxeexn`.
- Região: `sa-east-1`.
- Estado: `ACTIVE_HEALTHY`.
- API: `https://nkywpsftihxcuvdxeexn.supabase.co`.
- Dashboard: <https://supabase.com/dashboard/project/nkywpsftihxcuvdxeexn>.

Produção foi consultada exclusivamente para metadados de estrutura/migrations, sem copiar clientes, pedidos, usuários, credenciais ou imagens.

### Reconciliação

A família `db/migrations` descreve modelo antigo incompatível (por exemplo, `orders.customer`), enquanto o app atual usa campos `customer_name`, `customer_phone`, `customer_address` e `metadata`. As migrations atuais não bastam como sequência cega: 004/005 alteram catálogo real, 006 contém administrador real e 008 faz backfill histórico. Elas não foram executadas na homologação.

A baseline revisada combina a estrutura de 001 e 003, estoque/RPCs de 007 e taxas/RPC de 009, mais `dishes.ingredients`, que existe no banco real mas não está coberto por essa sequência. Ela adiciona índice de FK em `order_history.order_id` e aplica privilégios explícitos. O arquivo de bootstrap exige projeto vazio e não é uma migration de produção.

Migration aplicada somente na homologação: `20261017154838_homologacao_baseline_reconciled_009`.

Tabelas: `admins`, `categories`, `dishes`, `beverages`, `banners`, `restaurant_settings`, `orders`, `order_history`, `delivery_zones`. Todas com RLS ativo. `order_operations` é uma chave de `restaurant_settings`, não uma tabela.

Foram conferidos schemas `public/auth/storage`, colunas, constraints, índices, trigger de atualização de zonas, histórico de migrations e permissões. Os hashes de `pg_get_functiondef` das três funções abaixo são idênticos entre produção e homologação:

- `create_order_with_stock(uuid,text,jsonb,jsonb)`.
- `update_order_status_with_stock_restore(text,text)`.
- `touch_delivery_zone_updated_at()`.

As RPCs de estoque continuam exclusivas de `service_role`. Catálogo pode ser lido por anon/authenticated. Pedidos, administradores, configurações e zonas são acessados pelas rotas do servidor. O advisor de segurança não reportou erro ou aviso: trouxe seis informações de “RLS sem política”, intencionais nas tabelas acessadas somente pelo servidor: <https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy>.

### Dados, Auth e Storage

Fixtures identificadas como HOMOLOGAÇÃO: categoria, três pratos (normal, indisponível e última unidade), bebida, duas zonas (paga e gratuita), horários, configurações e administrador fictício. Foram mantidos dois pedidos fictícios: um exemplo para retirada e um da disputa concorrente, depois cancelado com reposição. Os testes transacionais adicionais fizeram rollback.

Buckets criados: `dishes`, `banners`, `branding`, públicos para imagens, limitados a 10 MiB e tipos JPEG/PNG/WebP. Não há políticas de escrita de objetos para anon/authenticated; o caminho administrativo usa servidor autenticado com service role. A configuração foi conferida; upload real pelo painel ainda depende das credenciais de servidor e do usuário Auth.

O usuário `admin-homologacao@example.invalid` agora existe no Auth, está confirmado e corresponde à linha de `public.admins` com `role=admin`. Essa configuração foi reconfirmada nesta retomada. Não foram reutilizados usuários reais ou fabricadas credenciais por SQL.

### Configuração segura e pendência de integração

Foi preparado `.env.local`, ignorado pelo Git e com permissão 600, contendo somente URLs de homologação, chave pública de homologação, modo de homologação e WhatsApp desabilitado. A chave administrativa está ausente. O modelo público sem credenciais fica em `supabase/homologacao/.env.example`.

`SUPABASE_SERVICE_ROLE_KEY` deve ser configurada como secret de servidor no Cloud, obtida exclusivamente do novo projeto. Nunca preencher `NEXT_PUBLIC_*` com essa chave. O validador exige que `SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_URL` correspondam ao ref esperado em modo homologação e rejeita a URL pública de produção. Não há fallback automático para produção.

A leitura da configuração Vercel correta confirmou quatro variáveis: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`, todas compartilhadas entre Production e Preview. A URL pública aponta para o ref de produção. Não foram lidos os valores secretos nem alterada a Vercel. `NEXT_PUBLIC_WHATSAPP_PHONE` e `NEXT_PUBLIC_SITE_URL` não aparecem nessa listagem. Portanto, um futuro deploy Preview **não deve reutilizar essas variáveis de produção**; precisa de configuração exclusiva por projeto/branch/ambiente antes de ser autorizado.

Para completar com segurança:

1. Configurar a service role do ref `nkywpsftihxcuvdxeexn` no mecanismo de secrets do ambiente de testes e reiniciar o servidor.
2. O administrador Auth já existe, está confirmado e tem membership válido. Disponibilizar sua senha exclusiva como `HOMOLOGACAO_ADMIN_PASSWORD` no runtime seguro; não criar outro usuário e não colocar senha em Git, chat ou relatório.
3. Configurar Site URL e redirects de Auth apenas para a origem local/de homologação que será usada.
4. Validar login/logout, autorização do painel, upload nos três buckets e o fluxo completo navegador → `/api/orders` → RPC → confirmação → cancelamento/histórico.
5. Repetir os testes de horários/loja fechada pela API real do app, além dos testes puros já aprovados.

### Integração efetivamente realizada

- RPCs reais no novo banco: criação, taxa de entrega, retirada, preço de catálogo contra adulteração, adicional, bebida, estoque suficiente/insuficiente, zona inativa, UUID repetido, total histórico, cancelamento repetido, reposição e histórico: PASS.
- Duas chamadas paralelas disputando estoque 1: uma passou e outra retornou `INSUFFICIENT_STOCK`; saldo 0, um pedido. Depois o pedido fictício foi cancelado e a unidade reposta.
- HTTP real com chave anônima da homologação: catálogo `200` com três pratos; leitura de pedidos `401 / 42501`.
- Aplicação sem service role: `/api/orders` devolveu `503`, sem fallback. O fluxo completo HTTP/backend e Auth **não está aprovado**. Os mocks de interface não substituem essa validação.

## D — PWA

Os 54 erros foram reproduzidos: cinco `no-undef` em `public/sw.js` e 49 em `public/workbox-4754cb34.js`, incluindo globals do Worker e padrões de código minificado (`no-empty`, `no-cond-assign`, `no-func-assign`). São artefatos gerados por Workbox 6.5.4/next-pwa de um build antigo. O projeto atual não tem next-pwa nas dependências e não gera esses arquivos no build. O README ainda descrevia a intenção antiga.

Além da configuração de lint, havia problema funcional: precache com nomes de chunks antigos, cache genérico de APIs GET e fallback de páginas/respostas potencialmente antigas. POSTs não eram cacheados, mas leituras de estado/zonas poderiam voltar de cache em falhas de rede.

O worker foi substituído por fonte legível mantida manualmente no mesmo `/sw.js`; nenhum service worker foi excluído para silenciar lint. O Workbox antigo permanece no repositório como artefato sem referência e é ignorado especificamente pelo lint. O worker atual é analisado com globals de Service Worker.

A estratégia nova usa rede primeiro e cache limitado para assets públicos e shell `/`. Não intercepta métodos diferentes de GET, APIs, Auth, admin, pedidos, checkout com query string, RSC ou origens externas. A ativação remove caches legados conhecidos, assume o controle e preserva caches sem relação com a aplicação. Falha de CacheStorage não descarta resposta de rede válida. Assets/shell previamente visitados permanecem disponíveis offline; o estado da loja não é inventado offline.

Registro automático somente em build de produção, com `updateViaCache: none`. Headers impedem cache HTTP de `/sw.js` e APIs. O build continua sem gerar um precache de todos os arquivos: a experiência offline depende de visita online prévia.

Testes VM passaram para bypass das rotas sensíveis, atualização, fallback offline e falha de cache. No Chromium real, a atualização removeu os caches legados, um ícone carregou offline com `200`, o shell recarregou offline com `200`, a API de funcionamento falhou sem devolver o valor antigo e a interface permaneceu fechada para pedidos. Resultado em `artifacts/pwa-browser-results.json`.

Risco restante: atualização de instalações já existentes e comportamento offline no Safari/PWA instalado precisam de teste físico antes da publicação.

## E — ESLint e dependências

Antes: Next 15.5.22, React/React DOM 19.2.8, TypeScript 5.9.3, ESLint 8.57.1, eslint-config-next 13.5.11; `next lint` depreciado; 17 avisos no lint normal; 54 erros na análise ampliada.

Depois:

- `eslint-config-next` fixado em **15.5.22**, alinhado ao Next instalado.
- ESLint permanece em 8.57.1, compatível com a configuração utilizada.
- `npm run lint` usa `eslint . --ext .js,.cjs,.ts,.tsx` e cobre código, scripts, configurações e worker mantido manualmente.
- Globals adequados por contexto. Regra TypeScript de variáveis não usadas substitui a regra JavaScript em TS/TSX, evitando falsos avisos em assinaturas de tipos.
- `.next`, dependências e apenas `public/workbox-*.js` são ignorados pelos motivos descritos. Não foram desabilitadas globalmente regras importantes.
- `package-lock.json` foi atualizado pela instalação; metadados de plataforma que o npm removeu foram preservados e quebras de linha não relacionadas foram mantidas para reduzir o diff.
- Next, React, React DOM, TypeScript e Supabase mantiveram exatamente suas versões anteriores. Não houve upgrade geral.

Resultado: **zero erros e seis avisos preexistentes em arquivos agora cobertos pelo lint**: cinco ocorrências de `<img>` (página pública e bebidas administrativas) e uma variável não usada no script antigo de buckets. Os avisos de assinaturas TS eram falsos positivos; o componente de registro do worker foi corrigido. Não foram feitas refatorações de imagem apenas para zerar avisos. O Node ainda emite o aviso benigno `MODULE_TYPELESS_PACKAGE_JSON` ao executar os testes TS, também presentes nos testes antigos.

## F — Validação

| Verificação | Resultado |
| --- | --- |
| `./node_modules/.bin/tsc --noEmit --incremental false` | PASS |
| `npm run lint` | PASS: 0 erros, 6 avisos |
| `npm run test:hours` | PASS: 3 testes |
| `node --experimental-strip-types --test src/lib/deliveryZones.test.ts` | PASS: 6 testes |
| `npm run test:checkout` | PASS: 13 testes novos |
| Execução conjunta sem isolamento de processos | PASS: 22 testes, 0 falhas |
| `npm run build` | PASS, Next 15.5.22 |
| `git diff --check` | PASS |
| Chromium desktop 1440×1000 | PASS no fluxo com respostas controladas |
| Chromium viewport mobile 390×844 | PASS no fluxo com respostas controladas |
| Link real do componente, isolado | PASS: 2 cliques, navegações abortadas, 0 POSTs |
| PWA no Chromium | PASS: atualização, shell/asset offline, API sem cache antigo |
| RPCs/banco de homologação reais | PASS nos cenários descritos em C |
| HTTP real do app até o banco | PENDENTE: falta service role de homologação |
| Auth e upload pelo painel | Auth/membership configurados; teste autenticado pendente da injeção de credenciais |
| Dispositivos físicos e WhatsApp nativo | NÃO EXECUTADO |

Os testes de interface cobriram sacola, checkout, entrega, zona, total, troca para retirada, confirmação, duplo submit, falha de rede, retry com mesma chave/corpo, mensagens de erro, cópia com sucesso/permissão negada, volta ao cardápio, reabertura e reload sem novo POST. Não houve erro JavaScript na execução de produção. Fontes externas foram substituídas por CSS vazio no harness de interface, usando fontes de fallback; a navegação externa foi bloqueada. A emulação de viewport não é aprovação em aparelho físico.

Os problemas transitórios encontrados durante a implementação — tipagem do cliente Supabase sem schema gerado, plugin ESLint não declarado, ambiguidade de variável na consulta de teste e seletores do harness — foram corrigidos e as verificações pertinentes repetidas. Não ficaram regressões conhecidas nos checks executados. Erros de prefetch/rede no servidor sem configuração completa não são tratados como aprovação de integração.

## G — Pendências

### 1. Bloqueios reais

- Secret `SUPABASE_SERVICE_ROLE_KEY` exclusivo da homologação não disponível no ambiente; impede a integração real da aplicação e os testes administrativos.
- A senha do usuário Auth confirmado ainda não está disponível ao runtime para executar login real; o vínculo com admins está correto.

### 2. Limitações do ambiente

- Testes visuais usam Chromium e respostas controladas. Não há Safari, aparelhos físicos ou WhatsApp nativo nessa validação.
- Rede do cloud exige uso do proxy e confiança na CA. Na continuação, o acesso Node real ao catálogo passou com `--use-env-proxy --use-system-ca`; o servidor e harness de integração devem usar esses parâmetros.
- A confirmação e a tentativa sobrevivem ao reload na mesma aba quando `sessionStorage` está disponível. Fechar a aba, limpar o armazenamento ou usar outro dispositivo não constitui recuperação persistente entre dispositivos; esse cenário exigiria funcionalidade adicional.

### 3. Melhorias futuras não essenciais

- Revisar a rota administrativa antiga de criação manual e o repositório legado de pedidos antes de expor um novo fluxo administrativo de lançamento.
- Reduzir os seis avisos existentes quando houver trabalho específico de imagens/scripts.
- Se necessário, acrescentar recuperação de confirmação entre abas/dispositivos e tratamento específico de mensagens extremamente longas.

### 4. Antes de publicação

Disponibilizar secrets de homologação no runtime, concluir o fluxo integrado real, homologar Safari/Android/Instagram e atualização de PWA existente, revisar este diff e autorizar explicitamente commit, push, PR e eventual deploy. A Vercel Preview atual compartilha variáveis com produção e precisa de isolamento antes de qualquer uso com escrita. Nenhuma dessas publicações foi executada.

## Arquivos e evidências

Arquivos modificados:

- `.env.example`, `.eslintrc.cjs`, `next.config.js`, `package.json`, `package-lock.json`.
- `public/sw.js`.
- `src/app/api/orders/route.ts`, `src/app/page.tsx`, `src/app/storefront-enhancements.css`.
- `src/components/Checkout.tsx`, `ClientProviders.tsx`, `FloatingWhatsAppOrder.tsx`, `WhatsAppButton.tsx`.
- `src/lib/supabaseAdmin.ts`.

Arquivos novos:

- `src/components/OrderConfirmation.tsx`.
- `src/lib/whatsapp.ts`, `whatsapp.test.ts`, `orderIdempotency.ts`, `orderIdempotency.test.ts`, `environment.ts`.
- `scripts/service-worker.test.cjs`, `verify-checkout-browser.cjs`, `verify-whatsapp-link.cjs`, `verify-pwa-browser.cjs`, `verify-homologacao-real.cjs`.
- `supabase/homologacao/bootstrap.sql`, `seed.sql`, `integration.sql`, `.env.example`.
- `docs/estabilizacao-operacional.md` (este relatório único).
- `artifacts/browser-results.json`, `manual-whatsapp-link.json`, `pwa-browser-results.json`, `homologacao-real-results.json`, `retomada-verification.json`, `validation.log`, `homologacao-validation.log`, `retomada-validation.log`.
- Capturas `artifacts/cart-1440.png`, `cart-390.png`, `checkout-1440.png`, `checkout-390.png`, `confirmation-1440.png`, `confirmation-390.png`.

Os scripts de navegador usam Playwright e Chromium já disponibilizados no Cloud; não adicionam dependências à aplicação. Reexecutá-los exige essas ferramentas e servidor local em `http://localhost:3000`. A confirmação isolada aborta toda requisição externa. `integration.sql` é exclusivo do ref de homologação e termina com rollback; o bootstrap é para projeto novo/vazio e não deve ser reaplicado no projeto já preparado. `.env.local` é ignorado, não faz parte do diff e não deve ser adicionado ao Git.
