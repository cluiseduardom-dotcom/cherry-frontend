# VERTUMNO — Proposta: identidade visual por empresa

Status: **proposta para revisão. Nada deste documento está implementado** (nem no frontend, nem no backend).

## 1. Objetivo e diretrizes aprovadas

- Um único frontend compartilhado; a identidade visual é determinada pela **empresa autenticada**.
- **VERTUMNO é a identidade padrão**, inclusive antes do login. Uma identificação prévia da empresa (ex.: subdomínio) fica fora desta proposta.
- Depois do login, o identificador do tema vem de **dados confiáveis retornados pelo backend**. O navegador não escolhe a empresa nem o tema.
- Temas são um **conjunto fechado no frontend**: `vertumno` e `cherry`. Tema desconhecido, ausente ou inválido cai em `vertumno`.
- O backend envia **apenas um identificador**. Nunca URL de logotipo, cor, CSS ou código vindo do banco.
- Não altera autenticação (fluxo, token, RBAC), PDV, pagamentos nem regras de negócio.

## 2. Situação atual (verificada no código)

Frontend (`cherry-frontend`):
- `src/theme/themes.js` já registra `vertumno` e `cherry`, com `resolverTema()` que cai no padrão para qualquer valor desconhecido (inclusive `__proto__`).
- `ThemeProvider.jsx` escolhe o tema uma única vez: pré-visualização `?tema=` **só em desenvolvimento**, senão sempre `vertumno`. Não há ligação com a empresa.
- `src/services/auth.js` devolve ao app só `id`, `nome`, `email` e `role` (`papel`).
- A sessão (`token` + `user`) fica em `sessionStorage` (`authSession.js`) e é restaurada ao recarregar a página.

Backend (`cherry-backend`, lido em somente leitura):
- `POST /auth/login` devolve `{ token, usuario: { id, nome, email, papel, empresa_id } }`.
- O JWT carrega `id`, `role`, `empresa_id` e `tv` (versão do token). Não há rota de "sessão atual" (`/auth/me`): só existem `login` e `register`.
- `usuarioRepository.buscarPorEmail` já faz `JOIN` com `empresas` (traz `e.status AS empresa_status`).
- A tabela `empresas` (migração `007_multi_tenant.sql`) tem apenas `id`, `nome`, `cnpj`, `status`, `criado_em`. Não há campo de identidade visual.

Consequência: em produção o cliente Cherry enxerga o tema VERTUMNO; não existe como ligar o tema a uma empresa.

## 3. Contrato proposto para o backend

### 3.1 Migração (aditiva e reversível)

Próximo número livre na data desta proposta: `049` (conferir no momento de implementar; há PRs abertas no backend que podem usar números).

```sql
-- 049_empresas_tema_visual.sql
ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS tema_visual VARCHAR(30) NOT NULL DEFAULT 'vertumno';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'empresas_tema_visual_chk') THEN
    ALTER TABLE empresas
      ADD CONSTRAINT empresas_tema_visual_chk CHECK (tema_visual IN ('vertumno', 'cherry'));
  END IF;
END $$;

UPDATE empresas SET tema_visual = 'cherry' WHERE nome = 'Cherry Semijoias';
```

- Toda empresa existente passa a `vertumno` (padrão), exceto a Cherry Semijoias.
- O `CHECK` mantém a lista alinhada ao conjunto fechado do frontend: um tema novo exige migração **e** código do frontend, no mesmo ciclo.
- Reversão: remover a constraint e a coluna. Sem perda de dados de negócio.
- Aplicar primeiro em staging (Neon), conferir a Cherry e só então produção. Esta proposta não executa nada no banco.

### 3.2 Resposta de login (somente adição de campos)

```json
{
  "data": {
    "token": "…",
    "usuario": {
      "id": 1,
      "nome": "…",
      "email": "…",
      "papel": "admin",
      "empresa_id": 1,
      "empresa": { "id": 1, "tema": "cherry" }
    }
  }
}
```

- Campos existentes não mudam: clientes antigos continuam funcionando.
- `tema` vem do banco, via `JOIN` já existente com `empresas`, a partir da empresa **do próprio usuário autenticado**. Nenhum parâmetro de requisição influencia o valor.
- Valor `NULL`/desconhecido (não deveria ocorrer com o `CHECK`) é devolvido como `"vertumno"`.
- Não inclui nome da empresa, CNPJ nem outros dados que não sejam necessários à identidade.

### 3.3 Revalidação da sessão (recomendado, fase seguinte)

Como o frontend guarda a sessão em `sessionStorage` (editável pelo usuário no próprio navegador), o tema guardado ali só afeta a **aparência da própria sessão** e não dá acesso a nada: dados e permissões continuam decididos pelo token e pelo backend. Mesmo assim, para o valor ser sempre o do servidor:

- `GET /auth/sessao` (protegido por `authMiddleware`, sem corpo) devolve o mesmo objeto `usuario` do login, lido do banco.
- O frontend chama essa rota ao iniciar com uma sessão restaurada e atualiza o tema com a resposta; falha de rede não derruba a sessão e mantém o tema guardado.
- Pode ficar para uma segunda PR do backend; a primeira (3.1 e 3.2) já resolve o login.

### 3.4 O que **não** muda no backend

- RBAC, isolamento por empresa, emissão e validação do JWT, rate limit de login.
- Nenhuma rota de edição de tema: a configuração é feita por migração/operação interna, não por usuários. Isso evita criar uma superfície de escrita nova.
- PR #94 do backend: não é tocada. A migração desta proposta deve ir em PR própria.

### 3.5 Testes esperados no backend

- Login de empresa com `tema_visual = 'cherry'` retorna `usuario.empresa.tema === 'cherry'`.
- Empresa sem configuração retorna `'vertumno'`.
- O valor não é influenciado por corpo, query ou cabeçalhos da requisição.
- Empresa inativa continua sem autenticar (mesma resposta 401 de hoje).
- A migração é idempotente (rodar duas vezes não falha).

## 4. Implementação no frontend (etapa posterior)

Só começa depois do contrato acima estar aprovado e, preferencialmente, disponível em staging. Escopo previsto:

- `services/auth.js`: copiar `usuario.empresa?.tema` para `user.tema`, sem tratar o valor como confiável além do `resolverTema`.
- `AuthContext` / `authSession`: guardar o tema na sessão; limpar no logout.
- `ThemeProvider`: ordem de escolha = pré-visualização em desenvolvimento → tema da sessão → `vertumno`; trocar o tema no login e voltar ao padrão no logout; título e favicon da aba passam a vir do tema (`marca.tituloAba`, `marca.favicon`), com o `index.html` já em VERTUMNO por padrão.
- Antes do login a identidade é VERTUMNO; ao autenticar, uma empresa Cherry passa a bordô. Essa troca visível no login é conhecida e aceita como consequência da diretriz 2.
- Testes: tema desconhecido ou ausente → VERTUMNO; logout restaura o padrão; sessão restaurada reaplica o tema; nenhuma URL ou CSS vindo do backend é aceito.
- Sem mudança em PDV, pagamentos, rotas, permissões ou chamadas de negócio.

## 5. Ordem de publicação sugerida

1. Backend (PR própria): migração + campo no login (3.1 e 3.2). Aditivo: o frontend atual ignora o campo novo.
2. Aplicar a migração em staging, validar com a empresa Cherry, depois em produção.
3. Frontend (PR própria): leitura do tema na sessão (seção 4). Se o backend ainda não enviar o campo, tudo continua em VERTUMNO.
4. Opcional: `GET /auth/sessao` e revalidação ao iniciar (3.3).

## 6. Riscos e pontos em aberto

- **Login sempre em VERTUMNO:** sem identificação prévia da empresa, o cliente Cherry vê o login com a marca VERTUMNO. Resolver exige uma estratégia como subdomínio por cliente; fica como evolução futura.
- **Usuário em mais de uma empresa:** hoje cada usuário tem uma `empresa_id`; esta proposta assume isso.
- **Novo cliente = mudança de código:** acrescentar logo, tokens e entrada em `TEMAS`, mais a migração do `CHECK`. É intencional (conjunto fechado), mas precisa estar no processo de onboarding de clientes.
- **Logos provisórios:** os PNGs atuais são de baixa resolução; falta o vetor original das duas marcas.
- **Sessão adulterada no navegador:** só altera a aparência local; mitigada com a revalidação da seção 3.3.
