# VERTUMNO Frontend — Fluxo de IA

## Responsabilidades

### GPT
Define arquitetura da funcionalidade, fluxo do usuário, critérios de aceite e integração com backend.

### Claude
Executor principal quando a tarefa exigir implementação de código e integração.

### Gemini
Especialista complementar para UX/UI, exploração visual e melhoria de experiência.

### Codex
Revisão independente, debugging e automação de engenharia quando necessário.

## Regra de execução
Uma tarefa deve ter um executor principal. Outros agentes podem revisar ou atuar em partes claramente separadas.

## Critérios de aceite
Uma tela não está pronta apenas porque renderiza. Verificar:
- navegação;
- autenticação;
- autorização;
- estados de carregamento;
- estados vazios;
- erros;
- validação;
- responsividade;
- integração com API;
- regressões.

## Princípio
O frontend representa as regras do produto; ele não substitui as validações e controles de segurança do backend.
