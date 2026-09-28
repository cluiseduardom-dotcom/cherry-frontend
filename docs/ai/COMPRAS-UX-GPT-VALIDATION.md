# Validação Arquitetural GPT — Compras UX

## Resultado
**Aprovado condicionalmente para implementação pelo Claude Code.**

O blueprint do Gemini é consistente com a direção UX do VERTUMNO, mas não deve ser executado literalmente. Existem divergências entre o blueprint e os contratos atuais do frontend/backend que precisam ser respeitadas durante a implementação.

## Correções obrigatórias

### 1. Não inventar APIs
O backend atual de compras expõe:
- GET /compras
- POST /compras
- GET /compras/:id
- PATCH /compras/:id/cancelar

Recebimentos possuem endpoints próprios:
- GET /recebimentos
- POST /recebimentos
- GET /recebimentos/:id
- POST /recebimentos/:id/itens
- PATCH /recebimentos/:id/status
- POST /recebimentos/:id/aprovar

O blueprint cita "POST /compras (criação direta e planejada)". Isso é incorreto no estado atual. O POST /compras deve continuar sendo usado para o fluxo de compra direta legado.

**Regra:** o frontend não deve simular compra planejada como se já houvesse API suportando esse fluxo. O card "Planejada" pode ser preparado visualmente, mas a implementação deve respeitar o contrato real e indicar claramente qualquer etapa ainda não suportada.

### 2. Não criar timeline fictícia
A timeline é desejada, mas o frontend não deve inventar datas/status de OC, cotação, PC, NF-e ou financeiro que não estejam disponíveis no contrato real.

Quando dados não existirem, exibir estado "não iniciado", "não disponível" ou equivalente, sem fabricar progresso.

### 3. Permissões atuais
O frontend atual registra /compras somente para admin, enquanto o backend protege /compras com autenticação + requireEstoquista.

O blueprint propõe operador/estoquista/supervisor/gerente/admin, mas o frontend atual possui um conjunto menor de papéis e ações.

**Regra:** não inventar novos papéis ou ações silenciosamente. Antes de alterar access.js, mapear os papéis reais do backend e definir a matriz de autorização. A expansão de /compras para estoquista deve ser feita somente de forma compatível com o backend.

### 4. Nova ação APROVAR_COMPRA
O blueprint cita ACTIONS.APROVAR_COMPRA, mas ela não existe atualmente em src/config/access.js.

Não adicionar essa ação apenas para satisfazer a UX. Ela só deve ser criada junto com o contrato funcional correspondente e sua autorização real.

### 5. Busca
O serviço frontend atual aceita apenas:
- fornecedor_id
- data_de
- data_ate
- paginação

Não existe atualmente busca por texto/NF/SKU no endpoint de compras.

**Regra:** não declarar busca multicritério como funcionalidade integrada sem API correspondente. Se a primeira versão usar somente dados já carregados, deixar claro o limite da paginação. Se busca server-side for necessária, abrir mudança de contrato de API separada.

### 6. Compra direta deve permanecer funcional
O fluxo atual de Compra Direta já funciona e atualiza estoque/financeiro conforme o backend.

O redesign deve preservar:
- POST /compras existente;
- validações;
- cancelamento;
- feedback de sucesso/erro;
- compatibilidade com compras históricas.

### 7. Recebimento
A UX de conferência/scanner é válida, mas deve utilizar os endpoints reais de recebimento. A aprovação do recebimento já possui integração transacional com estoque, OC/PC e contas a pagar no backend.

O scanner é uma camada de entrada de quantidade; ele não deve implementar regras de estoque no frontend.

### 8. Financeiro
O blueprint está correto ao usar progressive disclosure. O frontend não deve implementar pagamento, liquidação ou banco dentro do redesign de Compras.

A cadeia financeira pode ser exibida apenas quando houver dados reais disponíveis.

### 9. Scanner
Implementar inicialmente uma abstração de entrada:
- câmera quando suportada;
- leitor USB/Bluetooth como teclado;
- entrada manual como fallback.

O scanner deve localizar o produto e alimentar a conferência. Não deve criar uma segunda lógica de estoque.

### 10. Escopo
Esta entrega é **frontend UX/UI**. Não inclui:
- 041A pagamento → movimento bancário;
- Open Finance;
- alteração de banco de dados;
- criação de OC/PC/cotação no backend;
- mudança fiscal.

## Critérios adicionais para Claude Code
Antes de alterar código:
1. investigar Compras, serviços, AuthContext, access.js e componentes compartilhados;
2. confirmar contratos reais de /compras e /recebimentos;
3. mapear quais dados atuais permitem montar cada parte da timeline;
4. separar claramente funcionalidades reais de placeholders/estados futuros;
5. preservar a compra direta atual;
6. reutilizar componentes e tokens existentes;
7. executar testes, lint e build;
8. abrir PR com arquivos, APIs, testes e limitações.

## Decisão de arquitetura
O blueprint do Gemini pode orientar a experiência visual e a interação.

A implementação deve seguir esta hierarquia:

**Contrato real do backend > regras de segurança/RBAC > arquitetura existente > UX consolidada > detalhes visuais do blueprint.**

## Próxima etapa
Após esta validação, o Claude Code pode implementar a primeira versão do redesign em branch própria, sem implementar funcionalidades backend ainda inexistentes.
