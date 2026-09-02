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
