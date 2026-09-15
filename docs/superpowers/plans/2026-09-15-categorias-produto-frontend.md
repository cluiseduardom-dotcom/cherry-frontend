# Categorias de produto + SKU automático (frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the active bug where `ProductModal.jsx` collects and silently discards `sku`/`categoria` on `POST /produtos` (backend already dropped `sku` from the create schema and deprecated `categoria`), and build the UI for the backend's already-shipped categorization system: assigning structured categories to a product (which triggers automatic SKU generation), and a new admin-only CRUD screen for categories and their per-empresa level labels.

**Architecture:** Pure-logic helpers (`validar`, `montarPayload`, grouping/label helpers) are exported as named exports alongside each component's default export and unit-tested directly with vitest — the established pattern in this codebase (see `PrecificacaoProduto.jsx`/`.test.js`, `Venda.jsx`/`Venda.kit.test.js`). No component-rendering tests exist anywhere in this codebase today; this plan does not introduce that pattern. Three new service modules/functions wrap `apiFetch` exactly like existing services. Role gating goes through `src/config/access.js` (`ACTIONS`, fail-closed) — never an inline role check in a component.

**Tech Stack:** React 19, react-router-dom 7, vitest, oxlint, Vite.

**Spec:** This plan implements the task brief given directly by the user (reproduced verbatim in "Original request" at the end). It also depends on, and must not reopen, the sibling `cherry-backend` repo's `docs/superpowers/specs/2026-09-12-categorias-sku-design.md` and its `CLAUDE.md` sections on categorias/SKU and níveis de categoria.

## Global Constraints

- **No backend changes.** This is a frontend-only task against an already-deployed API.
- **Never send `sku` or `categoria` in `POST`/`PUT /produtos`.** The backend silently drops unknown fields — this is the exact bug being fixed. `montarPayload` in `ProductModal.jsx` must not have these keys at all (tested with `'sku' in payload === false`).
- **Fail-closed role gating**: any new capability (categorizing a product, reaching the new admin screen) gets an entry in `src/config/access.js` (`ACTIONS` or `ALLOWED_ROLES_BY_PATH`) — never a bare `user.role === 'admin'` check inside a component.
- **`access.js` and `App.jsx` must agree** — `App.jsx` already throws at load time if a registered path has no mapped component or vice versa (see `App.jsx:37-50`). The new route must satisfy both directions.
- **Mandatory UI warning before saving a new categoria**: `codigo`/`nivel` cannot be changed after creation — the only fix is delete + recreate. This is a backend-enforced invariant (immutable after creation), not a UI nicety — the warning must be visible before the save action, not just in a tooltip.
- **A level with no registered label is normal, not an error** — every empresa starts this way. Fall back to `Nível N`, never treat an empty `niveis-categoria` list as a loading/error state.
- **A product with no SKU is normal, not an error** — it just hasn't been categorized yet (or was categorized with an empty category list).
- **Do not reintroduce `produtos.categoria` (free-text) anywhere new.** It is deprecated backend-side. `ProductModal.jsx` drops it entirely (item 1). Since `Produtos.jsx` is being reworked in this same plan for the SKU badge and the categorization control, its existing `categoria`-driven filter pills and badge are removed there too (they were the only other place a product's `categoria` was surfaced) — flagged as a deliberate call, not scope creep, because leaving deprecated-field UI directly beside the new structured-categorization UI would be actively misleading. `Estoque.jsx` and `Venda.jsx` also read `produto.categoria` for unrelated display purposes; those are **out of scope** for this plan (not mentioned in the task's numbered scope) and are left untouched — noted in the final summary for a separate decision.
- **`apiFetch` (`src/services/api.js`) already throws `ApiError` with the server's `body.message`** — every modal's existing `catch (err) { setError(err.message) }` already surfaces 400/409 messages verbatim. No special-casing needed for "treat 409/400 with the API's message."
- Every new/changed component keeps the existing modal shell conventions (`modal-overlay`/`modal-panel`/`modal-header`/`modal-body`/`modal-footer`, `Escape`-to-close effect, `ProductModal.css` reused rather than duplicated).

## File Structure

New files:
- `src/services/categorias.js` — `listarCategorias`, `criarCategoria`, `atualizarCategoria`, `excluirCategoria`.
- `src/services/niveisCategoria.js` — `listarNiveisCategoria`, `criarNivelCategoria`, `atualizarNivelCategoria`, `excluirNivelCategoria`.
- `src/components/CategorizarProdutoModal.jsx` (+ `.test.js`) — one `<select>` per nível, backend-immutability/SKU warning, saves via `PATCH /produtos/:id/categoria`.
- `src/components/NivelCategoriaModal.jsx` — create/rename a nível label.
- `src/components/CategoriaProdutoModal.jsx` — create/rename a categoria, with the mandatory pre-save immutability warning on create.
- `src/pages/CategoriasProduto.jsx` (+ `.css`) — admin-only screen: Níveis section + Categorias section (grouped by nível).
- `src/components/ProductModal.test.js` — payload/validation tests for the fixed modal.
- `src/pages/Produtos.test.js` — `temSku` badge-logic test.

Modified files:
- `src/config/access.js` (+ `.test.js`) — `ACTIONS.CATEGORIZAR_PRODUTO` (admin+estoquista), `/configuracoes/categorias` (admin).
- `src/services/produtos.js` — add `categorizarProduto`.
- `src/components/ProductModal.jsx` — drop `sku`/`categoria` fields, export `validar`/`montarPayload`, show SKU read-only in edit mode.
- `src/components/ProductModal.css` — add a shared `.modal-warning` style (reused by the three new/changed modals).
- `src/pages/Produtos.jsx` — remove the `categoria`-driven filter/badge, add "Sem SKU" badge, add a "Categorizar" action wired to `CategorizarProdutoModal`.
- `src/App.jsx` — map `/configuracoes/categorias` to `CategoriasProduto`.
- `src/pages/Configuracoes.jsx` — turn the "Categorias de produto" item into real navigation (only that one item; the rest of the mock stays untouched).

---

## Task 1: Services layer

**Files:**
- Create: `src/services/categorias.js`
- Create: `src/services/niveisCategoria.js`
- Modify: `src/services/produtos.js`

No dedicated tests — this codebase has none for its existing thin `apiFetch` wrapper services (`despesasFixas.js`, `contasPagar.js`, etc. are all untested); consistent with that convention.

- [ ] **Step 1: `src/services/categorias.js`**

```javascript
import { apiFetch } from './api';

export async function listarCategorias({ page = 1, pageSize = 100 } = {}) {
  const params = new URLSearchParams({ page, pageSize });
  const body = await apiFetch(`/categorias?${params.toString()}`);
  return body.data;
}

export async function criarCategoria(dados) {
  const body = await apiFetch('/categorias', { method: 'POST', body: JSON.stringify(dados) });
  return body.data;
}

export async function atualizarCategoria(id, dados) {
  const body = await apiFetch(`/categorias/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
  return body.data;
}

export async function excluirCategoria(id) {
  const body = await apiFetch(`/categorias/${id}`, { method: 'DELETE' });
  return body.data;
}
```

- [ ] **Step 2: `src/services/niveisCategoria.js`**

```javascript
import { apiFetch } from './api';

export async function listarNiveisCategoria() {
  const body = await apiFetch('/niveis-categoria');
  return body.data;
}

export async function criarNivelCategoria(dados) {
  const body = await apiFetch('/niveis-categoria', { method: 'POST', body: JSON.stringify(dados) });
  return body.data;
}

export async function atualizarNivelCategoria(id, dados) {
  const body = await apiFetch(`/niveis-categoria/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
  return body.data;
}

export async function excluirNivelCategoria(id) {
  const body = await apiFetch(`/niveis-categoria/${id}`, { method: 'DELETE' });
  return body.data;
}
```

- [ ] **Step 3: add `categorizarProduto` to `src/services/produtos.js`**

Append after `atualizarProduto`:

```javascript
export async function categorizarProduto(id, categoriaIds) {
  const body = await apiFetch(`/produtos/${id}/categoria`, {
    method: 'PATCH',
    body: JSON.stringify({ categoria_ids: categoriaIds }),
  });
  return body.data;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/services/categorias.js src/services/niveisCategoria.js src/services/produtos.js
git commit -m "feat(categorias): services de categorias, niveis-categoria e categorizacao de produto"
```

---

## Task 2: `access.js` — new action and route

**Files:**
- Modify: `src/config/access.js`
- Modify: `src/config/access.test.js`

**Interfaces:**
- Produces: `ACTIONS.CATEGORIZAR_PRODUTO` (admin+estoquista), `ALLOWED_ROLES_BY_PATH['/configuracoes/categorias']` (admin only).

- [ ] **Step 1: Write the failing tests**

Append to `src/config/access.test.js`, inside existing `describe` blocks (or new ones):

```javascript
// inside describe('canAccessRoute', ...), add:
  it('restricts /configuracoes/categorias to admin only', () => {
    expect(canAccessRoute('/configuracoes/categorias', 'admin')).toBe(true);
    expect(canAccessRoute('/configuracoes/categorias', 'vendedor')).toBe(false);
    expect(canAccessRoute('/configuracoes/categorias', 'estoquista')).toBe(false);
  });
```

```javascript
// inside describe('podeExecutarAcao', ...), add:
  it('restricts CATEGORIZAR_PRODUTO to admin and estoquista', () => {
    expect(podeExecutarAcao('admin', ACTIONS.CATEGORIZAR_PRODUTO)).toBe(true);
    expect(podeExecutarAcao('estoquista', ACTIONS.CATEGORIZAR_PRODUTO)).toBe(true);
    expect(podeExecutarAcao('vendedor', ACTIONS.CATEGORIZAR_PRODUTO)).toBe(false);
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- access.test.js`
Expected: FAIL (`ACTIONS.CATEGORIZAR_PRODUTO` is `undefined`, `/configuracoes/categorias` not registered).

- [ ] **Step 3: Update `access.js`**

```javascript
export const ALLOWED_ROLES_BY_PATH = {
  '/': ['admin'],
  '/venda': ['admin', 'vendedor'],
  '/estoque': ['admin', 'estoquista'],
  '/produtos': ['admin', 'vendedor', 'estoquista'],
  '/produtos/:id/precos': ['admin'],
  '/clientes': ['admin', 'vendedor'],
  '/historico': ['admin', 'vendedor'],
  '/relatorios': ['admin'],
  '/contas-pagar': ['admin'],
  '/contas-receber': ['admin'],
  '/ponto-equilibrio': ['admin'],
  '/despesas-fixas': ['admin'],
  '/configuracoes': ['admin'],
  '/configuracoes/categorias': ['admin'],
};
```

```javascript
export const ACTIONS = {
  GERENCIAR_ESTOQUE: 'gerenciar_estoque',
  MOVIMENTAR_ESTOQUE: 'movimentar_estoque',
  CANCELAR_VENDA: 'cancelar_venda',
  GERENCIAR_PRECOS: 'gerenciar_precos',
  CATEGORIZAR_PRODUTO: 'categorizar_produto',
};

// Fail-closed: uma ação sem entrada aqui é negada, nunca permitida por omissão.
// MOVIMENTAR_ESTOQUE precisa bater com ALLOWED_ROLES_BY_PATH['/estoque'].
const ALLOWED_ROLES_BY_ACTION = {
  [ACTIONS.GERENCIAR_ESTOQUE]: ['admin'],
  [ACTIONS.MOVIMENTAR_ESTOQUE]: ['admin', 'estoquista'],
  [ACTIONS.CANCELAR_VENDA]: ['admin'],
  [ACTIONS.GERENCIAR_PRECOS]: ['admin'],
  [ACTIONS.CATEGORIZAR_PRODUTO]: ['admin', 'estoquista'],
};
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- access.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config/access.js src/config/access.test.js
git commit -m "feat(access): adiciona ACTIONS.CATEGORIZAR_PRODUTO e rota /configuracoes/categorias"
```

---

## Task 3: Fix `ProductModal.jsx` (the active bug)

**Files:**
- Modify: `src/components/ProductModal.jsx`
- Create: `src/components/ProductModal.test.js`

**Interfaces:**
- Produces: named exports `validar(form, mode, podeVerCusto)`, `montarPayload(form, mode)` (both now `sku`/`categoria`-free).

- [ ] **Step 1: Write the failing tests**

```javascript
import { describe, it, expect } from 'vitest';
import { validar, montarPayload } from './ProductModal.jsx';

const formBase = {
  nome: 'Anel Prata',
  descricao: '',
  unidade: 'UN',
  preco_venda: '49.9',
  custo: '20',
  estoque_atual: '10',
  estoque_minimo: '2',
  ativo: true,
};

describe('validar', () => {
  it('não exige mais SKU nem categoria — só nome e preço (e custo para quem pode ver)', () => {
    expect(validar(formBase, 'create', true)).toBe('');
  });

  it('continua exigindo nome', () => {
    expect(validar({ ...formBase, nome: '' }, 'create', true)).toBe('Nome é obrigatório');
  });

  it('continua exigindo preço de venda válido', () => {
    expect(validar({ ...formBase, preco_venda: '0' }, 'create', true)).toBe('Preço de venda deve ser maior que zero');
  });
});

describe('montarPayload', () => {
  it('nunca envia sku nem categoria — o bug que este modal corrige', () => {
    const payload = montarPayload(formBase, 'create');
    expect('sku' in payload).toBe(false);
    expect('categoria' in payload).toBe(false);
  });

  it('envia estoque_atual só no modo create', () => {
    expect('estoque_atual' in montarPayload(formBase, 'create')).toBe(true);
    expect('estoque_atual' in montarPayload(formBase, 'edit')).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- ProductModal.test.js`
Expected: FAIL (`validar`/`montarPayload` not exported yet, and current `validar` still requires `sku`).

- [ ] **Step 3: Rewrite `ProductModal.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { criarProduto, atualizarProduto } from '../services/produtos';
import { useAuth } from '../context/AuthContext';
import { FIELDS, podeVerCampo } from '../config/access';
import './ProductModal.css';

const EMPTY_FORM = {
  nome: '',
  descricao: '',
  unidade: 'UN',
  preco_venda: '',
  custo: '',
  estoque_atual: '',
  estoque_minimo: '',
  ativo: true,
};

function formFromProduto(produto) {
  if (!produto) return EMPTY_FORM;
  return {
    nome: produto.nome ?? '',
    descricao: produto.descricao ?? '',
    unidade: produto.unidade ?? 'UN',
    preco_venda: produto.preco_venda ?? '',
    custo: produto.custo ?? '',
    estoque_atual: produto.estoque_atual ?? '',
    estoque_minimo: produto.estoque_minimo ?? '',
    ativo: produto.ativo ?? true,
  };
}

export function validar(form, mode, podeVerCusto) {
  if (!form.nome.trim()) return 'Nome é obrigatório';

  const preco = Number(form.preco_venda);
  if (form.preco_venda === '' || Number.isNaN(preco) || preco <= 0) {
    return 'Preço de venda deve ser maior que zero';
  }

  if (podeVerCusto) {
    const custo = Number(form.custo);
    if (form.custo === '' || Number.isNaN(custo) || custo <= 0) {
      return 'Custo deve ser maior que zero';
    }
  }

  if (mode === 'create' && form.estoque_atual !== '') {
    const estoqueAtual = Number(form.estoque_atual);
    if (!Number.isInteger(estoqueAtual) || estoqueAtual < 0) {
      return 'Estoque atual inválido';
    }
  }

  if (form.estoque_minimo !== '') {
    const estoqueMinimo = Number(form.estoque_minimo);
    if (!Number.isInteger(estoqueMinimo) || estoqueMinimo < 0) {
      return 'Estoque mínimo inválido';
    }
  }

  return '';
}

export function montarPayload(form, mode) {
  const payload = {
    nome: form.nome.trim(),
    descricao: form.descricao.trim(),
    unidade: form.unidade,
    preco_venda: Number(form.preco_venda),
    custo: Number(form.custo),
    estoque_minimo: form.estoque_minimo === '' ? undefined : Number(form.estoque_minimo),
    ativo: form.ativo,
  };

  if (mode === 'create') {
    payload.estoque_atual = form.estoque_atual === '' ? undefined : Number(form.estoque_atual);
  }

  return payload;
}

export default function ProductModal({ open, mode = 'create', produto, onClose, onSaved }) {
  const { user } = useAuth();
  const podeVerCusto = podeVerCampo(user?.role, FIELDS.CUSTO);

  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(formFromProduto(produto));
      setError('');
      setSaving(false);
    }
  }, [open, produto]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const validationError = validar(form, mode, podeVerCusto);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSaving(true);
    try {
      const payload = montarPayload(form, mode);
      const produtoSalvo = mode === 'create'
        ? await criarProduto(payload)
        : await atualizarProduto(produto.id, payload);
      onSaved(produtoSalvo);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{mode === 'create' ? 'Novo Produto' : 'Editar Produto'}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {error && <div className="modal-error">{error}</div>}

            <div className="modal-form-grid">
              {mode === 'edit' && (
                <div className="input-wrapper">
                  <label className="input-label" htmlFor="pm-sku">SKU</label>
                  <input
                    id="pm-sku"
                    type="text"
                    className="input-field"
                    value={produto?.sku ?? '—'}
                    disabled
                  />
                  <span className="modal-field-hint">Gerado automaticamente ao categorizar o produto</span>
                </div>
              )}

              <div className="input-wrapper">
                <label className="input-label" htmlFor="pm-nome">Nome *</label>
                <input
                  id="pm-nome"
                  type="text"
                  className="input-field"
                  value={form.nome}
                  onChange={e => updateField('nome', e.target.value)}
                />
              </div>

              <div className="input-wrapper modal-form-span-2">
                <label className="input-label" htmlFor="pm-descricao">Descrição</label>
                <input
                  id="pm-descricao"
                  type="text"
                  className="input-field"
                  value={form.descricao}
                  onChange={e => updateField('descricao', e.target.value)}
                />
              </div>

              <div className="input-wrapper">
                <label className="input-label" htmlFor="pm-unidade">Unidade</label>
                <select
                  id="pm-unidade"
                  className="input-field"
                  value={form.unidade}
                  onChange={e => updateField('unidade', e.target.value)}
                >
                  <option value="UN">UN</option>
                  <option value="PAR">PAR</option>
                  <option value="CX">CX</option>
                  <option value="PCT">PCT</option>
                </select>
              </div>

              <div className="input-wrapper">
                <label className="input-label" htmlFor="pm-preco">Preço de venda *</label>
                <input
                  id="pm-preco"
                  type="number"
                  min="0"
                  step="0.01"
                  className="input-field"
                  value={form.preco_venda}
                  onChange={e => updateField('preco_venda', e.target.value)}
                />
              </div>

              {podeVerCusto && (
                <div className="input-wrapper">
                  <label className="input-label" htmlFor="pm-custo">Custo *</label>
                  <input
                    id="pm-custo"
                    type="number"
                    min="0"
                    step="0.01"
                    className="input-field"
                    value={form.custo}
                    onChange={e => updateField('custo', e.target.value)}
                  />
                </div>
              )}

              {mode === 'create' ? (
                <div className="input-wrapper">
                  <label className="input-label" htmlFor="pm-estoque-atual">Estoque inicial</label>
                  <input
                    id="pm-estoque-atual"
                    type="number"
                    min="0"
                    step="1"
                    className="input-field"
                    value={form.estoque_atual}
                    onChange={e => updateField('estoque_atual', e.target.value)}
                  />
                </div>
              ) : (
                <div className="input-wrapper">
                  <label className="input-label" htmlFor="pm-estoque-atual">Estoque atual</label>
                  <input
                    id="pm-estoque-atual"
                    type="number"
                    className="input-field"
                    value={produto?.estoque_atual ?? 0}
                    disabled
                  />
                  <span className="modal-field-hint">Ajuste o estoque pela tela de Estoque</span>
                </div>
              )}

              <div className="input-wrapper">
                <label className="input-label" htmlFor="pm-estoque-minimo">Estoque mínimo</label>
                <input
                  id="pm-estoque-minimo"
                  type="number"
                  min="0"
                  step="1"
                  className="input-field"
                  value={form.estoque_minimo}
                  onChange={e => updateField('estoque_minimo', e.target.value)}
                />
              </div>

              <label className="modal-checkbox-wrapper">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={e => updateField('ativo', e.target.checked)}
                />
                Produto ativo
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- ProductModal.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ProductModal.jsx src/components/ProductModal.test.js
git commit -m "fix(produtos): remove sku e categoria do formulario/payload de ProductModal"
```

---

## Task 4: `.modal-warning` shared style

**Files:**
- Modify: `src/components/ProductModal.css`

- [ ] **Step 1: Add the style**

Append to the file:

```css
.modal-warning {
  background: var(--color-warning-light);
  color: var(--color-warning);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-4);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ProductModal.css
git commit -m "style: adiciona .modal-warning compartilhado para avisos de imutabilidade/SKU"
```

---

## Task 5: `CategorizarProdutoModal.jsx`

**Files:**
- Create: `src/components/CategorizarProdutoModal.jsx`
- Create: `src/components/CategorizarProdutoModal.test.js`

**Interfaces:**
- Consumes: `listarCategorias` (Task 1), `listarNiveisCategoria` (Task 1), `categorizarProduto` (Task 1).
- Produces: named exports `agruparCategoriasPorNivel(categorias)`, `rotuloNivel(nivel, niveis)`, `selecaoInicial(categoriasDoProduto)`, `montarCategoriaIds(selecao)`.

- [ ] **Step 1: Write the failing tests**

```javascript
import { describe, it, expect } from 'vitest';
import {
  agruparCategoriasPorNivel,
  rotuloNivel,
  selecaoInicial,
  montarCategoriaIds,
} from './CategorizarProdutoModal.jsx';

describe('agruparCategoriasPorNivel', () => {
  it('agrupa por nivel e ordena os grupos ascendente', () => {
    const categorias = [
      { id: 3, nivel: 2, codigo: 'PR', nome: 'Prata' },
      { id: 1, nivel: 1, codigo: 'BR', nome: 'Brinco' },
      { id: 2, nivel: 1, codigo: 'CO', nome: 'Colar' },
    ];
    expect(agruparCategoriasPorNivel(categorias)).toEqual([
      { nivel: 1, categorias: [categorias[1], categorias[2]] },
      { nivel: 2, categorias: [categorias[0]] },
    ]);
  });

  it('retorna array vazio quando não há categorias — empresa ainda não cadastrou nenhuma', () => {
    expect(agruparCategoriasPorNivel([])).toEqual([]);
  });
});

describe('rotuloNivel', () => {
  it('usa o nome cadastrado quando existe', () => {
    expect(rotuloNivel(1, [{ nivel: 1, nome: 'Família' }])).toBe('Família');
  });

  it('cai para "Nível N" quando não há rótulo cadastrado — estado normal, não erro', () => {
    expect(rotuloNivel(2, [])).toBe('Nível 2');
    expect(rotuloNivel(3, [{ nivel: 1, nome: 'Família' }])).toBe('Nível 3');
  });
});

describe('selecaoInicial', () => {
  it('monta um mapa nivel -> categoria_id a partir das categorias já vinculadas ao produto', () => {
    expect(selecaoInicial([{ id: 5, nivel: 1 }, { id: 9, nivel: 2 }])).toEqual({ 1: 5, 2: 9 });
  });

  it('retorna objeto vazio quando o produto ainda não tem categorias', () => {
    expect(selecaoInicial(undefined)).toEqual({});
    expect(selecaoInicial([])).toEqual({});
  });
});

describe('montarCategoriaIds', () => {
  it('nunca produz dois ids para o mesmo nível — a seleção é estruturalmente um id por nível (um <select> por nível)', () => {
    const selecao = { 1: 5, 2: 9, 3: null };
    const ids = montarCategoriaIds(selecao);
    expect(ids).toEqual([5, 9]);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('ignora níveis sem seleção', () => {
    expect(montarCategoriaIds({ 1: null, 2: null })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- CategorizarProdutoModal.test.js`
Expected: FAIL (module doesn't exist yet).

- [ ] **Step 3: Write the component**

```jsx
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { listarCategorias } from '../services/categorias';
import { listarNiveisCategoria } from '../services/niveisCategoria';
import { categorizarProduto } from '../services/produtos';
import './ProductModal.css';

export function agruparCategoriasPorNivel(categorias) {
  const porNivel = new Map();
  for (const categoria of categorias) {
    if (!porNivel.has(categoria.nivel)) porNivel.set(categoria.nivel, []);
    porNivel.get(categoria.nivel).push(categoria);
  }
  return [...porNivel.entries()]
    .sort(([a], [b]) => a - b)
    .map(([nivel, itens]) => ({ nivel, categorias: itens }));
}

export function rotuloNivel(nivel, niveis) {
  const encontrado = niveis.find(n => n.nivel === nivel);
  return encontrado?.nome || `Nível ${nivel}`;
}

export function selecaoInicial(categoriasDoProduto = []) {
  const selecao = {};
  for (const categoria of categoriasDoProduto ?? []) {
    selecao[categoria.nivel] = categoria.id;
  }
  return selecao;
}

export function montarCategoriaIds(selecao) {
  return Object.values(selecao).filter(id => id != null);
}

export default function CategorizarProdutoModal({ open, produto, onClose, onSaved }) {
  const [categorias, setCategorias] = useState([]);
  const [niveis, setNiveis] = useState([]);
  const [selecao, setSelecao] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [categoriasResp, niveisResp] = await Promise.all([
          listarCategorias({ page: 1, pageSize: 100 }),
          listarNiveisCategoria(),
        ]);
        if (cancelled) return;
        setCategorias(categoriasResp.items);
        setNiveis(niveisResp);
        setSelecao(selecaoInicial(produto?.categorias));
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [open, produto]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const grupos = agruparCategoriasPorNivel(categorias);
  const jaTemSku = produto?.sku != null;

  function updateSelecao(nivel, value) {
    setSelecao(prev => ({ ...prev, [nivel]: value === '' ? null : Number(value) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const categoriaIds = montarCategoriaIds(selecao);
      const produtoSalvo = await categorizarProduto(produto.id, categoriaIds);
      onSaved(produtoSalvo);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Categorizar produto</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {error && <div className="modal-error">{error}</div>}

            {jaTemSku ? (
              <p className="modal-warning">
                Este produto já tem SKU (<strong>{produto.sku}</strong>). Alterar as categorias não muda o SKU já gerado.
              </p>
            ) : (
              <p className="modal-warning">
                O SKU será gerado a partir da combinação de categorias escolhida e não poderá ser alterado depois.
              </p>
            )}

            {loading && <p className="text-sm text-secondary">Carregando categorias...</p>}

            {!loading && grupos.length === 0 && (
              <p className="text-sm text-secondary">
                Nenhuma categoria cadastrada ainda. Um admin pode cadastrar categorias em Configurações → Categorias de produto.
              </p>
            )}

            {!loading && grupos.map(({ nivel, categorias: categoriasDoNivel }) => (
              <div className="input-wrapper" key={nivel} style={{ marginBottom: 'var(--space-3)' }}>
                <label className="input-label" htmlFor={`cpm-nivel-${nivel}`}>{rotuloNivel(nivel, niveis)}</label>
                <select
                  id={`cpm-nivel-${nivel}`}
                  className="input-field"
                  value={selecao[nivel] ?? ''}
                  onChange={e => updateSelecao(nivel, e.target.value)}
                >
                  <option value="">Nenhuma</option>
                  {categoriasDoNivel.map(c => (
                    <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || loading}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- CategorizarProdutoModal.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/CategorizarProdutoModal.jsx src/components/CategorizarProdutoModal.test.js
git commit -m "feat(produtos): modal de categorizacao com um seletor por nivel"
```

---

## Task 6: `Produtos.jsx` — Sem SKU badge, drop deprecated `categoria` UI, wire categorization

**Files:**
- Modify: `src/pages/Produtos.jsx`
- Create: `src/pages/Produtos.test.js`

**Interfaces:**
- Consumes: `CategorizarProdutoModal` (Task 5), `ACTIONS.CATEGORIZAR_PRODUTO`/`podeExecutarAcao` (Task 2).
- Produces: named export `temSku(produto)`.

- [ ] **Step 1: Write the failing test**

```javascript
import { describe, it, expect } from 'vitest';
import { temSku } from './Produtos.jsx';

describe('temSku', () => {
  it('retorna false quando sku é null — produto ainda não categorizado', () => {
    expect(temSku({ sku: null })).toBe(false);
  });

  it('retorna true quando sku já foi gerado', () => {
    expect(temSku({ sku: 'BR001' })).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- Produtos.test.js`
Expected: FAIL (`temSku` not exported).

- [ ] **Step 3: Rewrite `Produtos.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Tag, DollarSign, Edit, Trash2, Layers } from 'lucide-react';
import { listarProdutos, excluirProduto } from '../services/produtos';
import { useAuth } from '../context/AuthContext';
import { ACTIONS, podeExecutarAcao } from '../config/access';
import ProductModal from '../components/ProductModal';
import CategorizarProdutoModal from '../components/CategorizarProdutoModal';
import './Produtos.css';

const CARD_COLORS = ['#C9A96E', '#D4AF37', '#F5F0E8', '#C0C0C0', '#A70636', '#E8A0BF', '#FFD700', '#F4A7B9', '#B8860B'];

function colorForProduto(id) {
  return CARD_COLORS[id % CARD_COLORS.length];
}

export function temSku(produto) {
  return produto?.sku != null;
}

export default function Produtos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const podeGerenciar = podeExecutarAcao(user?.role, ACTIONS.GERENCIAR_ESTOQUE);
  const podeGerenciarPrecos = podeExecutarAcao(user?.role, ACTIONS.GERENCIAR_PRECOS);
  const podeCategorizar = podeExecutarAcao(user?.role, ACTIONS.CATEGORIZAR_PRODUTO);

  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingProduto, setEditingProduto] = useState(null);
  const [categorizarModalOpen, setCategorizarModalOpen] = useState(false);
  const [categorizandoProduto, setCategorizandoProduto] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await listarProdutos({ canal: 'loja_fisica' });
        if (!cancelled) setProdutos(data.items);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = produtos.filter(p => {
    const term = search.toLowerCase();
    return p.nome.toLowerCase().includes(term) || (p.sku ?? '').toLowerCase().includes(term);
  });

  async function handleDelete(id) {
    if (!window.confirm('Excluir este produto?')) return;
    setActionError('');
    try {
      await excluirProduto(id);
      setProdutos(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setActionError(err.message);
    }
  }

  function openCreateModal() {
    setModalMode('create');
    setEditingProduto(null);
    setModalOpen(true);
  }

  function openEditModal(produto) {
    setModalMode('edit');
    setEditingProduto(produto);
    setModalOpen(true);
  }

  function handleSaved(produtoSalvo) {
    setProdutos(prev => {
      if (modalMode === 'create') return [produtoSalvo, ...prev];
      return prev.map(p => (p.id === produtoSalvo.id ? produtoSalvo : p));
    });
    setModalOpen(false);
    setActionSuccess(modalMode === 'create' ? 'Produto criado com sucesso.' : 'Produto atualizado com sucesso.');
    setTimeout(() => setActionSuccess(''), 4000);
  }

  function openCategorizarModal(produto) {
    setCategorizandoProduto(produto);
    setCategorizarModalOpen(true);
  }

  function handleCategorizado(produtoSalvo) {
    setProdutos(prev => prev.map(p => (p.id === produtoSalvo.id ? produtoSalvo : p)));
    setCategorizarModalOpen(false);
    setActionSuccess('Categorias atualizadas com sucesso.');
    setTimeout(() => setActionSuccess(''), 4000);
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Produtos</h1>
          <p className="page-subtitle">{produtos.length} produtos cadastrados</p>
        </div>
        {podeGerenciar && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} />
            Novo Produto
          </button>
        )}
      </div>

      {actionError && (
        <p className="text-sm" style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-3)' }}>
          {actionError}
        </p>
      )}

      {actionSuccess && (
        <p className="text-sm" style={{ color: 'var(--color-success)', marginBottom: 'var(--space-3)' }}>
          {actionSuccess}
        </p>
      )}

      <div className="produtos-toolbar">
        <div className="input-icon-wrapper produtos-search">
          <Search size={16} className="input-icon" />
          <input
            type="text"
            className="input-field"
            placeholder="Buscar produto ou SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading && (
        <div className="empty-state">
          <p className="text-sm text-secondary">Carregando produtos...</p>
        </div>
      )}

      {!loading && error && (
        <div className="empty-state">
          <div className="empty-state-title">Não foi possível carregar os produtos</div>
          <p className="text-sm text-secondary">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="produtos-grid">
            {filtered.map(p => (
              <div key={p.id} className="produto-card card">
                <div
                  className="produto-card-image"
                  style={{ background: `linear-gradient(135deg, ${colorForProduto(p.id)}22, ${colorForProduto(p.id)}55)` }}
                >
                  <span style={{ color: colorForProduto(p.id), fontSize: 32, fontWeight: 800 }}>
                    {p.nome.split(' ').slice(0, 2).map(w => w[0]).join('')}
                  </span>
                  {p.estoque_atual <= 3 && (
                    <div className="produto-card-badge">
                      {p.estoque_atual === 0 ? (
                        <span className="badge badge-danger">Esgotado</span>
                      ) : (
                        <span className="badge badge-warning">Baixo</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="produto-card-body">
                  <div className="produto-card-top">
                    <span className="produto-sku">{p.sku || '—'}</span>
                    {!temSku(p) && <span className="badge badge-warning">Sem SKU</span>}
                  </div>
                  <h3 className="produto-name">{p.nome}</h3>
                  <div className="produto-card-footer">
                    <span className="produto-price">
                      {Number(p.preco_venda).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                    {(podeGerenciar || podeGerenciarPrecos || podeCategorizar) && (
                      <div className="produto-actions">
                        {podeGerenciarPrecos && (
                          <button
                            className="produto-action-btn"
                            aria-label="Precificação por canal"
                            title="Precificação por canal"
                            onClick={() => navigate(`/produtos/${p.id}/precos`, { state: { nome: p.nome, sku: p.sku, custo: p.custo } })}
                          >
                            <DollarSign size={14} />
                          </button>
                        )}
                        {podeCategorizar && (
                          <button
                            className="produto-action-btn"
                            aria-label="Categorizar produto"
                            title="Categorizar produto"
                            onClick={() => openCategorizarModal(p)}
                          >
                            <Layers size={14} />
                          </button>
                        )}
                        {podeGerenciar && (
                          <>
                            <button className="produto-action-btn" aria-label="Editar" onClick={() => openEditModal(p)}>
                              <Edit size={14} />
                            </button>
                            <button
                              className="produto-action-btn produto-action-btn--danger"
                              aria-label="Excluir"
                              onClick={() => handleDelete(p.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="produto-stock-info">
                    <Tag size={11} style={{ color: 'var(--color-text-muted)' }} />
                    <span>{p.estoque_atual} {p.unidade ?? 'UN'} em estoque</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon"><Tag size={24} /></div>
              <div className="empty-state-title">Nenhum produto encontrado</div>
              <p className="text-sm text-secondary">Tente outra busca ou adicione um novo produto</p>
            </div>
          )}
        </>
      )}

      <ProductModal
        open={modalOpen}
        mode={modalMode}
        produto={editingProduto}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />

      <CategorizarProdutoModal
        open={categorizarModalOpen}
        produto={categorizandoProduto}
        onClose={() => setCategorizarModalOpen(false)}
        onSaved={handleCategorizado}
      />
    </div>
  );
}
```

Note: the category filter pills (`activeCategory`, `categories`) are removed along with `matchCat` — they were driven entirely by the deprecated free-text `categoria` field (see Global Constraints).

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- Produtos.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Produtos.jsx src/pages/Produtos.test.js
git commit -m "feat(produtos): badge Sem SKU, acao de categorizar, remove filtro por categoria texto-livre"
```

---

## Task 7: `NivelCategoriaModal.jsx` and `CategoriaProdutoModal.jsx`

**Files:**
- Create: `src/components/NivelCategoriaModal.jsx`
- Create: `src/components/CategoriaProdutoModal.jsx`

No dedicated test files — matches this codebase's existing convention (`DespesaFixaModal.jsx`, `ContaPagarModal.jsx`, `ClienteModal.jsx` have no test files either; only components with genuinely reused pure logic get one, per Tasks 3, 5, 6).

- [ ] **Step 1: `src/components/NivelCategoriaModal.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { criarNivelCategoria, atualizarNivelCategoria } from '../services/niveisCategoria';
import './ProductModal.css';

function formVazio() {
  return { nivel: '', nome: '' };
}

function formFromNivel(nivel) {
  if (!nivel) return formVazio();
  return { nivel: String(nivel.nivel), nome: nivel.nome ?? '' };
}

function validar(form, mode) {
  if (mode === 'create') {
    const nivel = Number(form.nivel);
    if (form.nivel === '' || !Number.isInteger(nivel) || nivel <= 0) {
      return 'Nível deve ser um número inteiro positivo';
    }
  }
  if (!form.nome.trim()) return 'Nome é obrigatório';
  return '';
}

function montarPayload(form, mode) {
  if (mode === 'create') {
    return { nivel: Number(form.nivel), nome: form.nome.trim() };
  }
  return { nome: form.nome.trim() };
}

export default function NivelCategoriaModal({ open, mode = 'create', nivel, onClose, onSaved }) {
  const [form, setForm] = useState(formVazio);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(formFromNivel(nivel));
      setError('');
      setSaving(false);
    }
  }, [open, nivel]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const validationError = validar(form, mode);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSaving(true);
    try {
      const payload = montarPayload(form, mode);
      const salvo = mode === 'create'
        ? await criarNivelCategoria(payload)
        : await atualizarNivelCategoria(nivel.id, payload);
      onSaved(salvo);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{mode === 'create' ? 'Novo nível de categoria' : 'Renomear nível'}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {error && <div className="modal-error">{error}</div>}

            <p className="modal-field-hint" style={{ marginBottom: 'var(--space-4)' }}>
              Renomear é seguro — é só o rótulo de exibição, não afeta categorias nem SKUs existentes.
            </p>

            <div className="modal-form-grid">
              {mode === 'create' && (
                <div className="input-wrapper">
                  <label className="input-label" htmlFor="ncm-nivel">Nível *</label>
                  <input
                    id="ncm-nivel"
                    type="number"
                    min="1"
                    step="1"
                    className="input-field"
                    value={form.nivel}
                    onChange={e => updateField('nivel', e.target.value)}
                  />
                </div>
              )}

              <div className="input-wrapper modal-form-span-2">
                <label className="input-label" htmlFor="ncm-nome">Nome *</label>
                <input
                  id="ncm-nome"
                  type="text"
                  className="input-field"
                  placeholder="ex.: Família"
                  value={form.nome}
                  onChange={e => updateField('nome', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `src/components/CategoriaProdutoModal.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { criarCategoria, atualizarCategoria } from '../services/categorias';
import './ProductModal.css';

function formVazio() {
  return { nivel: '', codigo: '', nome: '' };
}

function formFromCategoria(categoria) {
  if (!categoria) return formVazio();
  return { nivel: String(categoria.nivel), codigo: categoria.codigo ?? '', nome: categoria.nome ?? '' };
}

function validar(form, mode) {
  if (mode === 'create') {
    const nivel = Number(form.nivel);
    if (form.nivel === '' || !Number.isInteger(nivel) || nivel <= 0) {
      return 'Nível deve ser um número inteiro positivo';
    }
    if (!/^[A-Za-z0-9]{1,3}$/.test(form.codigo.trim())) {
      return 'Código deve ter de 1 a 3 letras e/ou números';
    }
  }
  if (!form.nome.trim()) return 'Nome é obrigatório';
  return '';
}

function montarPayload(form, mode) {
  if (mode === 'create') {
    return { nivel: Number(form.nivel), codigo: form.codigo.trim(), nome: form.nome.trim() };
  }
  return { nome: form.nome.trim() };
}

export default function CategoriaProdutoModal({ open, mode = 'create', categoria, onClose, onSaved }) {
  const [form, setForm] = useState(formVazio);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(formFromCategoria(categoria));
      setError('');
      setSaving(false);
    }
  }, [open, categoria]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const validationError = validar(form, mode);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSaving(true);
    try {
      const payload = montarPayload(form, mode);
      const salva = mode === 'create'
        ? await criarCategoria(payload)
        : await atualizarCategoria(categoria.id, payload);
      onSaved(salva);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{mode === 'create' ? 'Nova categoria' : 'Renomear categoria'}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {error && <div className="modal-error">{error}</div>}

            {mode === 'create' && (
              <p className="modal-warning">
                Código e nível não podem ser alterados depois de criados — confira antes de salvar. A única correção possível depois é excluir e recriar a categoria.
              </p>
            )}

            <div className="modal-form-grid">
              {mode === 'create' ? (
                <>
                  <div className="input-wrapper">
                    <label className="input-label" htmlFor="cpm-nivel">Nível *</label>
                    <input
                      id="cpm-nivel"
                      type="number"
                      min="1"
                      step="1"
                      className="input-field"
                      value={form.nivel}
                      onChange={e => updateField('nivel', e.target.value)}
                    />
                  </div>

                  <div className="input-wrapper">
                    <label className="input-label" htmlFor="cpm-codigo">Código *</label>
                    <input
                      id="cpm-codigo"
                      type="text"
                      maxLength={3}
                      className="input-field"
                      placeholder="ex.: BR"
                      value={form.codigo}
                      onChange={e => updateField('codigo', e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <div className="input-wrapper modal-form-span-2">
                  <span className="input-label">Nível {categoria?.nivel} — código {categoria?.codigo} (fixos)</span>
                </div>
              )}

              <div className="input-wrapper modal-form-span-2">
                <label className="input-label" htmlFor="cpm-nome">Nome *</label>
                <input
                  id="cpm-nome"
                  type="text"
                  className="input-field"
                  placeholder="ex.: Brinco"
                  value={form.nome}
                  onChange={e => updateField('nome', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/NivelCategoriaModal.jsx src/components/CategoriaProdutoModal.jsx
git commit -m "feat(categorias): modais de CRUD para niveis e categorias de produto"
```

---

## Task 8: `CategoriasProduto.jsx` page

**Files:**
- Create: `src/pages/CategoriasProduto.jsx`
- Create: `src/pages/CategoriasProduto.css`

**Interfaces:**
- Consumes: `listarNiveisCategoria`/`excluirNivelCategoria`, `listarCategorias`/`excluirCategoria` (Task 1), `NivelCategoriaModal`, `CategoriaProdutoModal` (Task 7).

- [ ] **Step 1: `src/pages/CategoriasProduto.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, FolderTree } from 'lucide-react';
import { listarNiveisCategoria, excluirNivelCategoria } from '../services/niveisCategoria';
import { listarCategorias, excluirCategoria } from '../services/categorias';
import NivelCategoriaModal from '../components/NivelCategoriaModal';
import CategoriaProdutoModal from '../components/CategoriaProdutoModal';
import '../pages/Contas.css';
import './CategoriasProduto.css';

export default function CategoriasProduto() {
  const [niveis, setNiveis] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [workingId, setWorkingId] = useState(null);

  const [nivelModalOpen, setNivelModalOpen] = useState(false);
  const [nivelModalMode, setNivelModalMode] = useState('create');
  const [editingNivel, setEditingNivel] = useState(null);

  const [categoriaModalOpen, setCategoriaModalOpen] = useState(false);
  const [categoriaModalMode, setCategoriaModalMode] = useState('create');
  const [editingCategoria, setEditingCategoria] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [niveisData, categoriasData] = await Promise.all([
        listarNiveisCategoria(),
        listarCategorias({ page: 1, pageSize: 100 }),
      ]);
      setNiveis(niveisData);
      setCategorias(categoriasData.items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function rotuloNivel(nivel) {
    return niveis.find(n => n.nivel === nivel)?.nome || `Nível ${nivel}`;
  }

  function openCreateNivel() {
    setNivelModalMode('create');
    setEditingNivel(null);
    setNivelModalOpen(true);
  }

  function openEditNivel(nivel) {
    setNivelModalMode('edit');
    setEditingNivel(nivel);
    setNivelModalOpen(true);
  }

  function handleNivelSaved(nivelSalvo) {
    setNiveis(prev => {
      const proximos = nivelModalMode === 'create'
        ? [...prev, nivelSalvo]
        : prev.map(n => (n.id === nivelSalvo.id ? nivelSalvo : n));
      return [...proximos].sort((a, b) => a.nivel - b.nivel);
    });
    setNivelModalOpen(false);
    setActionSuccess(nivelModalMode === 'create' ? 'Nível criado com sucesso.' : 'Nível renomeado com sucesso.');
    setTimeout(() => setActionSuccess(''), 4000);
  }

  async function handleExcluirNivel(nivel) {
    if (!window.confirm(`Excluir o rótulo do nível ${nivel.nivel} (${nivel.nome})? Categorias existentes nesse nível não são afetadas.`)) return;

    setActionError('');
    setWorkingId(`nivel-${nivel.id}`);
    try {
      await excluirNivelCategoria(nivel.id);
      setNiveis(prev => prev.filter(n => n.id !== nivel.id));
      setActionSuccess('Rótulo de nível excluído.');
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setWorkingId(null);
    }
  }

  function openCreateCategoria() {
    setCategoriaModalMode('create');
    setEditingCategoria(null);
    setCategoriaModalOpen(true);
  }

  function openEditCategoria(categoria) {
    setCategoriaModalMode('edit');
    setEditingCategoria(categoria);
    setCategoriaModalOpen(true);
  }

  function handleCategoriaSaved(categoriaSalva) {
    setCategorias(prev => {
      if (categoriaModalMode === 'create') return [...prev, categoriaSalva];
      return prev.map(c => (c.id === categoriaSalva.id ? categoriaSalva : c));
    });
    setCategoriaModalOpen(false);
    setActionSuccess(categoriaModalMode === 'create' ? 'Categoria criada com sucesso.' : 'Categoria renomeada com sucesso.');
    setTimeout(() => setActionSuccess(''), 4000);
  }

  async function handleExcluirCategoria(categoria) {
    if (!window.confirm(`Excluir a categoria "${categoria.nome}"? Produtos e SKUs já existentes não são afetados.`)) return;

    setActionError('');
    setWorkingId(`categoria-${categoria.id}`);
    try {
      await excluirCategoria(categoria.id);
      setCategorias(prev => prev.filter(c => c.id !== categoria.id));
      setActionSuccess('Categoria excluída.');
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setWorkingId(null);
    }
  }

  const gruposCategorias = [...new Set(categorias.map(c => c.nivel))]
    .sort((a, b) => a - b)
    .map(nivel => ({ nivel, itens: categorias.filter(c => c.nivel === nivel) }));

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Categorias de produto</h1>
          <p className="page-subtitle">Níveis, códigos e nomes usados para gerar o SKU automaticamente</p>
        </div>
      </div>

      {actionError && (
        <p className="text-sm" style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-3)' }}>
          {actionError}
        </p>
      )}

      {actionSuccess && (
        <p className="text-sm" style={{ color: 'var(--color-success)', marginBottom: 'var(--space-3)' }}>
          {actionSuccess}
        </p>
      )}

      {loading && (
        <div className="empty-state">
          <p className="text-sm text-secondary">Carregando...</p>
        </div>
      )}

      {!loading && error && (
        <div className="empty-state">
          <div className="empty-state-title">Não foi possível carregar categorias</div>
          <p className="text-sm text-secondary">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="card categorias-produto-secao">
            <div className="categorias-produto-secao-header">
              <h2 className="categorias-produto-secao-title">Níveis</h2>
              <button className="btn btn-secondary" onClick={openCreateNivel}>
                <Plus size={16} />
                Novo nível
              </button>
            </div>
            <p className="text-sm text-secondary">
              Renomear é seguro — é só o rótulo de exibição. Excluir não afeta categorias nem SKUs já existentes.
            </p>

            {niveis.length === 0 ? (
              <p className="text-sm text-secondary">Nenhum nível nomeado ainda — categorias aparecem como "Nível N" até serem nomeadas.</p>
            ) : (
              <table className="contas-table">
                <thead>
                  <tr>
                    <th>Nível</th>
                    <th>Nome</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {niveis.map(nivel => (
                    <tr key={nivel.id} className="contas-row">
                      <td>{nivel.nivel}</td>
                      <td>{nivel.nome}</td>
                      <td>
                        <div className="contas-actions">
                          <button
                            className="contas-action-btn"
                            aria-label="Renomear"
                            title="Renomear"
                            disabled={workingId === `nivel-${nivel.id}`}
                            onClick={() => openEditNivel(nivel)}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            className="contas-action-btn contas-action-btn--danger"
                            aria-label="Excluir"
                            title="Excluir"
                            disabled={workingId === `nivel-${nivel.id}`}
                            onClick={() => handleExcluirNivel(nivel)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card categorias-produto-secao">
            <div className="categorias-produto-secao-header">
              <h2 className="categorias-produto-secao-title">Categorias</h2>
              <button className="btn btn-secondary" onClick={openCreateCategoria}>
                <Plus size={16} />
                Nova categoria
              </button>
            </div>

            {gruposCategorias.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon"><FolderTree size={24} /></div>
                <div className="empty-state-title">Nenhuma categoria cadastrada</div>
                <p className="text-sm text-secondary">Produtos sem categoria ficam sem SKU até serem categorizados.</p>
              </div>
            )}

            {gruposCategorias.map(({ nivel, itens }) => (
              <div key={nivel} className="categorias-produto-grupo">
                <h3 className="categorias-produto-grupo-title">{rotuloNivel(nivel)}</h3>
                <table className="contas-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Nome</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map(categoria => (
                      <tr key={categoria.id} className="contas-row">
                        <td>{categoria.codigo}</td>
                        <td>{categoria.nome}</td>
                        <td>
                          <div className="contas-actions">
                            <button
                              className="contas-action-btn"
                              aria-label="Renomear"
                              title="Renomear"
                              disabled={workingId === `categoria-${categoria.id}`}
                              onClick={() => openEditCategoria(categoria)}
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              className="contas-action-btn contas-action-btn--danger"
                              aria-label="Excluir"
                              title="Excluir"
                              disabled={workingId === `categoria-${categoria.id}`}
                              onClick={() => handleExcluirCategoria(categoria)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </>
      )}

      <NivelCategoriaModal
        open={nivelModalOpen}
        mode={nivelModalMode}
        nivel={editingNivel}
        onClose={() => setNivelModalOpen(false)}
        onSaved={handleNivelSaved}
      />

      <CategoriaProdutoModal
        open={categoriaModalOpen}
        mode={categoriaModalMode}
        categoria={editingCategoria}
        onClose={() => setCategoriaModalOpen(false)}
        onSaved={handleCategoriaSaved}
      />
    </div>
  );
}
```

- [ ] **Step 2: `src/pages/CategoriasProduto.css`**

```css
.categorias-produto-secao {
  padding: var(--space-5) var(--space-6);
  margin-bottom: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.categorias-produto-secao-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.categorias-produto-secao-title {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text-primary);
}

.categorias-produto-grupo {
  margin-top: var(--space-4);
}

.categorias-produto-grupo-title {
  font-size: var(--font-size-md, 0.95rem);
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/CategoriasProduto.jsx src/pages/CategoriasProduto.css
git commit -m "feat(categorias): tela admin-only de CRUD de niveis e categorias de produto"
```

---

## Task 9: Wire the route (`App.jsx`) and real navigation (`Configuracoes.jsx`)

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/pages/Configuracoes.jsx`

- [ ] **Step 1: `App.jsx`**

```javascript
import CategoriasProduto from './pages/CategoriasProduto';
```

```javascript
const ROUTE_COMPONENTS = {
  '/': Dashboard,
  '/venda': Venda,
  '/estoque': Estoque,
  '/produtos': Produtos,
  '/produtos/:id/precos': PrecificacaoProduto,
  '/clientes': Clientes,
  '/historico': Historico,
  '/relatorios': Relatorios,
  '/contas-pagar': ContasPagar,
  '/contas-receber': ContasReceber,
  '/ponto-equilibrio': PontoEquilibrio,
  '/despesas-fixas': DespesasFixas,
  '/configuracoes': Configuracoes,
  '/configuracoes/categorias': CategoriasProduto,
};
```

- [ ] **Step 2: `Configuracoes.jsx` — only the "Categorias de produto" item becomes real navigation**

```jsx
import { useNavigate } from 'react-router-dom';
import { Bell, Lock, User, Palette, Globe, ChevronRight, FolderTree } from 'lucide-react';
import './Configuracoes.css';

const sections = [
  {
    title: 'Catálogo',
    icon: FolderTree,
    items: [
      { label: 'Categorias de produto', sub: 'Níveis, códigos e SKU automático', path: '/configuracoes/categorias' },
    ],
  },
  {
    title: 'Conta',
    icon: User,
    items: [
      { label: 'Perfil de usuário',     sub: 'Nome, foto e cargo' },
      { label: 'Segurança',             sub: 'Senha e autenticação' },
    ],
  },
  {
    title: 'Aparência',
    icon: Palette,
    items: [
      { label: 'Tema',                  sub: 'Claro, escuro ou automático' },
      { label: 'Idioma e região',       sub: 'Português (Brasil)' },
    ],
  },
  {
    title: 'Notificações',
    icon: Bell,
    items: [
      { label: 'Alertas de estoque',    sub: 'Notificações de estoque baixo' },
      { label: 'Resumo diário',         sub: 'Relatório por e-mail às 20h' },
    ],
  },
  {
    title: 'Empresa',
    icon: Globe,
    items: [
      { label: 'Dados da empresa',      sub: 'CNPJ, endereço e contato' },
      { label: 'Plano e assinatura',    sub: 'Pro — vence em 15/01/2027' },
    ],
  },
];

export default function Configuracoes() {
  const navigate = useNavigate();

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="page-subtitle">Gerencie sua conta e preferências</p>
        </div>
      </div>

      <div className="configuracoes-layout">
        <div className="configuracoes-sections">
          {sections.map(({ title, icon: Icon, items }) => (
            <div key={title} className="card">
              <div className="config-section-header">
                <div className="config-section-icon">
                  <Icon size={16} />
                </div>
                <span className="config-section-title">{title}</span>
              </div>
              <div className="config-items">
                {items.map((item, i) => (
                  <button
                    key={i}
                    className="config-item"
                    onClick={item.path ? () => navigate(item.path) : undefined}
                  >
                    <div className="config-item-info">
                      <div className="config-item-label">{item.label}</div>
                      <div className="config-item-sub">{item.sub}</div>
                    </div>
                    <ChevronRight size={16} className="config-item-arrow" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Profile card */}
        <div className="configuracoes-profile">
          <div className="card card-padding profile-card">
            <div className="profile-card-avatar">MS</div>
            <div className="profile-card-name">Maria Silva</div>
            <div className="profile-card-role"><span className="role-badge role-badge--admin">Administradora</span></div>
            <div className="profile-card-email">maria.silva@cherry.com.br</div>
            <button className="btn btn-secondary btn-full" style={{ marginTop: 'var(--space-4)' }}>
              <User size={15} />
              Editar perfil
            </button>
          </div>

          <div className="card card-padding plan-card">
            <div className="plan-card-header">
              <span className="plan-badge badge badge-primary">PRO</span>
              <span className="plan-card-title">Plano ativo</span>
            </div>
            <div className="plan-card-desc">
              Acesso completo a todos os módulos do sistema Cherry Semijoias
            </div>
            <div className="plan-card-expiry">
              Renova em <strong>15/01/2027</strong>
            </div>
            <button className="btn btn-ghost btn-full" style={{ marginTop: 'var(--space-3)' }}>
              Gerenciar plano
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run full suite + lint + build**

Run: `npm test`
Expected: PASS, no regressions in the 49 pre-existing tests, plus all new tests from Tasks 2/3/5/6.

Run: `npm run lint`
Expected: no new errors.

Run: `npm run build`
Expected: build succeeds (this is also what exercises the `access.js`/`App.jsx` agreement check at module-load time, since both files get bundled and evaluated).

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/pages/Configuracoes.jsx
git commit -m "feat(configuracoes): liga item Categorias de produto a rota real"
```

---

## Task 10: Final verification and wrap-up

- [ ] **Step 1: Confirm the checklist from the task brief**
  - `npm run lint`, `npm run build`, `npm test` passing (no regression in the 49 pre-existing tests).
  - `access.js` and `App.jsx` agree on `/configuracoes/categorias` (enforced at module load — Task 9 already covers this).
  - No `sku` or `categoria` sent in `POST`/`PUT /produtos` (Task 3 test asserts this directly).
  - Immutability warning for `codigo`/`nivel` present before saving a new categoria (Task 7, `CategoriaProdutoModal.jsx`).
  - No changes made to `cherry-backend`.
  - Work committed on its own branch (`feat/categorias-produto-frontend`, created from an up-to-date `master`); no push, no PR.

- [ ] **Step 2: Final summary to the user**

Report: what changed (files list), decisions made solo (the `Estoque.jsx`/`Venda.jsx`/`Produtos.jsx` free-text `categoria` scoping call — see Global Constraints), what was tested, and the final commit hash.

---

## Original request (verbatim brief this plan implements)

> Repo: cherry-frontend. O backend já está pronto e mergeado em master do cherry-backend (PRs #22 e #23) — nenhuma mudança de backend nesta tarefa. [...] ProductModal.jsx hoje exige o campo SKU [...] e envia sku no payload de POST /produtos. Mas o backend removeu sku do schema de criação [...] O mesmo vale para categoria (texto livre) [...]
>
> Escopo: 1) Corrigir ProductModal.jsx (remover SKU obrigatório e o campo, remover categoria texto-livre e seu envio; SKU somente-leitura na edição). 2) Atribuir categorias a um produto na tela de Produtos, um seletor por nível, PATCH /produtos/:id/categoria, visível só a quem pode categorizar (admin+estoquista) via ACTIONS, aviso de imutabilidade de SKU antes de salvar. 3) Badge "Sem SKU" no mesmo padrão visual já usado para "sem preço definido". 4) Tela nova /configuracoes/categorias, admin-only, registrada em ALLOWED_ROLES_BY_PATH e ROUTE_COMPONENTS, virando a primeira navegação real da maquete de Configurações (seção "Catálogo" > "Categorias de produto"), com CRUD de níveis e categorias e aviso obrigatório de imutabilidade de código/nível ao criar uma categoria. 5) Services novos categorias.js e niveisCategoria.js, e função de categorização em produtos.js.
>
> Testes: payload de criação sem sku e sem categoria, badge com sku === null, bloqueio de dois seletores no mesmo nível, ocultação dos controles de categorização para vendedor. Checklist: lint/build/test passando sem regressão nos 49 existentes, access.js/App.jsx concordando, nenhum envio de sku/categoria, aviso de imutabilidade presente, nenhuma mudança no backend, branch própria sem push/PR.
