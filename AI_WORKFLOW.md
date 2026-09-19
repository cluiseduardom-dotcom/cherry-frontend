# AI WORKFLOW — CHERRY

## Objetivo

Manter GPT, Claude e Gemini trabalhando sobre a mesma realidade técnica e de negócio.

## GPT
Responsável por:
- arquitetura;
- regras de negócio;
- decomposição de tarefas;
- análise de risco;
- revisão técnica;
- QA e critérios de aceite.

## Claude
Responsável por:
- implementação;
- refatoração;
- testes;
- integração frontend/backend;
- correções técnicas.

Não deve:
- inventar regra de negócio;
- alterar arquitetura sem registrar a decisão;
- fazer push direto em `master`;
- ampliar escopo sem autorização.

## Gemini
Responsável por:
- UX/UI;
- hierarquia visual;
- usabilidade;
- acessibilidade;
- revisão de fluxos;
- consistência visual.

Não deve alterar regra de negócio apenas para melhorar aparência.

## Fluxo padrão

1. Definir objetivo e critérios de aceite.
2. Criar branch específica.
3. Implementar uma unidade pequena de trabalho.
4. Rodar lint/build/testes.
5. Revisar UX quando houver mudança de interface.
6. Revisar arquitetura/regra.
7. Abrir PR.
8. Fazer merge somente após validação.

## Princípios

- Escopo fechado.
- Mudança mínima necessária.
- Não quebrar comportamento existente.
- Não duplicar componentes sem justificativa.
- Fail-closed para acesso.
- Nenhuma credencial em código ou documentação.
- Nenhum push direto em `master` para trabalho experimental.
