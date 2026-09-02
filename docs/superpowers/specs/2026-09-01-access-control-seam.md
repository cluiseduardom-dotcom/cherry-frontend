# Access control seam — spec

**Status:** confirmed (grilling session, 2026-09-01). Stage 1 of 2 — this plan implements stage 1 only.

## Problem

`src/config/roles.js`'s `ALLOWED_ROLES_BY_PATH` covers 8 of 12 routes. `/estoque`, `/produtos`, `/clientes`, `/configuracoes` have no `ProtectedRoute` wrapper in `App.jsx` and no registry entry, so `canAccessRoute` treats them as open to any authenticated role (current default: `!allowedRoles || allowedRoles.includes(role)` → unregistered path is allowed). `Sidebar.jsx` keeps a second, hand-written `menuItems` list duplicating the same role-visibility fact. `BottomNav.jsx` keeps a third, unfiltered list. Page-level ad hoc booleans (`podeGerenciar`, `podeMovimentar`, `podeCancelar`) gate buttons locally instead of reading from one source. `ProductModal.jsx` renders the `custo` field with no role check at all (protected today only by its opening button being hidden) — the backend already strips `custo`/margin fields from every response reachable by `vendedor`, so this is not a live data leak, but it is a gap the frontend architecture doesn't structurally prevent from becoming one.

## Decisions (from grilling)

1. **Access matrix** (fail-closed: a path/key with no registry entry is denied, not allowed):

   | Route | admin | vendedor | estoquista |
   |---|---|---|---|
   | `/` | ✅ | | |
   | `/venda` | ✅ | ✅ | |
   | `/estoque` | ✅ | | ✅ |
   | `/produtos` | ✅ | ✅ | ✅ |
   | `/clientes` | ✅ | ✅ | |
   | `/historico` | ✅ | ✅ | |
   | `/relatorios` | ✅ | | |
   | `/contas-pagar` | ✅ | | |
   | `/contas-receber` | ✅ | | |
   | `/ponto-equilibrio` | ✅ | | |
   | `/despesas-fixas` | ✅ | | |
   | `/configuracoes` | ✅ | | |

2. **Scope**: one deepened module (renamed `roles.js` → `access.js`) is the single seam for route access, field visibility, and action permission, plus the pre-existing `HOME_ROUTE_BY_ROLE` redirect lookup (left as-is, same file, different concern).

3. **Shape** — three narrow, colocated functions over typed tables (not one stringly-typed lookup, not a per-role inversion):
   - `canAccessRoute(path, role)` — exists today; table extended to all 12 routes; default flips to deny.
   - `canView(role, fieldKey)` — stage 2.
   - `canPerform(role, actionKey)` — stage 2.
   - All three are plain functions taking `role` explicitly — no hook, no context reach-in — so they're testable as pure functions with no DOM.

4. **Layering**: `access.js` never imports UI (no `lucide-react`, no component references). Icon/label/section metadata for navigation stays local to `Sidebar.jsx` and `BottomNav.jsx`, keyed off the paths `access.js` defines.

5. **Route generation**: `App.jsx` builds its own `path → component` map and iterates `access.js`'s registered paths to render every route pre-wrapped in `ProtectedRoute`, instead of hand-writing a `<Route>`/`<ProtectedRoute>` pair per path. A path registered in `access.js` with no component mapped in `App.jsx` (or vice versa) throws at module load, in dev and prod alike — a forgotten registration becomes structurally impossible to miss rather than a silent gap.

6. **Naming**: `roles.js` → `access.js` (not `permissions.js` — that name nudges toward the rejected per-role-object shape).

7. **Key safety** (stage 2): `canView`/`canPerform` take exported constants (`FIELDS.PRODUTO_CUSTO`, `ACTIONS.PRODUTO_GERENCIAR`, …), not raw strings.

8. **Testing**: minimal `vitest` scoped to `access.js` only — not a repo-wide testing initiative. This repo has zero test infrastructure today; this is the first.

9. **Staged migration**:
   - **Stage 1** (this plan): route gaps closed, `Sidebar.jsx` and `BottomNav.jsx` both derive their visible items from `access.js` instead of hand-kept lists, rename + route generation, `canAccessRoute` test coverage. Pure addition — no behavior change for a role that already had legitimate access.
   - **Stage 2** (future, separate plan): `canView`/`canPerform` + `FIELDS`/`ACTIONS` constants; migrate `podeCancelar` (`Historico.jsx`), `podeMovimentar` (`Estoque.jsx`), `podeGerenciar` (`Produtos.jsx`), and add an explicit `canView` gate around `custo` in `ProductModal.jsx`.

10. **BottomNav addendum** (decided when stage 1 file scope was mapped, not part of the original 13 questions): `BottomNav.jsx`'s mobile nav is unfiltered today (shows `/estoque` to every role). Stage 1's fail-closed default turns that into a visible dead-end tab for roles without access, so `BottomNav.jsx` is in scope for the same `canAccessRoute` filtering as `Sidebar.jsx`. Its `/mais` item is not a registered route (no matching entry anywhere in `App.jsx`) and stays unconditionally visible — it isn't part of the access model, filtering it would be an unrelated behavior change.

## Out of scope for stage 1

- `canView`, `canPerform`, `FIELDS`, `ACTIONS` constants — stage 2.
- `podeGerenciar`, `podeMovimentar`, `podeCancelar`, and the `custo` field gate in `ProductModal.jsx` — stage 2.
- `Layout.jsx`'s `pageTitles` map — a different concern (display title, not access control), not touched.
- Any repo-wide test infrastructure beyond what `access.js`'s own tests need.
