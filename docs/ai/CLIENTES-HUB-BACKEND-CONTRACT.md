# Contrato de backend pendente — Issue #45 (hub de Clientes)

> Documento de handoff para quem for implementar em `cherry-backend`. Escrito pela sessão de frontend depois de investigar (somente leitura) o schema, rotas, controller, service, repository e validação reais de `clientes` em `cherry-backend` (branch `origin/master`). Nada aqui foi implementado no backend — o frontend desta entrega já foi construído para consumir este contrato, com fallback onde possível, mas as funcionalidades abaixo só funcionam de fato depois que este contrato existir.

## Por que este documento existe

A Issue #45 pede CPF/CNPJ, endereço completo e edição de cliente. Hoje a tabela `clientes` só tem `id, empresa_id, nome, telefone, email, ativo, anonimizado, anonimizado_em`, e não existe nenhum endpoint de edição (`PUT`/`PATCH /clientes/:id`). Não dá para implementar isso só no frontend sem inventar contrato — por isso este documento separa exatamente o que precisa ser criado no backend.

## 1. Migration nova

Adicionar (aditivo, tudo opcional, não quebra nenhum registro existente):

```sql
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS cpf_cnpj VARCHAR(20),
  ADD COLUMN IF NOT EXISTS cep VARCHAR(10),
  ADD COLUMN IF NOT EXISTS endereco VARCHAR(255),
  ADD COLUMN IF NOT EXISTS numero VARCHAR(20),
  ADD COLUMN IF NOT EXISTS complemento VARCHAR(100),
  ADD COLUMN IF NOT EXISTS bairro VARCHAR(100),
  ADD COLUMN IF NOT EXISTS cidade VARCHAR(100),
  ADD COLUMN IF NOT EXISTS uf CHAR(2),
  ADD COLUMN IF NOT EXISTS data_nascimento DATE,
  ADD COLUMN IF NOT EXISTS observacoes TEXT;
```

Decisão explícita (aprovada pelo Product Owner): **não** adicionar `criado_em`/`atualizado_em` nesta entrega — o KPI "novos clientes no período" que dependeria disso ficou fora do escopo.

## 2. Endpoint novo: `PATCH /clientes/:id`

Não existe hoje nenhuma forma de editar um cliente depois de criado. Seguir o mesmo padrão já usado em `PATCH /fornecedores/:id` (`fornecedoresRepository`/`fornecedoresValidation`):

- **Rota**: `router.patch('/:id', controller.atualizar);` em `src/routes/clientes.js`. Mesmo middleware das outras rotas de clientes (só `authMiddleware` no mount, sem `requireAdmin`/`requireEstoquista` — confirmado que hoje qualquer papel autenticado pode ler/criar cliente; manter consistência a menos que o time decida restringir).
- **Validação** (`src/validations/clientesValidation.js`): novo `atualizarClienteSchema` — todos os campos abaixo opcionais, mais o `.refine()` de "objeto não vazio" (mesmo padrão de `atualizarFornecedorSchema`):
  ```js
  const atualizarClienteSchema = z.object({
      nome: z.string().min(1, 'Nome é obrigatório').optional(),
      telefone: z.string().optional(),
      email: z.string().email('Email inválido').optional(),
      cpf_cnpj: z.string().optional(),
      cep: z.string().optional(),
      endereco: z.string().optional(),
      numero: z.string().optional(),
      complemento: z.string().optional(),
      bairro: z.string().optional(),
      cidade: z.string().optional(),
      uf: z.string().length(2).optional(),
      data_nascimento: z.string().optional(), // 'YYYY-MM-DD'
      observacoes: z.string().optional(),
      ativo: z.boolean().optional()
  }).refine((data) => Object.keys(data).length > 0, { message: 'Informe ao menos um campo para atualizar' });
  ```
  **Importante**: também estender `criarClienteSchema` com os mesmos campos novos (opcionais) — hoje, se o frontend enviar `cpf_cnpj`/endereço no `POST /clientes`, o zod não rejeita (schema não é `.strict()`), mas o `clientesRepository.criar()` só lê `nome/telefone/email/empresa_id` do objeto — **os campos novos são descartados silenciosamente**. Isso precisa ser corrigido junto (repository.criar também precisa inserir os novos campos), senão o cadastro perde dados sem avisar ninguém.
- **Repository** (`src/repositories/clientesRepository.js`): função `atualizar(id, dados, empresa_id)` com `UPDATE` dinâmico a partir das chaves presentes em `dados` (mesmo padrão de `fornecedoresRepository.atualizar`), com `WHERE id = $N AND empresa_id = $N+1`.
- **Service** (`src/services/clientesService.js`): `atualizar(id, dados, empresaId)` repassando para o repository.
- **Controller** (`src/controllers/clientesController.js`): `atualizar(req, res, next)` — `parsed = atualizarClienteSchema.safeParse(req.body)`, chama o service, `response.success(res, cliente)`.

## 3. `anonimizar()` precisa ser atualizada (obrigatório — buraco de LGPD se pular)

`clientesRepository.anonimizar()` hoje só zera `nome/telefone/email` e marca `ativo=false, anonimizado=true`. Com os novos campos pessoais, o `UPDATE` de anonimização **precisa** zerar também `cpf_cnpj`, `cep`, `endereco`, `numero`, `complemento`, `bairro`, `cidade`, `uf`, `data_nascimento` — senão um cliente "anonimizado" continua com CPF e endereço completo gravados, o que quebra o propósito do endpoint (Issue #45, seção "Campos pessoais devem respeitar o desenho de privacidade/LGPD já adotado").

```sql
UPDATE clientes SET
    nome = 'Cliente removido',
    telefone = NULL,
    email = NULL,
    cpf_cnpj = NULL,
    cep = NULL,
    endereco = NULL,
    numero = NULL,
    complemento = NULL,
    bairro = NULL,
    cidade = NULL,
    uf = NULL,
    data_nascimento = NULL,
    ativo = false,
    anonimizado = true,
    anonimizado_em = NOW()
WHERE id = $1
RETURNING *
```
(`observacoes` fica a critério do time — pode conter anotações operacionais não-pessoais; se puder conter dados pessoais, zerar também.)

## 4. `GET /clientes/:id/historico` — adicionar `total_venda` (aditivo, recomendado)

Query atual (`clientesRepository.getHistorico`):
```sql
SELECT
  v.id AS venda_id,
  v.data,
  p.nome AS produto,
  iv.quantidade,
  iv.preco_unitario,
  (iv.quantidade * iv.preco_unitario) AS total_item
FROM vendas v
JOIN itens_venda iv ON iv.venda_id = v.id
JOIN produtos p ON p.id = iv.produto_id
WHERE v.cliente_id = $1 AND v.empresa_id = $2
ORDER BY v.data DESC
```
Decisão aprovada: adicionar `v.total AS total_venda` ao SELECT (a coluna já existe e já é persistida — `vendas.total = subtotal - desconto + juros`). Continua uma linha por item (não muda a forma do retorno, só adiciona uma coluna repetida por linha da mesma venda):
```sql
SELECT
  v.id AS venda_id,
  v.data,
  v.total AS total_venda,
  p.nome AS produto,
  iv.quantidade,
  iv.preco_unitario,
  (iv.quantidade * iv.preco_unitario) AS total_item
FROM vendas v
JOIN itens_venda iv ON iv.venda_id = v.id
JOIN produtos p ON p.id = iv.produto_id
WHERE v.cliente_id = $1 AND v.empresa_id = $2
ORDER BY v.data DESC
```
**Compatível com consumidores antigos** (só adiciona campo, não remove nem renomeia nenhum existente). O frontend desta entrega já foi escrito com fallback: usa `total_venda` quando presente, senão soma os `total_item` da venda — funciona hoje (com a soma aproximada, sem desconto/juros) e passa a usar o valor exato assim que este contrato for implementado, sem precisar de nova mudança no frontend.

## 5. Testes esperados no backend

Mesmo padrão dos módulos já existentes (`tests/repositories/fornecedoresRepository.test.js` como referência):
- `clientesValidation.test.js`: novo schema de atualização aceita parcial, rejeita objeto vazio, valida formato dos campos.
- `clientesRepository.test.js`: `criar` grava os novos campos; `atualizar` monta o `UPDATE` dinâmico certo; `anonimizar` zera todos os campos pessoais (incluindo os novos).
- `clientesService.test.js` / `clientesController.test.js` / `routes/clientes.test.js`: cobertura do novo endpoint.

## Resumo do que o frontend já assume que vai existir

| Endpoint/campo | Usado por |
|---|---|
| `PATCH /clientes/:id` | Edição de cliente (`ClienteModal` modo `edit`) |
| `cpf_cnpj`, `cep`, `endereco`, `numero`, `complemento`, `bairro`, `cidade`, `uf`, `data_nascimento`, `observacoes` em `POST`/`GET`/`PATCH /clientes` | Formulário de cadastro/edição e busca por documento |
| `total_venda` em `GET /clientes/:id/historico` | Total exato por venda no histórico agrupado (com fallback se ausente) |
| `anonimizar` zerando os novos campos | LGPD — não é consumido diretamente pelo frontend, mas é pré-requisito de conformidade |

Até este contrato ser implementado, o frontend desta entrega vai apresentar erro claro ao tentar editar um cliente (endpoint 404) e vai persistir apenas nome/telefone/email ao criar (os campos novos serão descartados silenciosamente pelo backend atual, comportamento já existente hoje, documentado aqui para que não seja uma surpresa).
