# Access Control Seam — Stage 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the route-access gap in cherry-frontend (4 of 12 routes currently reachable by any authenticated role) by making `src/config/access.js` the single, fail-closed seam for route visibility, with `App.jsx`, `Sidebar.jsx`, and `BottomNav.jsx` all deriving from it instead of keeping their own hand-written lists.

**Architecture:** Rename `src/config/roles.js` → `src/config/access.js`, extend its route table to all 12 routes, and flip its default from fail-open to fail-closed. `App.jsx` stops hand-writing one `<Route>`/`<ProtectedRoute>` pair per path and instead generates all of them by iterating the registry against a local `path → component` map, throwing at load time if the two ever diverge. `Sidebar.jsx` and `BottomNav.jsx` keep their own icon/label/section metadata (presentation stays out of the access module) but filter their visible items through the same `canAccessRoute` function instead of a separately maintained list.

**Tech Stack:** React 19, react-router-dom 7, Vite 8. Adds `vitest` (new devDependency — this repo has no test runner today) for `access.js`'s pure-function tests only.

**Spec:** `docs/superpowers/specs/2026-09-01-access-control-seam.md`

## Global Constraints

- Fail-closed: a path or key with no registry entry is denied, never allowed by default.
- `access.js` never imports UI libraries (no `lucide-react`, no component references) — it exports data and pure functions only.
- `canAccessRoute` stays a plain function taking `role` explicitly — no hook, no context reach-in — so it stays testable without a DOM.
- Stage 1 only: no `canView`/`canPerform`, no `FIELDS`/`ACTIONS` constants, no changes to `podeGerenciar`/`podeMovimentar`/`podeCancelar`/`ProductModal.jsx`. That's stage 2, a separate plan.
- Test accounts (local dev, per `MAPA_CHERRY_ERP.md`): admin `ana@cherry.com` / `senha123`, vendedor `bruno@cherry.com` / `senha123`, estoquista `carla@cherry.com` / `senha123`.

---

## File Structure

- `src/config/access.js` — renamed from `roles.js`. Owns `HOME_ROUTE_BY_ROLE`/`homeRouteForRole` (unchanged), `ALLOWED_ROLES_BY_PATH` (extended to 12 routes), `canAccessRoute` (fail-closed).
- `src/config/access.test.js` — new. Pure-function tests for `canAccessRoute` and `homeRouteForRole`.
- `vitest.config.js` — new. Minimal, `environment: 'node'` (no JSX under test in stage 1).
- `src/App.jsx` — route generation from the registry, replacing 8 hand-written `<Route>` elements and 4 missing ones.
- `src/components/Sidebar.jsx` — local `NAV_META_BY_PATH` (icon/label/section) merged with the registry's paths at render time, replacing the hand-written `menuItems` array and its `.slice(0,5)`/`.slice(5)` split.
- `src/components/BottomNav.jsx` — filters its static item list through `canAccessRoute`.
- `src/components/ProtectedRoute.jsx`, `src/pages/Login.jsx` — import path only (`./config/roles` → `./config/access`).

---

### Task 1: Rename `roles.js` to `access.js`, extend the route matrix, flip to fail-closed, add vitest

**Files:**
- Create: `vitest.config.js`
- Modify: `package.json`
- Create: `src/config/access.test.js`
- Delete: `src/config/roles.js`
- Create: `src/config/access.js`
- Modify: `src/components/ProtectedRoute.jsx:3`
- Modify: `src/pages/Login.jsx:5`
- Modify: `src/components/Sidebar.jsx:19` (import path only — the metadata merge is Task 3)
- Modify: `src/App.jsx:4` (import path only — route generation is Task 2)

**Interfaces:**
- Produces: `canAccessRoute(path: string, role: string | undefined) => boolean`, `homeRouteForRole(role: string | undefined) => string`, `ALLOWED_ROLES_BY_PATH: Record<string, string[]>`, `HOME_ROUTE_BY_ROLE: Record<string, string>` — all exported from `src/config/access.js`. Task 2 and Task 3 both import from this path.

- [ ] **Step 1: Write the failing test file**

Create `src/config/access.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { ALLOWED_ROLES_BY_PATH, canAccessRoute, homeRouteForRole } from './access';

describe('canAccessRoute', () => {
  it('allows admin on every registered route', () => {
    for (const path of Object.keys(ALLOWED_ROLES_BY_PATH)) {
      expect(canAccessRoute(path, 'admin')).toBe(true);
    }
  });

  it('allows vendedor on venda, produtos, clientes, historico', () => {
    expect(canAccessRoute('/venda', 'vendedor')).toBe(true);
    expect(canAccessRoute('/produtos', 'vendedor')).toBe(true);
    expect(canAccessRoute('/clientes', 'vendedor')).toBe(true);
    expect(canAccessRoute('/historico', 'vendedor')).toBe(true);
  });

  it('denies vendedor on estoque, configuracoes, relatorios, and financeiro routes', () => {
    expect(canAccessRoute('/estoque', 'vendedor')).toBe(false);
    expect(canAccessRoute('/configuracoes', 'vendedor')).toBe(false);
    expect(canAccessRoute('/relatorios', 'vendedor')).toBe(false);
    expect(canAccessRoute('/contas-pagar', 'vendedor')).toBe(false);
    expect(canAccessRoute('/contas-receber', 'vendedor')).toBe(false);
    expect(canAccessRoute('/ponto-equilibrio', 'vendedor')).toBe(false);
    expect(canAccessRoute('/despesas-fixas', 'vendedor')).toBe(false);
  });

  it('allows estoquista on estoque and produtos', () => {
    expect(canAccessRoute('/estoque', 'estoquista')).toBe(true);
    expect(canAccessRoute('/produtos', 'estoquista')).toBe(true);
  });

  it('denies estoquista on clientes, configuracoes, and venda', () => {
    expect(canAccessRoute('/clientes', 'estoquista')).toBe(false);
    expect(canAccessRoute('/configuracoes', 'estoquista')).toBe(false);
    expect(canAccessRoute('/venda', 'estoquista')).toBe(false);
  });

  it('denies any role on an unregistered path (fail-closed default)', () => {
    expect(canAccessRoute('/rota-inexistente', 'admin')).toBe(false);
    expect(canAccessRoute('/rota-inexistente', 'vendedor')).toBe(false);
    expect(canAccessRoute('/rota-inexistente', undefined)).toBe(false);
  });

  it('denies access when role is undefined (unauthenticated)', () => {
    expect(canAccessRoute('/venda', undefined)).toBe(false);
  });
});

describe('homeRouteForRole', () => {
  it('maps each known role to its home route', () => {
    expect(homeRouteForRole('admin')).toBe('/');
    expect(homeRouteForRole('vendedor')).toBe('/venda');
    expect(homeRouteForRole('estoquista')).toBe('/estoque');
  });

  it('falls back to /login for an unknown role', () => {
    expect(homeRouteForRole('desconhecido')).toBe('/login');
    expect(homeRouteForRole(undefined)).toBe('/login');
  });
});
```

- [ ] **Step 2: Add vitest and a test script**

```bash
npm install -D vitest
```

Create `vitest.config.js`:

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run"
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `src/config/access.js` doesn't exist yet (`Cannot find module './access'` or equivalent).

- [ ] **Step 4: Rename and rewrite the module**

Delete `src/config/roles.js`, create `src/config/access.js`:

```js
export const HOME_ROUTE_BY_ROLE = {
  admin: '/',
  vendedor: '/venda',
  estoquista: '/estoque',
};

export function homeRouteForRole(role) {
  return HOME_ROUTE_BY_ROLE[role] ?? '/login';
}

// Fail-closed: um path sem entrada aqui é negado, nunca permitido por
// omissão. Toda rota precisa de uma entrada explícita.
export const ALLOWED_ROLES_BY_PATH = {
  '/': ['admin'],
  '/venda': ['admin', 'vendedor'],
  '/estoque': ['admin', 'estoquista'],
  '/produtos': ['admin', 'vendedor', 'estoquista'],
  '/clientes': ['admin', 'vendedor'],
  '/historico': ['admin', 'vendedor'],
  '/relatorios': ['admin'],
  '/contas-pagar': ['admin'],
  '/contas-receber': ['admin'],
  '/ponto-equilibrio': ['admin'],
  '/despesas-fixas': ['admin'],
  '/configuracoes': ['admin'],
};

export function canAccessRoute(path, role) {
  const allowedRoles = ALLOWED_ROLES_BY_PATH[path];
  return Boolean(allowedRoles) && allowedRoles.includes(role);
}
```

- [ ] **Step 5: Update the three importers that only need a path fix**

`src/components/ProtectedRoute.jsx:3` — change:
```js
import { homeRouteForRole } from '../config/roles';
```
to:
```js
import { homeRouteForRole } from '../config/access';
```

`src/pages/Login.jsx:5` — change:
```js
import { homeRouteForRole } from '../config/roles';
```
to:
```js
import { homeRouteForRole } from '../config/access';
```

`src/components/Sidebar.jsx:19` — change:
```js
import { canAccessRoute } from '../config/roles';
```
to:
```js
import { canAccessRoute } from '../config/access';
```
(Sidebar's deeper merge — pulling `ALLOWED_ROLES_BY_PATH` in and dropping its own `menuItems` — is Task 3. This step only keeps it compiling.)

`src/App.jsx:4` — change:
```js
import { homeRouteForRole, ALLOWED_ROLES_BY_PATH } from './config/roles';
```
to:
```js
import { homeRouteForRole, ALLOWED_ROLES_BY_PATH } from './config/access';
```
(App.jsx's route generation is Task 2. This step only keeps it compiling — the 4 previously-unprotected routes are still unwrapped after this task; that's fixed in Task 2.)

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, all cases in `access.test.js` green.

- [ ] **Step 7: Confirm nothing else broke**

Run: `npm run lint`
Expected: no new errors.

Run: `npm run build`
Expected: succeeds (App.jsx/Sidebar.jsx/ProtectedRoute.jsx/Login.jsx all resolve the new import path).

- [ ] **Step 8: Commit**

```bash
git add vitest.config.js package.json package-lock.json src/config/access.js src/config/access.test.js src/components/ProtectedRoute.jsx src/pages/Login.jsx src/components/Sidebar.jsx src/App.jsx
git status
```
(confirm `src/config/roles.js` shows as deleted, `src/config/access.js` as new)
```bash
git add -A src/config
git commit -m "feat(access): rename roles.js to access.js, extend route matrix, fail-closed default"
```

---

### Task 2: Generate `App.jsx`'s routes from the registry

**Files:**
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `canAccessRoute`, `ALLOWED_ROLES_BY_PATH`, `homeRouteForRole` from `src/config/access.js` (Task 1). `ProtectedRoute` from `src/components/ProtectedRoute.jsx` (unchanged, takes `allowedRoles?: string[]` and `children`).
- Produces: every path in `ALLOWED_ROLES_BY_PATH` is rendered inside `<ProtectedRoute allowedRoles={...}>` — no route reachable without going through the registry.

- [ ] **Step 1: Replace the hand-written route list with a generated one**

Replace the full contents of `src/App.jsx` with:

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { homeRouteForRole, ALLOWED_ROLES_BY_PATH } from './config/access';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Venda from './pages/Venda';
import Estoque from './pages/Estoque';
import Produtos from './pages/Produtos';
import Clientes from './pages/Clientes';
import Historico from './pages/Historico';
import Relatorios from './pages/Relatorios';
import Configuracoes from './pages/Configuracoes';
import ContasPagar from './pages/ContasPagar';
import ContasReceber from './pages/ContasReceber';
import PontoEquilibrio from './pages/PontoEquilibrio';
import DespesasFixas from './pages/DespesasFixas';

const ROUTE_COMPONENTS = {
  '/': Dashboard,
  '/venda': Venda,
  '/estoque': Estoque,
  '/produtos': Produtos,
  '/clientes': Clientes,
  '/historico': Historico,
  '/relatorios': Relatorios,
  '/contas-pagar': ContasPagar,
  '/contas-receber': ContasReceber,
  '/ponto-equilibrio': PontoEquilibrio,
  '/despesas-fixas': DespesasFixas,
  '/configuracoes': Configuracoes,
};

// access.js e ROUTE_COMPONENTS precisam concordar exatamente. Uma rota
// registrada sem componente mapeado (ou vice-versa) quebra o app no
// carregamento, em vez de silenciosamente não renderizar.
const registeredPaths = Object.keys(ALLOWED_ROLES_BY_PATH);
for (const path of registeredPaths) {
  if (!ROUTE_COMPONENTS[path]) {
    throw new Error(`access.js registra "${path}" mas nenhum componente foi mapeado em App.jsx`);
  }
}
for (const path of Object.keys(ROUTE_COMPONENTS)) {
  if (!ALLOWED_ROLES_BY_PATH[path]) {
    throw new Error(`App.jsx mapeia um componente para "${path}" mas access.js não registra essa rota`);
  }
}

function Fallback() {
  const { isAuthenticated, user } = useAuth();
  return <Navigate to={isAuthenticated ? homeRouteForRole(user.role) : '/login'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<Login />} />

      {/* Main app layout */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        {registeredPaths.map(path => {
          const Component = ROUTE_COMPONENTS[path];
          return (
            <Route
              key={path}
              path={path}
              element={
                <ProtectedRoute allowedRoles={ALLOWED_ROLES_BY_PATH[path]}>
                  <Component />
                </ProtectedRoute>
              }
            />
          );
        })}
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Fallback />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Run the existing test suite (regression check)**

Run: `npm test`
Expected: still PASS (this task doesn't touch `access.js`).

- [ ] **Step 3: Manual verification — this is the core deliverable of this task**

Run: `npm run dev`, open the app.

Log in as admin (`ana@cherry.com` / `senha123`): confirm all 12 routes are reachable both by clicking every Sidebar link and by typing each path directly in the URL bar (`/`, `/venda`, `/estoque`, `/produtos`, `/clientes`, `/historico`, `/relatorios`, `/contas-pagar`, `/contas-receber`, `/ponto-equilibrio`, `/despesas-fixas`, `/configuracoes`).

Log in as vendedor (`bruno@cherry.com` / `senha123`): confirm `/venda`, `/produtos`, `/clientes`, `/historico` are reachable; confirm typing `/estoque`, `/configuracoes`, `/relatorios`, `/contas-pagar`, `/contas-receber`, `/ponto-equilibrio`, `/despesas-fixas`, or `/` directly in the URL bar redirects to `/venda` (this is the actual bug fix — these routes were previously reachable).

Log in as estoquista (`carla@cherry.com` / `senha123`): confirm `/estoque`, `/produtos` are reachable; confirm typing every other path redirects to `/estoque`.

- [ ] **Step 4: Lint and build check**

Run: `npm run lint`
Expected: no new errors.

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat(access): generate App.jsx routes from access.js registry, close the 4 unprotected routes"
```

---

### Task 3: Merge Sidebar's menu list into the registry

**Files:**
- Modify: `src/components/Sidebar.jsx`

**Interfaces:**
- Consumes: `ALLOWED_ROLES_BY_PATH`, `canAccessRoute` from `src/config/access.js`.
- Produces: no new exports — `Sidebar` component behavior only. Section grouping (`'principal'` vs `'gestao'`) is local presentation data, not part of `access.js`.

- [ ] **Step 1: Replace the hand-written `menuItems` list with registry-derived items**

Replace `src/components/Sidebar.jsx` in full:

```jsx
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tag,
  Users,
  History,
  BarChart2,
  Settings,
  Cherry,
  LogOut,
  Wallet,
  HandCoins,
  Target,
  Receipt,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ALLOWED_ROLES_BY_PATH, canAccessRoute } from '../config/access';
import './Sidebar.css';

const ROLE_LABEL = {
  admin: 'Administrador(a)',
  vendedor: 'Vendedor(a)',
  estoquista: 'Estoquista',
};

function initials(name) {
  if (!name) return '';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('');
}

// Metadados de apresentação por rota — access.js decide quem pode ver
// cada path; aqui só decidimos como mostrar as rotas que o papel pode ver.
const NAV_META_BY_PATH = {
  '/':                 { icon: LayoutDashboard, label: 'Dashboard',           section: 'principal' },
  '/venda':            { icon: ShoppingCart,    label: 'Venda',               section: 'principal' },
  '/estoque':          { icon: Package,         label: 'Estoque',             section: 'principal' },
  '/produtos':         { icon: Tag,             label: 'Produtos',            section: 'principal' },
  '/clientes':         { icon: Users,           label: 'Clientes',            section: 'principal' },
  '/historico':        { icon: History,         label: 'Histórico',           section: 'gestao' },
  '/relatorios':       { icon: BarChart2,       label: 'Relatórios',          section: 'gestao' },
  '/contas-pagar':     { icon: Wallet,          label: 'Contas a Pagar',      section: 'gestao' },
  '/contas-receber':   { icon: HandCoins,       label: 'Contas a Receber',    section: 'gestao' },
  '/ponto-equilibrio': { icon: Target,          label: 'Ponto de Equilíbrio', section: 'gestao' },
  '/despesas-fixas':   { icon: Receipt,         label: 'Despesas Fixas',      section: 'gestao' },
  '/configuracoes':    { icon: Settings,        label: 'Configurações',       section: 'gestao' },
};

const menuItems = Object.keys(ALLOWED_ROLES_BY_PATH).map(path => ({ path, ...NAV_META_BY_PATH[path] }));

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const visibleItems = menuItems.filter(({ path }) => canAccessRoute(path, user?.role));
  const principalItems = visibleItems.filter(({ section }) => section === 'principal');
  const gestaoItems = visibleItems.filter(({ section }) => section === 'gestao');

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Cherry size={22} strokeWidth={2.2} />
        </div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-brand">Cherry</span>
          <span className="sidebar-logo-sub">SEMIJOIAS</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-nav-label">Menu Principal</div>
        {principalItems.map(({ icon: Icon, label, path }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? 'sidebar-nav-item--active' : ''}`
            }
          >
            <span className="sidebar-nav-icon">
              <Icon size={18} strokeWidth={2} />
            </span>
            <span className="sidebar-nav-label-text">{label}</span>
            {path === '/estoque' && (
              <span className="sidebar-nav-badge">3</span>
            )}
          </NavLink>
        ))}

        <div className="sidebar-nav-label" style={{ marginTop: 'var(--space-4)' }}>Gestão</div>
        {gestaoItems.map(({ icon: Icon, label, path }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? 'sidebar-nav-item--active' : ''}`
            }
          >
            <span className="sidebar-nav-icon">
              <Icon size={18} strokeWidth={2} />
            </span>
            <span className="sidebar-nav-label-text">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user-avatar">{initials(user?.nome)}</div>
        <div className="sidebar-user-info">
          <span className="sidebar-user-name">{user?.nome}</span>
          <span className={`role-badge role-badge--${user?.role}`}>{ROLE_LABEL[user?.role]}</span>
        </div>
        <button
          type="button"
          className="sidebar-logout-btn"
          onClick={handleLogout}
          aria-label="Sair"
          title="Sair"
        >
          <LogOut size={16} strokeWidth={2} />
        </button>
      </div>
    </aside>
  );
}
```

Note: `location` stays declared-but-unused, matching the file's existing (pre-existing, unrelated) state — not introduced or fixed by this task.

- [ ] **Step 2: Manual verification**

With `npm run dev` running, for each of the 3 test accounts, confirm the Sidebar shows exactly the links that account's row in the access matrix allows — no extra links, none missing — and that clicking each still navigates correctly with the active-state highlight working. Specifically check vendedor no longer sees "Estoque" or "Configurações" in the Sidebar, and estoquista no longer sees "Clientes" or "Configurações".

- [ ] **Step 3: Lint and build check**

Run: `npm run lint`
Expected: no new errors.

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/Sidebar.jsx
git commit -m "feat(access): derive Sidebar menu from access.js registry instead of a hand-kept list"
```

---

### Task 4: Filter `BottomNav`'s items by the same registry

**Files:**
- Modify: `src/components/BottomNav.jsx`

**Interfaces:**
- Consumes: `canAccessRoute` from `src/config/access.js`, `useAuth` from `src/context/AuthContext.jsx`.
- Produces: no new exports — `BottomNav` component behavior only.

- [ ] **Step 1: Filter the static item list**

Replace `src/components/BottomNav.jsx` in full:

```jsx
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  History,
  MoreHorizontal,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { canAccessRoute } from '../config/access';
import './BottomNav.css';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: ShoppingCart,    label: 'Venda',     path: '/venda' },
  { icon: Package,         label: 'Estoque',   path: '/estoque' },
  { icon: History,         label: 'Histórico', path: '/historico' },
  { icon: MoreHorizontal,  label: 'Mais',      path: '/mais' },
];

export default function BottomNav() {
  const { user } = useAuth();
  // '/mais' não é uma rota registrada em access.js (não existe em nenhum
  // lugar de App.jsx) — não é parte do modelo de acesso, então fica sempre
  // visível em vez de ser filtrada pelo fail-closed default.
  const visibleItems = navItems.filter(({ path }) => path === '/mais' || canAccessRoute(path, user?.role));

  return (
    <nav className="bottom-nav">
      {visibleItems.map(({ icon: Icon, label, path }) => (
        <NavLink
          key={path}
          to={path}
          end={path === '/'}
          className={({ isActive }) =>
            `bottom-nav-item ${isActive ? 'bottom-nav-item--active' : ''}`
          }
        >
          <span className="bottom-nav-icon">
            <Icon size={20} strokeWidth={2} />
          </span>
          <span className="bottom-nav-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Manual verification**

With `npm run dev` running, use the browser's device toolbar (mobile width) for each of the 3 test accounts and confirm the bottom nav only shows items that account's row in the access matrix allows, plus "Mais" always present. Specifically: vendedor should not see "Estoque" in the bottom nav.

- [ ] **Step 3: Lint and build check**

Run: `npm run lint`
Expected: no new errors.

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/BottomNav.jsx
git commit -m "fix(access): filter BottomNav items by role, closing the unfiltered /estoque tab"
```

---

### Task 5: Full stage-1 regression pass

**Files:**
- Modify: `MAPA_CHERRY_ERP.md` (status note only)

**Interfaces:**
- None — verification task, no new code.

- [ ] **Step 1: Full automated check**

```bash
npm test
npm run lint
npm run build
```
Expected: all three succeed.

- [ ] **Step 2: Full manual pass across all 3 roles**

For each of `ana@cherry.com`, `bruno@cherry.com`, `carla@cherry.com` (password `senha123`):
- Log in, confirm redirect lands on that role's home route (`/`, `/venda`, `/estoque` respectively).
- Walk every one of the 12 paths by typing it directly in the URL bar; confirm the result matches the access matrix in `docs/superpowers/specs/2026-09-01-access-control-seam.md` exactly (reachable vs. redirected home).
- Confirm Sidebar and BottomNav only ever display links that role can actually reach.

Log out, then attempt to visit a protected path (e.g. `/venda`) directly while unauthenticated: confirm redirect to `/login`.

- [ ] **Step 3: Update the project status doc**

In `MAPA_CHERRY_ERP.md`, under "## 6. Decisões de arquitetura e negócio já tomadas", add a bullet noting stage 1 is done and stage 2 is pending — follow the file's existing bullet style (see the "Bug corrigido" entry for the format/tone to match). State: `/estoque`, `/produtos`, `/clientes`, `/configuracoes` were previously reachable by any authenticated role (no `ProtectedRoute` wrapper, no registry entry); fixed by renaming `roles.js` to `access.js`, extending the route matrix to all 12 routes, flipping the default to fail-closed, and generating `App.jsx`'s routes from the registry so a forgotten registration breaks the build instead of silently opening a route. Note that field/action-level gating (`custo` field, `podeGerenciar`/`podeMovimentar`/`podeCancelar`) is stage 2, not yet done.

- [ ] **Step 4: Commit**

```bash
git add MAPA_CHERRY_ERP.md
git commit -m "docs: note access control seam stage 1 completion in MAPA_CHERRY_ERP.md"
```

---

## Self-Review

**Spec coverage:**
- Access matrix (spec §1) → Task 1, Step 4 table; verified in Task 2/Task 5 manual passes.
- Scope: one seam for route access (spec §2) → Task 1 (data), Task 2 (App.jsx consumption).
- Shape: `canAccessRoute` plain function (spec §3) → Task 1, Step 4 (unchanged signature, extended table).
- Layering: no UI imports in `access.js` (spec §4) → Task 1, Step 4 content has zero `lucide-react`/component imports; icons stay in Task 3/Task 4's files.
- Route generation with bidirectional throw (spec §5) → Task 2, Step 1.
- Rename to `access.js` (spec §6) → Task 1, Step 4.
- Testing scoped to `access.js` (spec §8) → Task 1, Steps 1–3, 6 (vitest, not a repo-wide harness).
- Staged migration, stage 1 boundary (spec §9) → Global Constraints explicitly excludes `canView`/`canPerform`/`FIELDS`/`ACTIONS`/the 3 booleans/`ProductModal.jsx`.
- BottomNav addendum (spec §10) → Task 4.
- Out-of-scope items (spec "Out of scope for stage 1") → none touched in any task; `Layout.jsx`'s `pageTitles` is not referenced anywhere in this plan.

**Placeholder scan:** none found — every step has literal code, exact file paths, and concrete manual-test instructions (specific accounts, specific paths, specific expected redirects).

**Type consistency:** `canAccessRoute(path, role)`, `homeRouteForRole(role)`, `ALLOWED_ROLES_BY_PATH` are used with identical names and shapes across Task 1 (defines), Task 2 (consumes for route generation + `Fallback`), Task 3 (consumes for Sidebar filtering), Task 4 (consumes `canAccessRoute` only). No signature drift between tasks.
