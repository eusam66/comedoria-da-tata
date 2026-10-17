# Recuperação das correções originais — Comedoria da Tata

Repositório: `eusam66/comedoria-da-tata`.
Branch de preservação: `fix/estabilizacao-checkout-cloud`.
Base original: `a2b8a9be23592c579140991c2c5cb64fdfaea72f`.
URL da branch: <https://github.com/eusam66/comedoria-da-tata/tree/fix/estabilizacao-checkout-cloud>.

## Recuperação

O checkout original conserva todas as correções. O diff rastreado foi comparado ao patch do backup e é idêntico. Todos os arquivos novos de código presentes no backup também existem no checkout, com conteúdo idêntico. Nenhum arquivo original de implementação ou teste ficou ausente. Não foi necessário extrair arquivos do backup ou reconstruir as correções.

O backup `/workspace/comedoria-homologacao-backup.tar.gz` teve SHA-256 conferido contra seu manifesto e foi inspecionado sem extração: 32 entradas, sem caminhos absolutos, travessia de diretórios ou arquivos de credenciais. Ele permanece local, fora do repositório.

Preservados: confirmação e recuperação do pedido, abertura manual do WhatsApp, cópia da mensagem com fallback, idempotência de frontend/backend, mensagem e destino centralizados, bloqueio de WhatsApp em homologação, service worker sem cache de APIs/checkout, configuração ESLint compatível e testes correspondentes. Os scripts e SQL exclusivos de homologação e o relatório anterior também são preservados como fonte; nenhuma migration ou escrita no Supabase faz parte desta recuperação.

## Conteúdo do commit

Preserva 33 arquivos adicionados/modificados: alterações originais de código, dependências/lockfile, configurações, testes, scripts de validação e documentação. Os dois arquivos `.env.example` são apenas modelos revisados, com URLs públicas e placeholders; não contêm chaves ou senhas.

Ficam fora do commit: `.env.local`, qualquer `.env` com valores, tokens, senhas, chaves, dados de clientes/pedidos reais, arquivos de `artifacts/`, capturas binárias, logs temporários e o backup compactado. Esses artefatos locais não foram apagados.

Foram adicionadas apenas estas adaptações à preservação:

- `.gitignore` protege arquivos de ambiente e saídas locais dos testes.
- Os três scripts de navegador criam a pasta `artifacts/` quando executados em um checkout limpo.
- `vercel.json` define `git.deploymentEnabled["fix/estabilizacao-checkout-cloud"] = false`, para o push de preservação não disparar deploy automático. Outras branches não são desabilitadas. Referência: <https://vercel.com/docs/project-configuration/git-configuration>.

Nenhuma configuração remota da Vercel foi alterada. Não foram adicionados workflows de publicação.

## Validação e limites

As correções originais já tinham 22 testes aprovados, TypeScript e build aprovados, ESLint com zero erros e seis avisos, além de desktop/mobile, PWA e abertura simulada do WhatsApp. Antes do commit, a revalidação passou: TypeScript, 22 testes (13 de checkout/WhatsApp/idempotência/PWA, seis de taxas e três de horários), build, `git diff --check` e ESLint com zero erros e seis avisos. O inventário de 33 arquivos foi revisado; a varredura de padrões de credenciais não encontrou ocorrências. Não foi feita nova escrita remota ou reexecução de integração Supabase. A verificação final de commit/branch/main é informada na entrega, pois o SHA do commit não pode ser incluído no próprio conteúdo desse commit.

A recuperação remota não equivale à aprovação do login e checkout integrados: a disponibilidade dos secrets no runtime continuava pendente na homologação anterior. Nenhuma credencial é necessária para recuperar código ou executar os testes locais. Não há merge, push para main, PR, deploy, envio de WhatsApp, acesso a LuziCred ou operação no Supabase nesta recuperação.

Para continuar em outro ambiente, usar a branch remota acima e os scripts preservados. Não reconstruir as correções. O relatório `docs/estabilizacao-operacional.md` e os guards de homologação documentam o estado e as pendências da integração.
