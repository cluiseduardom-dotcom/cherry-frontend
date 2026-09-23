# VERTUMNO Frontend — Regras para agentes

## Fonte de verdade
- GitHub é a fonte oficial.
- Trabalhe na branch atribuída.
- Não altere `master` diretamente.

## Arquitetura
- React + Vite.
- Navegação usa React Router.
- Autenticação e autorização devem respeitar `AuthContext`, `ProtectedRoute` e `config/access.js`.
- Chamadas HTTP devem respeitar os serviços existentes.

## UX
- O VERTUMNO deve ser limpo, rápido de entender e diferente de templates genéricos de ERP/SaaS.
- Não sacrificar usabilidade para criar efeitos visuais.
- Responsividade é requisito.
- Não alterar regras de negócio para resolver problema visual.

## Segurança
- Nunca colocar segredo no frontend.
- Não contornar `ProtectedRoute` ou permissões para exibir uma tela.
- Não confiar no frontend como camada única de autorização.

## Escopo
- Evitar refatorações fora da tarefa.
- Preservar componentes e fluxos estáveis.
- Alterações de UX que mudem comportamento devem ser documentadas.

## Entrega
- Executar lint/build/testes aplicáveis.
- Verificar navegação e permissões afetadas.
- Registrar riscos ou pendências no PR.
