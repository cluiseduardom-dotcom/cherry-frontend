# Brief de Implementação — UX/UI de Compras

## Objetivo
Evoluir a experiência da tela **Compras** para uma operação moderna, fluida e orientada à próxima ação, preservando os contratos atuais do backend e sem expor a complexidade interna de OC/PC ao operador.

Princípio: **complexidade no motor, simplicidade na operação**.

## Escopo da primeira entrega
1. Tela central de Compras
   - métricas: Em andamento, Recebidas, Pendências;
   - busca e filtros;
   - listagem com compra, fornecedor, valor, status, progresso e data;
   - subvisões: Todas, Em andamento, Pendências, Recebimentos, Histórico.

2. Nova compra
   - CTA "+ Nova compra";
   - escolha simples entre:
     - Compra direta
     - Planejar
   - não exigir que o usuário conheça OC/PC para iniciar.

3. Detalhe da compra
   - timeline:
     Necessidade → Pedido → Cotação → PC → NF-e → Recebimento → Financeiro;
   - estados visuais: concluído, atual, pendente, divergência;
   - abas: Resumo, Itens, Documentos, Recebimento, Financeiro, Histórico.

4. Recebimento
   - ordered × received por item;
   - divergência imediatamente visível;
   - controles rápidos de quantidade;
   - estrutura preparada para leitura de código de barras/QR em mobile;
   - não alterar regras transacionais do backend.

5. Financeiro
   - operador vê somente valor, vencimento, status e ação para abrir a conta;
   - detalhes administrativos continuam disponíveis para perfis autorizados.

## Regras de UX
- Sempre deixar claro:
  1. Onde estou?
  2. O que está acontecendo?
  3. O que precisa da minha atenção?
  4. Qual é a próxima ação?
- Feedback imediato para ações.
- Skeletons durante carregamento.
- Empty states úteis.
- Toasts para ações rápidas.
- Drawers/modais para detalhes secundários.
- Animações discretas.
- Mobile-first para recebimento/conferência.
- Não criar menus principais separados para OC, PC, Cotação e Recebimentos para usuários operacionais.

## Segurança e compatibilidade
- Respeitar autenticação, RBAC e contratos existentes.
- Não inventar endpoints.
- Antes de implementar, inspecionar serviços/API existentes e reutilizar componentes.
- Não quebrar a compra direta legada enquanto o novo fluxo não estiver suportado pelo backend.
- Não alterar regras fiscais, estoque ou financeiro no frontend.

## Critérios de aceite
- Build passa.
- Lint passa.
- Testes existentes passam.
- Fluxo de compra direta continua funcional.
- Nova UX não exige conhecimento de OC/PC.
- Estados de carregamento/erro/vazio estão tratados.
- Navegação é consistente com o restante do ERP.
- Nenhum dado sensível é exposto além do RBAC.

## Ordem de execução
1. Auditar componentes, rotas e serviços atuais de Compras.
2. Criar/ajustar a página central.
3. Criar componentes reutilizáveis de status, progresso, timeline e filtros.
4. Integrar apenas endpoints existentes.
5. Testar compra direta e regressões.
6. Abrir PR com resumo, arquivos alterados, testes executados e pendências.

## Fora do escopo desta entrega
- Implementar 041A (Pagamento confirmado → Movimento Bancário).
- Escolher conta bancária automaticamente.
- Criar integração com banco/Open Finance.
- Alterar o modelo fiscal.
- Reescrever o backend de Compras.

## Fluxo de execução
GPT: arquitetura e critérios → Claude Code: implementação e testes → GitHub Actions: validação → Product Owner: teste e aprovação/merge.
