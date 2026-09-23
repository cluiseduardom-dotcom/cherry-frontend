# VERTUMNO Frontend — Arquitetura atual

## Stack
- React
- Vite
- React Router
- Vitest
- Oxlint

## Estrutura funcional
A aplicação possui:
- páginas por módulo;
- componentes compartilhados;
- contexto de autenticação;
- rotas protegidas;
- configuração central de acesso por papel;
- camada de serviços para comunicação com API.

## Rotas
As rotas devem ser registradas de forma consistente entre:
- componentes de rota;
- `config/access.js`;
- proteção por papel.

O `App.jsx` possui validações para detectar divergência entre rotas registradas e componentes mapeados.

## Regra arquitetural
Uma tela nova deve integrar autenticação, autorização, navegação, serviço de API, estados de erro/carregamento e testes aplicáveis. Não criar telas isoladas sem integração com o fluxo do módulo.
