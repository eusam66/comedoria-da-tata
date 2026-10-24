# Comedoria da Tata — Etapa C: evolução comercial

24/10/2026 — implementação integrada C1/C2 e controles C3, exclusivamente local e em homologação. Este é o relatório consolidado desta etapa. **Nenhum commit, push, merge, deploy ou escrita em produção está autorizado ou foi realizado nesta execução.**

> A seção **ESTABILIZAÇÃO FINAL E SEGURANÇA**, ao final, atualiza os resultados iniciais de dependências, ponte, rollback e pendências. As versões/ressalvas descritas na primeira homologação abaixo são o registro histórico anterior à estabilização.

> A seção **PUBLICAÇÃO CONTROLADA EM PRODUÇÃO** registra a autorização posterior e a tentativa atual de release. As restrições de autorização das seções anteriores descrevem suas respectivas execuções históricas.

## A. Pre-flight e escopo

- Repositório/origin: `eusam66/comedoria-da-tata`, `https://github.com/eusam66/comedoria-da-tata.git`.
- Checkout: `/workspace/comedoria-da-tata`.
- Branch criada: `feat/etapa-c-evolucao-comercial`.
- HEAD inicial/final, main local e origin/main na inspeção: `86d3a7beeb026ead43481ec9dc52734a93105a13`. Fetch inicial e final confirmaram o mesmo origin/main; nenhuma alteração remota incorporada.
- Working tree inicial: somente `docs/admin-ux-promocoes-pratos.md` modificado pela conclusão documental da release anterior. **Arquivo preservado, excluído dos patches da Etapa C.** Nenhum reset, descarte, staging ou commit.
- Código publicado já continha Admin UX 2.0, promoções manuais, RPC original/V2, reconfirmação, idempotência, estoque, zonas, horários/controle manual, WhatsApp e PWA. Essas funcionalidades foram reutilizadas.
- Produção: `kjxivrltvdiswpaxjowa`, conexão **COMEDORIA DA TATA**, somente consultas de leitura. Nenhum recurso do LuziCred acessado.

## B. Auditoria única e planejamento técnico

| Existente | Lacuna / decisão implementada |
| --- | --- |
| Home premium, filtros, ofertas, banners e bebidas | Reutilizar layout; acrescentar Mais pedidos e seções comerciais condicionais, sem duplicar categorias ou carrinho |
| Detalhe `/dishes/[slug]`, nome/descrição/ingredientes/porções/adicionais | Reutilizar rota e campos; acrescentar acompanhamentos/observações opcionais |
| `image_url`, Storage dishes e helper de compressão | Galeria JSONB de até cinco fotos, capa compatível e compressão/orientação robustas |
| Componente DishGallery existente, mas sem integração no detalhe | Integrar e melhorar controles, miniaturas, gesto, feedback e fallback |
| CartContext, sacola da home e CartDrawer global | Um componente de recomendações, mesmas identidades/preços/adicionais/estoque |
| Compartilhamento e metadata básicos | Compartilhamento nativo com fallback e metadata específica renderizada no servidor |
| Settings chave/JSONB e autenticação administrativa | Uma chave `commercial`, sem CMS, tabela ou menu paralelo |
| Sitemap e robots simples | Sitemap dinâmico com pratos reais; robots por ambiente e noindex HTTP nas áreas privadas |
| Nenhum depoimento/FAQ administrável ou QR integrado | Controles na tela de Configurações; consentimento/publicação manual; QR local protegido |

Arquivos principais: `src/components/HomeClient.tsx`, `DishGallery.tsx`, `AdminDishGallery.tsx`, `DishDetailClient.tsx`, `CartRecommendations.tsx`, `CommercialSettingsEditor.tsx`, `CommerceSections.tsx`, `ShareDish.tsx`; páginas existentes Home/Pratos/Configurações/Detalhe; helpers `dishMedia`, `commercial`, `commercialServer`, `recommendations`, `seo`, `sharing`, `imageUpload`; APIs existentes de pratos/menu/upload; novas APIs `/api/commercial`, `/api/recommendations`, `/api/admin/commercial` e `/api/admin/menu-qr`; robots/sitemap/metadata/configuração, migration e scripts de teste/preparo. Relação completa e SHA-256 estão no manifest local. Nenhum arquivo de credenciais faz parte do diff.

Plano executado: ampliar dados sem alterar contratos financeiros; integrar vitrine/detalhes/sacola e administração; preparar proteção de Storage para transição/rollback; aplicar a única migration em homologação; executar SQL, APIs reais, navegador e checks consolidados. Não foi repetida a auditoria financeira da release anterior: foram preservadas suas fontes e exercitados os pontos de integração novos.

## C. Galeria e Storage

- `dishes.gallery`: array de `{url, alt}`, máximo cinco URLs distintas; zero/uma foto continuam válidos. Registros antigos conservam `image_url`, sem backfill ou reescrita massiva.
- Primeira fotografia é principal e sincroniza `image_url`. Trigger preserva secundárias quando uma API antiga altera somente a capa; trocar por uma foto já existente não a duplica.
- Administração: selecionar arquivos, prévia, texto alternativo, mover para cima/baixo, tornar principal, substituir/remover e salvar. Upload somente ao salvar; cancelar uma seleção ainda não enviada não cria objeto.
- Compressão de uma cópia antes do upload: ambos os eixos até 1600 px, EXIF respeitado, metadata removida, JPEG; arquivo original do usuário não é alterado. Fonte até 20 MB; endpoint até 10 MB. Tipos JPEG/PNG/WebP/GIF com conferência de assinatura; SVG/arquivo disfarçado rejeitado.
- Uploads de galeria usam chave aleatória estável por arquivo/edição + SHA-256 do conteúdo. Reenvio após falha de rede utiliza o mesmo caminho, `upsert:false`, sem sobrescrever objetos. Mapa em memória reutiliza uploads já confirmados quando falha apenas o salvamento do prato.
- Storage existente, sem novos buckets, políticas públicas de escrita ou serviços. Cache longo em URLs imutáveis; substituições recebem caminho diferente.
- Remoção verifica referências em pratos, bebidas, categorias, banners **e fotos secundárias de todas as galerias**. A consulta JSONB é serializada explicitamente, compatível com o SDK instalado; passar array JavaScript ao operador contains produziria literal de array PostgreSQL inválido e impediria a limpeza. O caso foi corrigido e coberto por teste e Storage real. Erro de consulta preserva o arquivo. Limpeza após salvamento falha sem anunciar falsamente que o registro não foi salvo.
- Limpeza é conservadora e não é um coletor automático de lixo: queda definitiva do navegador/processo no intervalo entre upload e salvamento pode exigir revisão posterior de objetos órfãos, sempre conferindo referências. Não foi criado job ou infraestrutura para apagar arquivos automaticamente.
- Galeria pública: fotografia grande com `object-fit:contain`, miniaturas, botões de 44 px, indicador anunciado, gesto horizontal sem disputar rolagem vertical, lazy loading e fallback. Nenhuma fotografia de prato foi inventada.
- Auditoria de produção identificou buckets públicos existentes (dishes/branding com limite 10 MB), sem políticas de escrita em storage.objects. A aplicação usa autenticação administrativa e serviço no servidor. Não se alterou configuração de produção. A instabilidade histórica não foi reproduzida nos uploads/downloads reais desta homologação; não se atribui causa histórica sem evidência.

## D. Home comercial e cartões

- Hierarquia preserva identidade/status, hero/banners, ofertas, Mais pedidos, categorias e cardápio; depois entrega/retirada, pagamento, depoimentos aprovados, FAQ, informações institucionais e rodapé existentes.
- Mais pedidos utiliza o destaque manual `is_featured` já cadastrado; não inventa estatística de vendas. Novidades e promoções mantêm suas regras.
- Ofertas/Mais pedidos aparecem quando há conteúdo e no contexto geral, sem interferir na pertinência da busca ou categoria. Pratos permanecem nas categorias originais, com os mesmos UUIDs.
- Cartões apresentam foto real/fallback da identidade, descrição curta, porções quando cadastradas, preço efetivo, selos existentes e disponibilidade. Não se aumenta desnecessariamente a altura dos cartões móveis.
- Removidos fallbacks de catálogo com pratos/preços fictícios em erros de conexão: ausência de dados não deve parecer um catálogo real.
- Home agora recebe catálogo e conteúdo comercial no servidor. Não faz um segundo carregamento inicial desnecessário do cardápio; atualização ao recuperar foco permanece.

## E. Recomendações e adição rápida

- Até seis relações explícitas por prato, com UUID/tipo validados e existência conferida; administração na própria edição de Pratos. Relações com produtos posteriormente removidos podem ser limpas pela interface.
- Até três sugestões discretas: relações configuradas primeiro; depois bebidas disponíveis quando a sacola contém prato. Sem IA, algoritmo pago ou popularidade fictícia.
- Filtra produtos inexistentes, indisponíveis, sem estoque e já na sacola. Não altera quantidades selecionadas nem adiciona automaticamente.
- `+ ADICIONAR` usa CartContext sem sair da sacola, atualiza subtotal e informa sucesso local. Item com escolha obrigatória abre o detalhe/seletor e não é adicionado silenciosamente.
- Sacola da home reutiliza catálogo em memória; CartDrawer busca sugestões apenas quando montado/aberto e necessário. Respostas comerciais não contêm dados privados.
- Não há pedido ou baixa de estoque ao recomendar/adicionar/remover da sacola. Na finalização, os mesmos endpoints/RPCs financeiros autoritativos continuam em uso.

## F. Informações dos pratos

- Reutilizados descrição, `serves`, `ingredients`, extras/adicionais e preço regular/promocional.
- Acrescentados `accompaniments` e `dish_notes`, opcionais, até 2.000 caracteres cada.
- Detalhe organiza O que acompanha?, Ingredientes, Observações do prato, porções e adicionais. Blocos sem conteúdo não aparecem; textos extensos usam details/summary acessíveis.
- Campos novos seguem editor, foco no título, cancelamento, retorno ao cartão e feedback após confirmação do backend. Edição sem alterar fotos não modifica a galeria/capa legada.

## G. Compartilhamento

- Link estável oficial: `https://comedoria-da-tata.vercel.app/dishes/{slug}`. Editar nome não regenera automaticamente o slug existente.
- Web Share API quando disponível; cancelamento não anuncia erro. Fallback oferece Copiar link, URL selecionável e WhatsApp manual para escolher destinatário.
- Homologação bloqueia link externo de WhatsApp. Em produção o link de compartilhamento é habilitado, separado do WhatsApp do pedido.
- Descrição ausente/null é suportada. Compartilhar não adiciona produto, não cria pedido, não movimenta estoque e não exige login.
- Share API foi exercitada por captura controlada do payload; clipboard foi exercitado no navegador. Nenhum compartilhamento ou envio externo real ocorreu.

## H. SEO local

- Title/description locais naturais, metadataBase oficial, canonical por prato, Open Graph/Twitter com descrição específica e foto principal real; fallback para logo da marca.
- Metadata é gerada no servidor; leitura do HTML com User-Agent de crawler confirmou title, OG, imagem, canonical e MenuItem/preço, sem depender de JavaScript.
- `Restaurant` com nome, telefone, endereço quando configurado, Chã Grande/PE, cardápio e horários padrão existentes; `MenuItem/Offer` com preço efetivo e disponibilidade. Sem avaliações, notas, prêmios ou certificados inventados.
- JSON-LD escapa caracteres que poderiam fechar script. Demais textos são renderizados como texto pelo React, sem HTML arbitrário.
- Sitemap dinâmico inclui somente URLs reais, inclusive pratos temporariamente esgotados. Escapa XML e codifica slug.
- Robots bloqueia áreas administrativas/APIs/confirmações; headers `X-Robots-Tag` complementam a proteção. Homologação inteira usa noindex/disallow. Canonicals continuam oficiais, sem URLs localhost ou credenciais.

## I. Entrega e pagamento

- Fontes: `restaurant_settings.storefront`, horário existente e `delivery_zones` ativas, com cada taxa real. O antigo deliveryFee fixo não é usado para anunciar uma taxa única.
- Entrega/retirada aparecem conforme configuração; endereço/estimativa somente quando cadastrados. Estimativa não é promessa de prazo exato.
- Textos de entrega, retirada e pagamento são opcionais e editáveis em Configurações.
- Pagamentos informados correspondem às opções já existentes no checkout: Pix, dinheiro e cartão. Não foi criado gateway, cobrança ou taxa nova.

## J. Depoimentos

- Estrutura mínima em `restaurant_settings.commercial.testimonials`; nenhum formulário público de envio.
- Cadastro/edição, ordem, publicar/ocultar, excluir com confirmação e retorno ao registro na tela de Configurações.
- Nome parcial possível; texto limitado. Exige declaração de autorização e publicação manual; data registrada pelo servidor. Mudança no nome/texto pela interface revoga a seleção de autorização/publicação até nova confirmação.
- Conteúdo sem consentimento ou oculto não sai na projeção pública. Observação privada e data da autorização não são serializadas à home/API pública/metadata.
- Seção pública oculta sem depoimentos reais publicados; sem estrelas ou identificação como Google Reviews. Fixtures existiram somente na homologação e foram removidas/restauradas ao final.

## K. FAQ

- Perguntas/respostas curtas editáveis, ordenar, publicar/ocultar e excluir com confirmação; até vinte entradas.
- Accordion nativo details/summary com teclado e foco visível.
- Sem FAQ publicada, opção administrativa permite ajuda factual sobre o fluxo já implementado: montar sacola, confirmar no site, envio manual no WhatsApp e consulta das taxas/status. Não inventa bairro, prazo ou política comercial.
- Opção para ocultar essa ajuda; perguntas não publicadas permanecem privadas.

## L. QR Code

- Acesso em Configurações: prévia e download PNG (1024 px) e SVG autenticados.
- Destino exclusivo: `https://comedoria-da-tata.vercel.app/`; sem encurtador, rastreamento ou API externa.
- Biblioteca gratuita `qrcode@1.5.4` somente no servidor; margem de quatro módulos, correção M e contraste chocolate/branco.
- PNG retornado pelo endpoint real foi decodificado para o destino correto; teste automatizado também lê a versão de 256 px. SVG disponível para impressão vetorial. Leitura física de material impresso fica para o proprietário.

## M. Banco, migration e compatibilidade

- Única migration nova: `supabase/migrations/20261024153801_etapa_c_commercial.sql`.
- Aplicada **somente** em `nkywpsftihxcuvdxeexn` — `comedoria-da-tata-homologacao`, organização `kngtolcorjmbbhrktdpq`/eusam66, conexão COMEDORIA DA TATA. Projeto estava pausado e foi restaurado; confirmado ACTIVE_HEALTHY e marcador de ambiente antes das escritas.
- Versão registrada pelo aplicador Supabase e nome local alinhados ao histórico. Não se editaram migrations anteriores já aplicadas.
- Quatro colunas aditivas; defaults vazios, checks de estrutura/tamanho/duplicação/relações e trigger de capa. Sem tabela extra, renomeação, remoção, atualização de preços, estoque, pedidos ou backfill.
- Conteúdo comercial em chave separada da tabela existente; nenhuma configuração real foi inserida pela migration.
- RLS e autenticação preservadas. Helpers SQL com search_path vazio, sem SECURITY DEFINER; execução pública revogada. Dados administrativos acessados somente com serviço no servidor. Na produção restaurant_settings tem RLS ligado sem política pública; na homologação a leitura direta anônima foi rejeitada.
- RPCs **não foram alteradas**. MD5 de definição confirmado em homologação e leitura de produção:
  - `create_order_with_stock`: `0caff7bde38776d78f9219f6857af545`.
  - `create_order_with_stock_v2`: `f029899ac5c332f7a65c217d35af0c21`.
- SQL de integração `scripts/etapa-c-schema.test.sql`: guard de projeto, transação com rollback, defaults/legado, mudança de capa antiga preservando fotos, capa repetida, remoção, limites/URLs/duplicações/relações e invariantes financeiros. Aprovado sem persistir fixtures SQL.
- Ponte de Storage preparada a partir da main real, alterando exclusivamente `storageAdmin.ts`. Build próprio e contrato HTTP administrativo antigo executados no banco novo: CRUD, preços/estoque/defaults, capa antiga, foto secundária compartilhada e API pública aprovados.
- Ponte falha fechada se a coluna ainda não existir. Necessária para impedir que APIs antigas apaguem fotos secundárias depois de habilitar galerias. Nenhuma publicação da ponte ocorreu.
- Consulta final somente leitura em produção confirmou **zero colunas C e zero migration C aplicada**.

## N. Segurança, performance e acessibilidade

- APIs novas administrativas usam requireAdmin no servidor; anônimo rejeitado. API pública de conteúdo possui projeção explícita e somente GET. Proteção contra gravação concorrente de conteúdo por revisão/CAS (409), preservando rascunho quando houver conflito.
- Sem secrets em código cliente, metadata, artefatos de publicação ou relatório. Credenciais de teste foram obtidas por variáveis privadas e nunca registradas aqui.
- Upload com autorização, limites, assinatura e bucket permitido; limpeza limitada ao Storage do projeto configurado e referências verificadas. URLs compartilhadas não são apagadas.
- Sem dependência pesada de carrossel, IA, CMS ou marketing. QR não entra no bundle da home. Dependências existentes não tiveram versões alteradas.
- Build: home ~125 kB de First Load JS, contra ~117 kB na ponte; aumento aproximado de 8 kB. Rota de detalhe ~116 kB. Galeria carrega uma imagem principal e miniaturas lazy; catálogo da home não serializa todas as fotos.
- Cores/identidade, tipografia existente, safe-area e navegação homologada preservadas. Controles acessíveis, labels, foco visível, status/erros, botões com área de toque e movimento reduzido.
- Advisors da homologação: nenhum finding novo atribuído à migration C. Persistem avisos anteriores de proteção contra senhas vazadas desativada e índices duplicados, mais informações de índices sem uso e seis tabelas com RLS sem políticas (acesso restrito pelo servidor). Não se removeram índices nem alterou plano/segurança Auth fora do escopo. Referências: [RLS](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [índices duplicados](https://supabase.com/docs/guides/database/database-linter?lint=0009_duplicate_index).

## O. Validações e evidências

| Verificação | Resultado final |
| --- | --- |
| TypeScript (`npx tsc --noEmit`, não há script typecheck) | PASS, sem erros |
| ESLint (`npm run lint`) | PASS: zero erros; seis avisos anteriores (cinco img, um create_buckets.js) |
| Horários (`npm run test:hours`) | 8/8 |
| Checkout/WhatsApp/idempotência/PWA (`npm run test:checkout`) | 13/13 |
| Promoções (`npm run test:promotions`) | 10/10 |
| RPC/transição (`npm run test:compatibility`) | 7/7 |
| Zonas/controle operacional (node --experimental-strip-types --test src/lib/deliveryZones.test.ts scripts/order-operations-route.test.cjs) | 13/13 |
| Etapa C (`npm run test:commercial`) | 14/14 novos |
| **Total automatizado** | **65/65: 51 anteriores preservados + 14 novos** |
| Build feature (`npm run build`) | PASS |
| Build ponte, em árvore isolada da main | PASS |
| `git diff --check` | PASS |
| SQL com rollback, homologação | PASS |
| HTTP real da API publicada + ponte no banco novo | PASS |
| Navegador 320×700, 390×844, 1440×1000 | PASS, sem overflow/erros runtime |
| Fluxo completo em navegador → API → RPC → snapshot, 390×844 | PASS, somente dados fictícios |
| Storage real: arquivos próprios/referências/limpeza | PASS |

Novos testes automatizados cobrem quantidades 0/1/2/5 e rejeição de sexta foto, URLs/duplicação/alt, relações inválidas/autorreferência, estoque/disponibilidade/exclusão/prioridade de recomendações, promoção e escolhas obrigatórias, consentimento/publicação/projeção privada, revogação/FAQ oculta, limites/XSS JSON-LD, compartilhamento/descrição null, metadata/schema real, localidade sem dados inventados, assinatura/tamanho de uploads, QR decodificado a 256 px e ponte Storage com schema antigo/referências.

Homologação real executada pelos scripts `verify-etapa-c-real.cjs`, `verify-etapa-c-bridge.cjs`, `verify-etapa-c-storage.cjs` e `verify-etapa-c-checkout.cjs`, com guardas de host, ambiente e marcador antes de escrever. O runtime do Browser plugin não estava disponível entre as ferramentas; foi usado Playwright com Chromium instalado no Cloud. Não equivale a Safari, Android físico ou PWA instalado.

- Galeria: legado/uma/duas/cinco fotos, sexta rejeitada, principal, ordem, remoção, substituição, EXIF orientation 6 efetivamente convertido para 1280×859 sem metadata, compressão, falha 503 preservando rascunho, retry sem upload duplicado, persistência/reload e fotos compartilhadas protegidas.
- Home/detalhes: ofertas/mais pedidos/categorias, blocos reais, galeria por botões/teclado/gesto, Share API capturada sem envio, copiar link, FAQ, publicação/ocultação/consentimento, editores com foco/cancelamento/retorno e campos numéricos que aceitam vazio nos três viewports.
- Sacola: bebida recomendada adicionada rapidamente, produto sem estoque excluído, produto com escolha obrigatória abre seletor sem adição automática; nenhuma baixa de estoque antes de finalizar. Ajustado o flex/scroll do CartDrawer para manter Finalizar pedido acessível com recomendações.
- Financeiro real: promoção + adicional + bebida + taxa, preços enviados manipulados ignorados, idempotência concorrente, somente uma baixa, snapshot preservado depois de desativar promoção, 409 de PRICE_CHANGED sem gravar pedido, nova confirmação consciente, retirada sem taxa e cancelamento repetido sem dupla reposição. Fontes/RPCs/migrations financeiras anteriores também preservadas por SHA-256/MD5.
- No fluxo real de navegador: R$ 65,90 com entrega / R$ 57,40 com retirada; promoção desativada durante checkout causa 409 e resumo R$ 75,90; segunda confirmação registra somente um pedido fictício. Snapshot/mensagem incluem adicional, bebida e taxa; Copiar mensagem funciona, Abrir WhatsApp permanece bloqueado na homologação. Nenhum envio externo.
- Conteúdo, funcionamento e catálogo anteriores da homologação restaurados. Consulta final confirmou 3 pratos e 1 bebida originais, zero fixtures C restantes, zero pedidos próprios ativos, zero objetos criados nesta execução remanescentes, chave commercial ausente como antes e funcionamento automatic/sem expiração restaurado. Fixtures C de pratos/bebidas/categorias removidas; pedidos fictícios preservados cancelados. Conferência de Storage removeu/verificou 22 objetos próprios acumulados na depuração, e a execução final limpa também todos os novos arquivos. Não se apagou objeto de produção nem arquivo preexistente por critério de data.

Evidências locais: `artifacts/etapa-c-real-results.json`, `etapa-c-bridge-results.json`, `etapa-c-storage-results.json`, `etapa-c-checkout-results.json`, screenshots `etapa-c-{dish,home,admin}-{320,390,1440}.png`, `etapa-c-checkout-390.png`, logs dos checks e auditoria de dependências. São artefatos ignorados, sem credenciais; não entram automaticamente em commit.

**Ressalva de segurança preexistente:** `npm audit --omit=dev` sinalizou cinco pacotes: Next 15.5.22 (critical), Sharp 0.34.5, PostCSS 8.5.25, nanoid 3.3.16 e source-map-js 1.2.1 (high). Todos já tinham exatamente essas versões no lockfile da main 86d3a7b; nenhum pacote existente teve a versão alterada e nenhum alerta foi atribuído ao QR/dependências novas. A auditoria não prova exploração da aplicação; a aplicabilidade e correção precisam ser tratadas antes da futura publicação. Não foi feita atualização ampla do framework/imagens fora desta etapa. Referências: [Next/Image AVIF](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4), [Next/Image SVG](https://github.com/advisories/GHSA-2464-fhr4-w9xw), [Sharp](https://github.com/advisories/GHSA-f88m-g3jw-g9cj), [PostCSS](https://github.com/advisories/GHSA-r28c-9q8g-f849), [nanoid](https://github.com/advisories/GHSA-2v37-7h3g-55p8), [source-map-js](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).

## P. Publicação futura — requer nova autorização

1. Resolver/avaliar a ressalva de segurança das dependências existentes antes de publicar. Fetch/revisar origin/main e diff, confirmar branch/artefatos sem mudanças inesperadas, schema/RLS/Storage e histórico de produção. Revalidar hashes e compatibilidade se o código remoto avançar.
2. Publicar **ponte de Storage**, aguardando READY e domínio correto. No schema antigo ela preserva arquivos se a consulta à galeria não existir. Pedidos continuam com as RPCs atuais. Aguardar encerramento de requisições administrativas antigas antes de habilitar edição de galerias; não é necessário fechar a loja.
3. Aplicar exclusivamente `20261024153801_etapa_c_commercial.sql` em transação e registro coerente no histórico. A migration é aditiva e compatível com o contrato publicado; verificar colunas/defaults/checks/trigger, permissões e cache PostgREST. Não reaplicar baselines ou migrations antigas de homologação.
4. Publicar feature C sobre a ponte, aguardar READY e verificar catálogo, status, autenticação, metadados, QR e APIs sem pedidos/estoque reais. Não popular depoimentos, FAQ, relações ou ofertas fictícias.
5. Proprietário cadastra somente conteúdo comercial/fotos/depoimentos reais e autorizados; valida dispositivos e fluxo final.

Artefatos preparados por `scripts/prepare-etapa-c-release.cjs`: `artifacts/etapa-c-storage-bridge.patch`, `etapa-c-feature.patch`, `etapa-c-evolucao-comercial.patch`, `etapa-c-expand.sql`, `etapa-c-rollback-to-storage-bridge.patch` e manifest de SHA-256. Patches de ida/volta verificados com git apply --check somente em árvore temporária. SQL transacional contém a migration exata e registro da versão na mesma transação, com guardas e limites de lock/execução; não foi aplicado em produção. Para reproduzir a ponte local, usar --prepare-bridge, executar o build no diretório informado no manifest e depois verify-etapa-c-bridge.cjs. O patch de rollback conserva o arquivo da migration. Nenhum artefato contém .env ou alteração do relatório preexistente.

Rollback de código: retornar para **main 86d3a7b + ponte Storage homologada**, conservando migration e dados C, preço/promoção/RPCs atuais. Não apagar colunas/fotos/pedidos nem recalcular histórico. Durante rollback interromper edições comerciais/galerias, inclusive em PWA com tela nova em cache; a versão antiga não administra os novos campos. Preferir correção para frente nesses controles. Pedidos continuam pelo contrato financeiro já homologado. Reavaliar estado/código remoto antes de executar qualquer reversão. Não foi feito rollback ou deploy nesta tarefa.

## Q. Pendências separadas

1. **Técnicas:** todas as funcionalidades C implementadas e testes funcionais concluídos. Persistem os cinco alertas npm herdados da main, incluindo Next crítico, cuja aplicabilidade/correção deve ser revisada antes de publicar; também permanecem os advisors anteriores. Limpeza conservadora pode reter objetos após encerramento abrupto do navegador: revisão manual segura se necessário, sem exclusão automática por data.
2. **Informações do proprietário:** cadastrar fotos secundárias reais, acompanhamentos/ingredientes/observações faltantes, relações desejadas, texto institucional/orientações comerciais, FAQ específica e depoimentos com autorização real. Não foram inventados dados para preencher produção; seções opcionais ficam ocultas quando vazias.
3. **Dispositivos reais:** iPhone/Safari, Android/Chrome, teclado virtual físico, Web Share/WhatsApp nativos, leitor de tela, PWA instalado e leitura de QR impresso. Emulação Chromium não equivale a esses testes.
4. **Autorização posterior:** revisar diff/migration/ponte, autorizar commits/push/merge, migration em produção e deployments controlados. Nada disso foi executado.

**ETAPA C IMPLEMENTADA COM RESSALVAS**

Funcionalidades integradas e homologação funcional concluídas. Ressalvas: alertas de segurança herdados nas dependências e validação manual em dispositivos reais ainda pendentes. Produção permanece sem mudanças desta etapa; nenhum commit, push, merge ou deploy executado.

## ESTABILIZAÇÃO FINAL E SEGURANÇA

24/10/2026 — continuação local da Etapa C, sem reconstruir funcionalidades. **Sete pacotes vulneráveis corrigidos; auditoria completa e runtime com zero alertas; 65 testes e regressões aprovados.** Nenhum commit, push, merge, deploy ou SQL de produção executado.

### A. Git e ambiente

Branch `feat/etapa-c-evolucao-comercial`, HEAD e origin/main `86d3a7beeb026ead43481ec9dc52734a93105a13`, confirmados por fetch. npm 11.9.0 / Node 24.19.0, App Router Next 15, React/React DOM 19.2.8. Working tree completo da Etapa C e relatório anterior preservados. Snapshot SHA-256 inicial de 56 arquivos em `artifacts/etapa-c-security-worktree-baseline.json`. Nenhum arquivo de `src/`, nenhuma migration, RPC, chave ou configuração de produção foi alterada nesta estabilização.

### B. Alertas identificados e uso efetivo

A auditoria inicial completa encontrou **7 pacotes vulneráveis: 1 critical e 6 high**, agregando 20 advisories. Os **5 pacotes do resumo anterior** eram os encontrados com `--omit=dev`; a auditoria incluindo ferramentas acrescentou js-yaml e brace-expansion. Detalhamento corrige uma ambiguidade anterior: a instância vulnerável de PostCSS era **8.4.31 dentro de Next**; o PostCSS 8.5.25 raiz, usado no build, já estava fora dos ranges vulneráveis e foi preservado.

| Pacote / instância | Antes → depois | Origem e ambiente | Aplicabilidade e compatibilidade |
| --- | --- | --- | --- |
| Next | 15.5.22 → **15.5.28** | Direta, produção | Otimizador de imagens é superfície pública relevante; cache/Windows/Actions dependem das condições abaixo. Patch na mesma linha 15.5, sem migração para Next 16 |
| Sharp | 0.34.5 → **0.35.5** | Opcional transitiva de Next, produção | Decodifica imagens não confiáveis; vulnerabilidades nativas relevantes. Binários reconstruídos/instalados com Node compatível e testados |
| PostCSS dentro de Next | 8.4.31 → **8.5.23** | Transitiva de Next, presente na instalação de produção; processamento principalmente no build | Não há endpoint de compilação de CSS público nem CSS fornecido por FAQ/depoimentos. Atualização minor na major 8; build/Tailwind/layout verificados |
| nanoid | 3.3.16 → **3.3.18** | Transitiva de PostCSS, produção/build | DoS exige tamanho zero controlado pelo atacante em customAlphabet/customRandom. Aplicação não chama essas funções com entrada pública; patch aplicado mesmo assim |
| source-map-js | 1.2.1 → **1.2.2** | Transitiva de PostCSS/Tailwind, build e árvore de produção | DoS exige source map indexado com offsets maliciosos. Não há importação pública de source maps; patch aplicado |
| js-yaml | 4.3.0 → **4.3.2** | Transitiva de ESLint/@eslint/eslintrc, desenvolvimento | DoS ao analisar YAML não confiável; configuração local, sem parser YAML nas APIs públicas. Patch na mesma major 4 |
| brace-expansion | 1.1.18 → **1.1.21** | Transitiva de minimatch/ESLint, desenvolvimento | DoS por glob malicioso/recursão. Não recebe padrões enviados por clientes. A outra instância, 5.0.12, já segura, foi mantida |

Advisories oficiais consultados pela API pública GitHub Advisory Database, todos com resposta 200; referências dos mantenedores Next/Sharp conferidas. Descrições foram analisadas, não apenas o total do npm audit.

| Pacote / advisory | CVE quando informado pela fonte | Primeira versão corrigida na linha usada | Condição principal |
| --- | --- | --- | --- |
| Next [GHSA-p293-qw3h-jr36](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36) | CVE-2026-75604 | 15.5.24 | RCE em filesystem Windows. Cloud Linux e destino Vercel não satisfazem essa condição; corrigido sem depender disso |
| Next [GHSA-2xp9-vwfh-vxw4](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4) | Não atribuído no campo CVE da API | 15.5.24 | AVIF/libheif através da otimização de imagens; superfície potencialmente aplicável |
| Next [GHSA-4jqv-mc3x-m676](https://github.com/vercel/next.js/security/advisories/GHSA-4jqv-mc3x-m676) | CVE-2026-94543 | 15.5.27 | Cache poisoning de Pages Router SSG/ISR self-hosted; mantenedor exclui Vercel. Aplicação usa App Router e catálogo dinâmico |
| Next [GHSA-mcj8-r9mp-w47p](https://github.com/vercel/next.js/security/advisories/GHSA-mcj8-r9mp-w47p) | CVE-2026-94484 | 15.5.27 | Exige catch-all raiz junto com rotas estáticas/ISR; essa arquitetura não existe no projeto |
| Next [GHSA-2464-fhr4-w9xw](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw) | CVE-2026-96889 na referência do mantenedor | **15.5.28** | Possível RCE em processamento SVG/Sharp sobre Linux glibc; não foi descartado somente porque upload rejeita SVG |
| Next [GHSA-p3m5-59mp-jv5r](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r) | CVE-2026-94482 | **15.5.28** | DoS requer pelo menos uma Server Action. Não foram encontradas Server Actions (`use server`); aplicação usa Route Handlers. Corrigido |
| Sharp [GHSA-f88m-g3jw-g9cj](https://github.com/lovell/sharp/security/advisories/GHSA-f88m-g3jw-g9cj) | CVE-2026-33327, 33328, 35590, 35591 | 0.35.0 | Imagens não confiáveis processadas por libvips |
| Sharp [GHSA-rgj7-g3m4-5g8c](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c) | CVE-2026-84383 entre as referências libheif | 0.35.4 | AVIF/libheif, inclusive possível RCE em certas condições Linux |
| Sharp [GHSA-wq5f-xc86-pv6w](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w) | CVE-2026-96889 | **0.35.5** | librsvg em condições de runtime específicas sobre Linux glibc |
| PostCSS [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) | CVE-2026-41305 | 8.5.10 | XSS quando CSS do atacante é reserializado em style HTML |
| PostCSS [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q) | CVE-2026-45623 | 8.5.12 | sourceMappingURL não confiável lendo arquivo local |
| PostCSS [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) | CVE-2026-73646 | 8.5.18 | Travessia de caminho na leitura de .map |
| PostCSS [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) | CVE-2026-69153 | **8.5.23** | Correção complementar quando process() não recebe from |
| nanoid [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8) | CVE-2026-67213 | **3.3.18** | Tamanho zero em geradores personalizados |
| source-map-js [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) | CVE-2026-93749 | **1.2.2** | Offset de seção indexada causando bloqueio síncrono |
| js-yaml [GHSA-5p4m-2wfm-xmqj](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj) | Fonte remete ao CVE-2026-59870 original | 4.3.1 | Custo quadrático no tipo omap |
| js-yaml [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh) | CVE-2026-84375 | **4.3.2** | Limite de merges não contabiliza mapas vazios |
| brace-expansion [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) | CVE-2026-102276 | 1.1.19 | Recursão ao analisar grupos |
| brace-expansion [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7) | CVE-2026-102278 | 1.1.20 | Grupos profundamente aninhados |
| brace-expansion [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) | CVE-2026-102277 | **1.1.21** | Reescrita quadrática de padrão de expansão |

### C. Diagnóstico crítico do Next.js

15.5.24 corrige Windows/AVIF, mas não todos os achados posteriores; 15.5.27 ainda aparece afetado por SVG e Server Actions. **15.5.28 é a menor versão que cobre a união dos ranges identificados na linha 15.5.** A resolução também foi conferida para Sharp 0.35.5: atualizar apenas a string Next sem conferir o lock não bastaria, pois a dependência opcional aceita também Sharp antigo. Sem upgrade major, sem desabilitar validação financeira e sem considerar controles de upload uma mitigação suficiente para código nativo vulnerável.

### D–E. Mudanças aplicadas

`package.json` e lockfile sincronizados, instalação limpa por npm ci aprovada. Next e eslint-config-next fixados em 15.5.28. Overrides limitados às dependências afetadas: Next → Sharp 0.35.5 e PostCSS 8.5.23; nanoid@3 → 3.3.18, source-map-js@1 → 1.2.2, js-yaml@4 → 4.3.2 e brace-expansion@1 → 1.1.21. Esses overrides podem ser removidos futuramente quando os pacotes pais garantirem versões corrigidas, após nova auditoria. Não se usou audit fix --force nem update geral.

eslint-config-next/@next/eslint-plugin-next/@next/env/SWC acompanham o patch do framework; binários Sharp/libvips acompanham o patch nativo. React/React DOM 19.2.8, TypeScript, Supabase, Tailwind, QR e demais pacotes não relacionados foram preservados. Runtime nativo observado: Sharp 0.35.5, libvips 8.18.7, libheif 1.23.5, librsvg 2.63.2. Engines declara Node >=20.9.0, mínimo do Sharp novo; execução e builds homologados em Node 24.19.0.

Scripts de preparo e verificação da ponte ajustados para incluir **também package.json, lockfile, ícones válidos e a atualização de cache do PWA**. O código funcional da ponte continua sendo a main conhecida + proteção de referências no Storage; bibliotecas C presentes no manifesto não habilitam funcionalidades, rotas nem acesso às colunas novas. O rollback mantém as dependências seguras e os ícones válidos. A inspeção binária encontrou nos ícones antigos arquivos ASCII de 61 bytes contendo placeholder, já presentes na main. Foram substituídos localmente por PNGs reais 192×192 e 512×512 derivados do logotipo oficial cadastrado, sem inventar identidade visual. Cache do Service Worker passou de tata-public-v2 para tata-public-v3, sem mudar a política de nunca armazenar APIs/checkout; testes verificam a remoção do cache v2 e a decodificação das duas imagens. Esse defeito preexistente foi corrigido, não atribuído ao upgrade. Pequenos ajustes somente nos harnesses: modo navigation-only para evitar repetir checkout ao revisar o painel e encerramento garantido de recursos do teste de checkout mesmo quando uma asserção falhar.

### F. Compatibilidade

App Router, Server Components, Route Handlers, middleware existente, React 19, metadata/SEO e PWA mantidos. Nenhum uso de funcionalidade nova do Next 16; nenhum ajuste em src/ necessário. A correção dos dois assets PWA e a troca da chave de cache foram os únicos ajustes de recursos de produto. Compilação com Webpack e instalação reprodutível verificadas. Fonte de preços, API de pedidos, idempotência e migrations preservadas por hash.

A consulta somente leitura à Vercel com projeto/team documentados retornou 403 para o escopo eusam67; **não houve tentativa de contornar a autorização nem alteração de configuração**. O runtime atualmente selecionado no projeto Vercel não pôde ser reconfirmado nesta conexão. Antes do futuro deploy, confirmar Node suportado >=20.9 (preferencialmente a linha 24 testada). Não se declara build/deploy Vercel executado nesta etapa; o build local de produção está aprovado.

### G–H. Alertas corrigidos e remanescentes

Auditoria completa e `--omit=dev`: **zero critical, high, moderate, low ou info conhecidos pelo npm na verificação final**. Eliminados os cinco pacotes de produção e os dois de ferramentas. Nenhum risco crítico foi aceito como exceção.

Persistem avisos de manutenção/depreciação do toolchain anterior: inflight, config-array/object-schema antigos, rimraf 3, glob 7 e ESLint 8. Não são achados remanescentes da auditoria npm atual. Migrar todo o toolchain para ESLint 9 seria atualização major fora da correção necessária; manter como manutenção planejada. Advisors Supabase anteriores (senhas vazadas/índices/RLS restrito) não foram alterados nesta tarefa de dependências. A ausência de advisories é relativa à base consultada nesta data, não uma alegação de ausência universal de falhas.

### I–L. Validação consolidada

- TypeScript: PASS (`npx tsc --noEmit`), sem erros.
- ESLint: PASS (`npm run lint`), **zero erros, seis warnings preexistentes**: cinco img (três HomeClient, dois Bebidas) e variável não usada em create_buckets.js. Nenhum warning novo.
- **65/65 testes automatizados**: horários 8, checkout/WhatsApp/PWA/idempotência 13, promoções 10, compatibilidade 7, taxas/controle operacional 13, Etapa C 14. Sem inflar o total com os cenários de integração. Não foram criados testes que apenas repetem as versões instaladas.
- Build feature e ponte: PASS com Next 15.5.28; git diff --check: PASS.
- npm ci: PASS; package.json/lock/instalação consistentes. Auditorias completa e runtime: 0.
- Evidências: `artifacts/etapa-c-security-initial-audit.json`, `etapa-c-security-official-advisories.json`, `etapa-c-security-updated-tree.log`, `etapa-c-security-final-audit.json`, `etapa-c-security-final-runtime-audit.json`; logs de TypeScript/ESLint/testes/builds/CI e manifest com hashes. Nenhum segredo ou .env incluído.

### M–N. Regressões e homologação

Todos os grupos abaixo aprovados, somente em ambiente local e Supabase **nkywpsftihxcuvdxeexn**, Comedoria da Tata, com dados fictícios e guardas antes de escrever. Harnesses com escrita executados isoladamente para evitar interferência entre snapshots. Nenhuma produção foi usada para checkout. Browser plugin sem runtime disponível; Playwright/Chromium do Cloud utilizado. Viewports não equivalem a testes físicos.

| Grupo | Evidência e resultado |
| --- | --- |
| Etapa C integrada | `etapa-c-real-results.json`: PASS. Galeria 0/1/2/5, sexta rejeitada, principal/ordem/substituir/remover, EXIF/compressão, retry/reload, Storage compartilhado/limpeza; recomendações/adição rápida/adicionais, ofertas, home, FAQ/depoimentos/consentimento/administração; links/copiar/Share capturado, HTML crawler/OG/canonical/sitemap/QR e dados comerciais reais |
| Mobile e desktop | 320×700, 390×844 e 1440×1000: sem overflow/erros runtime; screenshots de detalhe/home/admin e inspeção visual. Sem redesign |
| Painel anterior | `admin-promotions-results.json`: PASS em modo navigation-only. Pratos/Bebidas/Categorias/Banners, editar/salvar/cancelar/excluir, foco/rolagem/retorno, pesquisa/filtros, estoque somente de fixture, duplicação, promoções manuais, numéricos, dashboard/pedidos/configurações/taxas/barra mobile |
| Financeiro real | RPC V2 com preço efetivo, adicional/bebida/taxa exatos, preço de navegador manipulado ignorado, idempotência/concorrência, uma única baixa, snapshot histórico e cancelamento sem dupla reposição. Promoção permanece manual sem expiração |
| Checkout de ponta a ponta | `etapa-c-checkout-results.json`: PASS. Detalhe → sacola/recomendação → checkout, subtotal R$57,40 / entrega R$65,90; desativação antes da confirmação causa 409, resumo R$75,90; segundo clique consciente registra um pedido fictício; mensagem completa/cópia e WhatsApp bloqueado na homologação, sem envio |
| Ponte / rollback de código | `etapa-c-bridge-results.json`: PASS. Código HTTP da main + Storage + dependências seguras sobre banco atualizado; CRUD antigo, defaults, capa/galeria, referência compartilhada, preço/estoque e menu. Build separado aprovado |
| Runtime e operação | `etapa-c-security-runtime-results.json`: PASS. Auth real/middleware, APIs públicas/administrativas; abertura manual/fechamento sem expiração e retorno a automatic; PNG/JPEG/AVIF processados por Next/Sharp reais, SVG rejeitado 400. Fixtures de imagem locais removidas; sem preço/estoque/pedido alterado nesse grupo |
| PWA | `etapa-c-security-pwa.log` / `pwa-browser-results.json`: PASS. Service Worker real, caches antigos incluindo v2 removidos, imagens PNG decodificáveis nas duas dimensões, asset e shell offline disponíveis, APIs sem resposta cacheada e pedidos offline bloqueados |

Dados fictícios de teste removidos, pedidos fictícios preservados cancelados, configuração de funcionamento restaurada e catálogo original da homologação preservado. Consulta final confirmou 3 pratos e 1 bebida originais, modo automatic/sem expiração, zero fixtures C, zero pedidos próprios ativos e zero objetos recentes remanescentes; histórico das quatro migrations e hashes das RPCs idênticos aos anteriores. Nenhum envio WhatsApp, nenhuma ação financeira ou operacional de produção. Não se reexecutaram migrations; os hashes de src/migrations e do relatório anterior foram confrontados com o snapshot inicial. Nenhuma regressão funcional nova identificada.


### O. Migrations e APIs

Nenhuma migration criada, editada ou aplicada nesta estabilização. `20261024153801_etapa_c_commercial.sql` permanece aditiva e já aplicada somente na homologação. Contratos e definições das RPCs original/V2 continuam intactos. Versões de dependências não exigiram parâmetros, defaults, schema, permissões ou ponte financeira adicionais. A ponte Storage/dependências seguras permanece necessária para transição e rollback; foi novamente exercitada no banco atualizado com êxito.

### P. Publicação futura e riscos

Continuam proibidos commit/push/merge/deploy/SQL de produção nesta tarefa. Na futura autorização: confirmar HEAD remoto/schema/histórico, acesso Vercel e Node compatível; publicar ponte **com dependências corrigidas**, verificar READY; aplicar exclusivamente a migration C na estratégia transacional preparada; publicar feature e verificar READY. Reauditar dependências se a publicação for adiada. Não voltar a usar os artefatos anteriores que carregavam Next 15.5.22.

### Q. Rollback

Voltar para a **ponte homologada com Next 15.5.28/Sharp 0.35.5 e overrides corrigidos**, mantendo colunas, histórico e arquivos da migration. O patch de rollback da feature não reverte package.json, lockfile, proteção de Storage, ícones corrigidos ou a versão do cache PWA. Main 86d3a7b sem os patches de segurança não é um alvo de rollback aprovado. Pausar edição comercial durante rollback e considerar telas PWA em cache. Nenhuma reversão de banco, recálculo histórico, preço ou estoque real.

### R. Testes manuais pendentes

iPhone/Safari e Android/Chrome físicos, teclado virtual, leitor de tela, compartilhamento nativo e WhatsApp manual, PWA instalado e QR impresso. Também permanece o cadastro pelo proprietário de conteúdo/fotos/depoimentos reais autorizados. Nenhum teste físico ou envio de WhatsApp foi declarado.

**SEGURANÇA VALIDADA —
ETAPA C PRONTA PARA AUTORIZAÇÃO
DE PUBLICAÇÃO.**

Esse resultado se refere ao código local/homologado. **A produção ainda está na versão anterior e não recebeu os patches nesta tarefa.** Nenhum commit, push, merge, deploy ou escrita em produção executado. Confirmar Node/acesso Vercel na futura etapa de release; testes físicos permanecem pendentes.

## PUBLICAÇÃO CONTROLADA EM PRODUÇÃO

24/10/2026 — autorização expressa recebida para publicar exclusivamente a Etapa C. **Publicação interrompida no pre-flight: acesso Vercel negado e Node.js efetivo não verificável. Nenhuma fase de escrita da release foi iniciada.** A autorização do proprietário continua registrada; o impedimento é técnico de acesso à plataforma, não ausência de autorização para publicar.

### A. Pre-flight

Executados pwd, status, remote, branch, log, fetch e diff --check. Repositório correto: `eusam66/comedoria-da-tata`; checkout `/workspace/comedoria-da-tata`; origin `https://github.com/eusam66/comedoria-da-tata.git`. Branch `feat/etapa-c-evolucao-comercial`.

Confrontados **65 hashes** de arquivos/artefatos com o manifest homologado: **zero divergências** antes desta atualização documental. Relação de arquivos alterados/novos também conferida: nenhuma alteração inesperada. Relatório integral, migration e script de preparo inspecionados. Implementação, ícones, dependências e SQL homologados preservados. Mudança preexistente em `docs/admin-ux-promocoes-pratos.md` preservada e continua excluída da release.

### B. Git

- Main inicial, main final observada, HEAD da branch e origin/main após fetch: `86d3a7beeb026ead43481ec9dc52734a93105a13`.
- Working tree: implementação completa da Etapa C não commitada, mais documentação preexistente; nenhum descarte/reset.
- Índice sem arquivos staged; nenhum conflito, merge ou force push.
- Única alteração de conteúdo nesta tentativa: este relatório; evidências e patches locais foram atualizados em `artifacts/`, ignorado pelo Git.

### C. Commits e push

**Nenhum commit criado, nenhum push realizado.** Commit da ponte, commit da feature e merge final: não iniciados. O bloqueio foi detectado antes dessas fases para evitar uma release parcial. Não há novos SHAs nem push a confirmar.

### D. Dependências e checks

Next.js **15.5.28**, Sharp **0.35.5**, React/React DOM **19.2.8**. Package.json, lockfile e artefatos coincidem com os homologados; npm 11.9.0 e Node local 24.19.0. Nenhuma dependência alterada nesta tentativa.

Resultados da bateria anterior foram confrontados com os mesmos arquivos e evidências: **65/65 testes**, TypeScript sem erros, ESLint sem erros e seis avisos preexistentes, builds de feature/ponte aprovados. Não se atribuem essas execuções à Vercel. A bateria inteira não foi repetida: nenhum código mudou e a release parou antes de publicar. Reexecutados nesta tentativa: **npm audit completo, zero alertas**, e **git diff --check aprovado**. Antes de retomar a release, executar os checks necessários sobre os commits exatos a publicar e revalidar a auditoria conforme o tempo decorrido.

### E. Node.js e acesso Vercel — bloqueio

Consulta somente leitura ao projeto documentado `prj_ZMBFceePMsa2wrrmD4JceGhsHFAN`, team `team_L349vkpqAtm1n55oL8TXgf9k`, retornou **HTTP 403 forbidden**, escopo `eusam67`. A conexão não está autorizada a consultar o recurso. Evidência: `artifacts/etapa-c-publication-vercel-block.json`.

Seguindo a recuperação fornecida pelo conector, tentou-se gerar o link de acesso com o ID documentado; o serviço respondeu **404 Team not found**. A única tentativa corretiva, com o slug `eusam67` indicado pelo próprio erro, também retornou 404. Nenhum link de autorização foi emitido. Não se insistiu, não se selecionou outra equipe e não se usaram credenciais alternativas.

`engines.node` declara `>=20.9.0`; não há `.nvmrc`/`.node-version` no checkout, nem versão Node em vercel.json. A homologação local usou Node **24.19.0**, mas isso **não comprova** o Node configurado na Vercel. Não foi possível consultar configuração/logs privados nem confirmar build/runtime efetivo. Portanto **deploy bloqueado** conforme o requisito explícito do proprietário. Nenhuma configuração Vercel foi alterada.

Próxima ação técnica: corrigir a associação/permissão da conexão Vercel para a equipe que possui `comedoria-da-tata`, confirmar o projeto e obter evidência do Node/build suportado. A autorização operacional para a release já foi concedida e não precisa ser repetida; o acesso técnico continua indispensável.

### F. Segurança

Auditoria completa do lockfile atual: **0 critical, 0 high, 0 moderate, 0 low, 0 info**, arquivo `artifacts/etapa-c-publication-audit.json`. Sem audit fix --force, atualização ampla ou exceção a risco crítico. Seis warnings ESLint anteriores permanecem distintos dos advisories npm e das depreciações de ferramentas documentadas na estabilização. Nenhum segredo/.env foi adicionado aos artefatos de publicação; nenhuma credencial ou recurso LuziCred acessado.

### G. Migrations e Supabase

Produção consultada exclusivamente por SELECT, conexão **COMEDORIA DA TATA**, project ref **`kjxivrltvdiswpaxjowa`**. História observada mantém versões `001`–`006`, `20260821172956`, `20260821214534`, `20261004141346`, `20261018153509` e `20261018163002`. **Migration C `20261024153801_etapa_c_commercial.sql` não consta no histórico e suas quatro colunas continuam ausentes. Nenhuma migration foi aplicada nesta tentativa.**

Migration local inspecionada: quatro colunas aditivas, defaults/constraints/helpers/trigger de capa; sem DML de preços, pedidos ou estoque, sem remoção de coluna e sem alteração de RPC financeira. SQL transacional preparado mantém schema e registro de versão na mesma transação. Sem alterações de Storage/RLS/GRANTs em produção. Não se declara aplicação nem validação pós-migration em produção, pois essa fase não começou.

### H. Compatibilidade

Evidências anteriores da API da main + ponte no banco atualizado e da feature permanecem válidas para os arquivos com hashes conferidos: `etapa-c-bridge-results.json`, `etapa-c-real-results.json`, `etapa-c-checkout-results.json` e `etapa-c-security-runtime-results.json`, todos aprovados. RPCs atuais e V2 mantêm MD5 em produção `0caff7bde38776d78f9219f6857af545` e `f029899ac5c332f7a65c217d35af0c21`. Nenhuma mudança de contrato financeiro necessária.

Sequência homologada a preservar ao retomar: **ponte segura de Storage/dependências → READY/verificação → migration C transacional → verificação → feature → READY/verificação**. A ponte falha de modo conservador no schema antigo; após a expansão protege fotos secundárias contra exclusão por APIs antigas. Essa ordem específica é a preparada/homologada, prevalecendo sobre a ordem meramente referencial do briefing. Aguardar requisições administrativas antigas antes de habilitar galerias; não presumir troca instantânea de instâncias/PWAs. Sem acesso à Vercel, nenhuma dessas fases está liberada tecnicamente.

### I. Ponte

Artefato homologado `artifacts/etapa-c-storage-bridge.patch`: main funcional + proteção de referências Storage, dependências corrigidas, PNGs reais e cache PWA v3. Diretório homologado `/tmp/comedoria-etapa-c-review-m6NBwN`; nenhuma alteração funcional adicional. **Não commitada, não publicada; deployment READY não obtido.**

### J. Feature final

Implementação completa continua local/homologada, sem nova funcionalidade ou refatoração nesta tentativa. Patches de feature/rollback e manifest preservam os arquivos aprovados. Main não recebeu a feature. Galeria/admin comercial/recomendações/SEO/QR da Etapa C **ainda não estão publicados**.

### K. Deployments e domínio

Nenhum deployment criado, promovido, revertido ou acompanhado como READY nesta tentativa. IDs anterior/intermediário/final e commit efetivamente servido pelo domínio **não reconfirmados**, devido ao bloqueio de acesso; não se inventam IDs. Não se declara domínio atualizado. A produção existente continua atendendo no domínio oficial, conforme smoke tests públicos abaixo.

### L. Storage e galeria

Nenhum upload, exclusão de imagem ou alteração de bucket/policy em produção. Etapa C de galeria continua aprovada somente na homologação. Smoke test público não substitui validação pós-deploy da nova galeria; essa verificação aguarda a liberação técnica da release.

### M. Home, recomendações e estado operacional

Smoke tests somente GET: home, `/api/menu`, `/api/beverages` e `/admin/login` responderam **200**. `/api/store-status` respondeu **200** em duas consultas: `isOpen:true`, `mode:automatic`, `expiresAt:null`, fuso `America/Recife`, sem mudança observada. SELECT confirmou `order_operations.mode=automatic`, expiração nula e timestamp de configuração anterior à release.

Consulta de disponibilidade inicialmente usou `/api/ordering-status`, que respondeu 404 por ser rota inexistente; a rota correta `/api/store-status` foi conferida no código e respondeu 200. Esse probe incorreto não é classificado como regressão do site.

Treze pratos existentes. Snapshots financeiros/de estoque antes e depois das verificações coincidiram: pratos `896acc9073073a5a0892dac74e95e60e`; bebidas `8268f46513716c0ea83fc759b6f69d02`. **Preços, configuração promocional e estoque preservados; nenhuma escrita operacional foi executada.** Recomendações novas continuam somente na versão homologada.

### N. SEO e compartilhamento

Metadata/OG/canonical/sitemap, links individuais, Share/copiar e QR permanecem homologados no código local sem divergência de hash. Não foram declarados publicados nem exercitados por envio externo. As verificações específicas pós-deploy aguardam a release; nenhum conteúdo comercial, depoimento ou avaliação inventado/inserido em produção.

### O. Financeiro, checkout e WhatsApp

APIs/RPCs financeiras não alteradas nesta tentativa. Homologação anterior de reconfirmação, idempotência, snapshot, promoção/adicionais/taxas permanece documentada; não se registrou pedido em produção, não se executou checkout real e não se enviou WhatsApp. Não se afirma validação real de checkout da feature em produção.

### P. PWA, runtime e logs

Manifest e Service Worker da versão já publicada respondem **200**. PWA novo, ícones válidos/cache v3 e processamento Next/Sharp continuam homologados localmente. Não se declarou teste físico ou atualização de PWA em produção. As rotas públicas verificadas não apresentaram HTTP 500; **logs privados de runtime/build da Vercel não puderam ser consultados**, portanto não há afirmação de ausência global de erros em logs. Nenhum dado/cache de cliente foi apagado.

### Q. Rollback e evidências

Nenhum rollback necessário ou executado: Git remoto, schema de produção e Vercel não foram modificados. Para futura feature publicada, alvo aprovado continua a **ponte com dependências seguras**, conservando migration, dados, ícones e proteção de Storage; não retornar cegamente à main vulnerável nem excluir colunas/imagens/conteúdo. Reavaliar galerias/PWA e conteúdo real antes de qualquer reversão.

Evidências adicionais locais: `etapa-c-publication-audit.json`, `etapa-c-publication-vercel-block.json`, `etapa-c-publication-database-readonly.json`, `etapa-c-publication-public-smoke.json` e snapshot de status; artefatos históricos anteriores à atualização documental preservados em `artifacts/etapa-c-publication-before/`. Patches/manifest atualizados somente para incorporar este registro documental, sem alteração da implementação ou da migration.

### R. Homologação manual e próxima ação

Continuam pendentes iPhone/Safari e Android/Chrome físicos, teclado real, acessibilidade por leitor de tela, compartilhamento nativo/WhatsApp manual, PWA instalado e QR impresso. O proprietário fará essa validação após uma publicação efetivamente concluída. Conteúdo/fotos/depoimentos reais dependem do cadastro autorizado pelo proprietário.

**Fase interrompida:** pre-flight, validação de acesso/Node Vercel. **Última operação concluída:** verificações somente leitura de produção e reconciliação local de evidências, sem iniciar fases de escrita. Corrigir acesso da conexão Vercel/equipe e comprovar Node compatível antes de retomar commits, push, ponte, migration e feature na sequência homologada. Não é necessária nova autorização de publicação dentro deste escopo já autorizado.

**PUBLICAÇÃO INTERROMPIDA COM SEGURANÇA.**

Estado final: HEAD/main `86d3a7beeb026ead43481ec9dc52734a93105a13`; Etapa C não commitada e preservada; Supabase produção sem migration C; Vercel sem deployment novo nesta tentativa; site público funcionando nas verificações executadas. **Nenhum commit, push, merge, deploy, escrita operacional, alteração de preços/estoques, pedido real ou envio WhatsApp.**

### Retentativa após reconexão da Vercel — 24/10/2026

Conforme solicitado pelo proprietário, repetida a consulta somente leitura ao projeto/team documentados: **403 forbidden para o escopo eusam67**. Recuperação `authorize_team_access` voltou a retornar **404 Team not found**. Para diagnosticar a reconexão sem insistir no endpoint negado, consultada somente a lista de equipes visíveis à conexão: a resposta contém exclusivamente a equipe **LuziCred**, sem a equipe da Comedoria. Nenhum projeto, deployment, configuração ou credencial do LuziCred foi acessado ou modificado; a descoberta limitou-se aos nomes das equipes da própria conexão.

Isso confirma que a conexão renovada não oferece acesso à equipe Vercel documentada da Comedoria. É necessário conectar a conta com acesso ao projeto `comedoria-da-tata` no escopo `eusam67` ou corrigir o vínculo desse projeto/equipe no conector. A autorização de publicação já recebida permanece válida; falta o acesso técnico correto, não uma nova autorização operacional.

Fetch confirmou novamente HEAD/origin/main `86d3a7beeb026ead43481ec9dc52734a93105a13`; diff --check aprovado e implementação local preservada. Nenhum commit, push, merge, deployment ou consulta/escrita Supabase nesta retentativa. Node.js Vercel permanece não verificável. **PUBLICAÇÃO INTERROMPIDA COM SEGURANÇA.**
