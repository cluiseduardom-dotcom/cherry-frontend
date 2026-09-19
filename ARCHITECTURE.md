# ARCHITECTURE — CHERRY FRONTEND

## Stack real

- React 19
- Vite 8
- React Router 7
- JavaScript/JSX
- CSS próprio com design tokens
- Lucide React
- Recharts
- Vitest
- Oxlint

## Estrutura

```
src/
├── components/
├── config/
├── context/
├── pages/
├── services/
└── utils/
```

## Princípios

### UI
Páginas orquestram fluxo. Componentes compartilhados devem concentrar padrões repetidos.

### Serviços
Comunicação com backend fica em `services/`, não espalhada por componentes.

### Acesso
Regras de rota/campo/ação ficam centralizadas em `src/config/access.js`.

O padrão é fail-closed.

### Autenticação
Token é mantido pelo AuthContext e disponibilizado ao cliente HTTP por uma ponte de autenticação.

### Estilo
Usar tokens do design system antes de criar valores locais.

### Responsividade
Toda tela nova deve considerar desktop e mobile.

## Não usar como premissa

A documentação antiga pode conter referências a TypeScript ou Tailwind. O código atual auditado usa JavaScript/JSX e CSS próprio. Qualquer migração de stack deve ser uma decisão explícita, não uma suposição.
