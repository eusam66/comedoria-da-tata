# Comedoria da Tata — Instruções para agentes

## Fluxo de trabalho
- ChatGPT/Work atua como coordenador do projeto: organiza requisitos, contexto, prioridades, critérios de aceite e documentação.
- Codex atua como executor técnico: inspeciona o repositório, implementa, testa, depura e revisa alterações.
- Work e Codex devem usar este repositório como fonte de verdade compartilhada.
- Quando uma tarefa vier estruturada pelo Work, trate o briefing como a especificação principal, respeitando também este arquivo e a documentação existente.

## Antes de alterar código
1. Leia `README.md` e a documentação relevante do repositório.
2. Verifique o estado atual antes de alterar arquivos e preserve trabalho não relacionado.
3. Identifique claramente o escopo solicitado.
4. Evite refatorações amplas ou antecipação de funcionalidades não solicitadas.

## Diretrizes do projeto
- Preservar funcionalidades já homologadas, salvo quando a solicitação pedir explicitamente uma alteração.
- Manter abordagem mobile-first para a experiência do usuário.
- Preservar a stack e os padrões existentes sempre que forem adequados: Next.js, React, TypeScript, Tailwind e Supabase.
- Não expor segredos ou chaves privadas. Nunca versionar `.env.local`, service-role keys ou credenciais.
- Alterações de banco devem ser rastreáveis por migrações e evitar perda de dados.
- Não introduzir dependência paga ou custo recorrente sem aprovação explícita.
- Quando houver integração com WhatsApp ou serviços externos, preservar comportamento existente e documentar mudanças de configuração.

## Validação
Depois de alterações relevantes, execute os checks aplicáveis disponíveis no projeto, como:
- instalação/validação de dependências quando necessário;
- build do projeto;
- lint;
- testes existentes;
- validação das migrações quando a tarefa envolver Supabase/banco;
- verificação do fluxo mobile quando houver mudança de interface.

Se algum check não puder ser executado ou falhar por causa pré-existente, registrar isso claramente no resumo final.

## Entrega
Ao concluir:
- Resumir o que foi alterado.
- Listar os arquivos principais modificados.
- Informar os testes/checks executados e resultados.
- Registrar pendências reais sem inventar trabalho adicional.
- Não fazer deploy, merge, push adicional ou operação destrutiva fora do pedido sem autorização explícita.
