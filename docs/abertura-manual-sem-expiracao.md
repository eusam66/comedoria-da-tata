# Comedoria da Tata — abertura manual sem expiração

17/10/2026 — America/Fortaleza.

**CORREÇÃO LOCAL CONCLUÍDA — AGUARDANDO PUBLICAÇÃO**

## Diagnóstico

O painel inicializava o encerramento em 15:00 e enviava esse horário ao clicar
em “Abrir pedidos hoje”. Depois das 15h, a API rejeitava a ação por exigir um
horário futuro no mesmo dia. A configuração permanecia no modo anterior.

Havia um segundo problema: `calculateStoreStatus` somente aceitava abertura
manual com uma data futura em `expiresAt`. O estado `{ mode: "open", expiresAt:
null }` caía indevidamente no cálculo do horário padrão.

A home também exibia “Até 15:00” fixo, e o cabeçalho das páginas de pratos recebia
`open=true`, sem consultar o estado operacional. Esses dois pontos foram
alinhados à regra compartilhada do servidor.

## Correção

- “Abrir pedidos agora” substitui “Abrir pedidos hoje”. O campo de hora foi
  removido; a requisição envia apenas o modo.
- A API grava `mode=open` e `expiresAt=null` na mesma chave
  `restaurant_settings / order_operations`.
- O valor anterior é lido antes da gravação e mesclado: os demais campos,
  inclusive o valor existente de `updated_at`, são preservados. Não há limpeza
  ou substituição indiscriminada de metadados.
- Null, ou ausência do campo de expiração em estado antigo aberto, significa
  abertura sem prazo. Não há tarefa agendada, regra de meia-noite ou relógio do
  frontend capaz de retornar esse estado ao horário padrão.
- “Fechar agora” persiste `mode=closed`, `expiresAt=null`, até nova ação.
- “Horário padrão” persiste `mode=automatic`, `expiresAt=null` e aplica os horários
  cadastrados em Configurações, sem alterar a grade.
- O painel exibe **ABERTO MANUALMENTE**, **FECHADO MANUALMENTE** ou
  **HORÁRIO PADRÃO** e o texto solicitado:

  “A loja permanecerá aberta até você fechar manualmente ou retornar ao horário
  padrão.”

- A abertura sem prazo mostra “Abertura manual sem expiração. Continuará ativa
  até nova ação.” Nenhum prazo inexistente é exibido.
- Status público, sacola, checkout e API de pedidos continuam usando a mesma
  função de funcionamento. A home e os detalhes de pratos exibem o estado real.
- Não foram alteradas regras de estoque, preços, taxas ou idempotência.

### Compatibilidade

Aberturas temporárias antigas com uma expiração válida continuam respeitando o
prazo originalmente salvo. Prazos antigos vencidos ou inválidos deixam de valer
e usam a grade, sem gravar uma conversão no banco. Isso evita reabrir
inesperadamente uma loja cujo prazo antigo terminou.

Ao clicar novamente em “Abrir pedidos agora”, qualquer expiração antiga é
substituída por null. Clientes antigos que ainda enviem `until` ou `expiresAt`
também não conseguem reintroduzir um prazo nessa ação: a API ignora esses campos.
O fechamento manual não depende de expiração.

## Testes

| Verificação | Resultado |
| --- | --- |
| TypeScript | PASS |
| ESLint | PASS: zero erros e seis avisos preexistentes |
| Testes de regras, rotas, checkout, idempotência, WhatsApp e PWA | PASS: 34 testes, zero falhas |
| Build Next.js 15.5.22 | PASS |
| Integração real de configuração em homologação | PASS |
| Interface em Chromium, 390 × 844 e 1440 × 1000 | PASS |
| `git diff --check` | PASS |

Os 12 testes novos cobrem:

- Abertura depois das 15h e em dia normalmente fechado.
- Abertura sem expiração, meia-noite e datas futuras.
- Fechamento manual persistente e retorno à grade personalizada.
- Compatibilidade com expirações antigas, inclusive vencidas ou inválidas.
- API sem horário obrigatório, metadados preservados e descarte dos campos de
  expiração enviados por clientes antigos.
- Falhas de autenticação/autorização, modo inválido e falhas de leitura/gravação.

### Integração real — somente homologação

O harness valida URLs, ref da chave administrativa, modo de homologação e
marcador do banco antes de escrever. Utiliza exclusivamente
`nkywpsftihxcuvdxeexn` e o administrador já existente. Nenhum segredo é registrado.

Foi usada temporariamente uma grade fechada em todos os dias para demonstrar
que o modo manual prevalece sobre o funcionamento padrão. Passaram:

1. PUT sem sessão retorna 401 e não modifica configuração.
2. Login real, clique no novo botão, gravação `open/null`, leitura direta no banco
   e conferência de metadados/updated_at.
3. Reload do painel mantém a abertura.
4. Novo processo Chromium, sem armazenamento do anterior, recebe a abertura
   persistida pela API pública, inclusive no detalhe de prato.
5. Sacola e checkout permitem avançar enquanto aberto.
6. “Fechar agora” atualiza um checkout já aberto pelo polling existente de até
   dez segundos e desabilita o registro; a API devolve 409 de loja fechada.
7. “Horário padrão” retoma imediatamente a grade fechada usada no teste; nova
   abertura manual volta a prevalecer.
8. Falhas HTTP 401/500 simuladas na interface mostram erro, mantêm o estado
   anterior e não exibem sucesso de abertura.
9. PWA offline não devolve uma resposta antiga de loja aberta para a API.

A API de pedidos foi exercitada com corpo deliberadamente inválido: fechada,
rejeita pelo horário (409); aberta, passa desse bloqueio e alcança a validação
obrigatória do pedido (400). Nenhum pedido válido foi submetido. Não se declara
um novo teste de registro completo nesta correção, pois ele alteraria estoque.

Os casos de meia-noite e datas futuras exercitam a função real de regras com
horários controlados, sem mudar o relógio do servidor remoto. A persistência após
reinício foi testada com dois processos Chromium reais. Não houve espera física
até a meia-noite, teste de Safari/iPhone ou envio de WhatsApp.

A inspeção adicional do cabeçalho público, nos três modos e nos dois tamanhos,
usou respostas controladas apenas para layout: sem overflow horizontal. A
persistência e as transições acima foram testadas contra o banco real de
homologação, sem substituir as APIs de sucesso por mocks.

## Dados, segurança e publicação

As duas configurações temporárias de homologação, `storefront` e
`order_operations`, foram restauradas exatamente aos valores anteriores no
finally do harness e conferidas por nova leitura.

Foram comparados antes/depois os estoques de pratos e bebidas, os IDs de pedidos
e os IDs de histórico: permaneceram iguais. Não foram alteradas zonas ou taxas,
criados usuários, registrados pedidos, aplicadas migrations ou modificadas
permissões.

Não houve acesso ou escrita no Supabase de produção, acesso ao LuziCred, commit,
push, merge ou deploy nesta tarefa. A versão publicada continua sem esta
correção; o proprietário só verá os novos controles depois de uma publicação
separadamente autorizada.

A correção reutiliza o schema atual. **Nenhuma migration é necessária.**

## Arquivos desta correção

- `src/app/api/admin/order-operations/route.ts`
- `src/lib/storeHours.ts`
- `src/lib/storeHours.test.ts`
- `src/components/OrderOperations.tsx`
- `src/app/page.tsx`
- `src/components/layout/Header.tsx`
- `src/app/dishes/[slug]/page.tsx`
- `scripts/order-operations-route.test.cjs`
- `scripts/verify-order-operations-browser.cjs`
- `docs/abertura-manual-sem-expiracao.md`

Branch local: `fix/abertura-manual-persistente`. HEAD permanece
`0b8f89ae2a4cccbaedae71319dcd68e928b366a8`; nenhum commit foi criado.
As três alterações locais da homologação anterior (relatório e dois harnesses)
foram preservadas, sem sobrescrita. A main e seu worktree permanecem intactos.
O cabeçalho tocado teve finais de linha normalizados para passar no diff check.

Evidências, ignoradas pelo Git: `artifacts/manual-opening-browser.json`, logs
`manual-opening-build.log`, `manual-opening-lint.log`,
`manual-opening-typescript.log` e capturas `manual-opening-*.png`.

Comandos de validação:

```sh
./node_modules/.bin/tsc --noEmit --incremental false
npm run lint
node --experimental-strip-types --test --test-isolation=none src/lib/*.test.ts scripts/*.test.cjs
npm run build
git diff --check
```

O harness de navegador usa Playwright e Chromium disponíveis no Cloud, com as
variáveis públicas de homologação configuradas no subprocesso e os dois secrets
somente no ambiente. Não deve ser executado contra produção.

**CORREÇÃO LOCAL CONCLUÍDA — AGUARDANDO PUBLICAÇÃO**
