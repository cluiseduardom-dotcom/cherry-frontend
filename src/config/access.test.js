import { describe, it, expect } from 'vitest';
import {
  ALLOWED_ROLES_BY_PATH,
  canAccessRoute,
  homeRouteForRole,
  FIELDS,
  ACTIONS,
  podeVerCampo,
  podeExecutarAcao,
} from './access';

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

describe('podeVerCampo', () => {
  it('allows admin to see custo', () => {
    expect(podeVerCampo('admin', FIELDS.CUSTO)).toBe(true);
  });

  it('denies vendedor and estoquista from seeing custo', () => {
    expect(podeVerCampo('vendedor', FIELDS.CUSTO)).toBe(false);
    expect(podeVerCampo('estoquista', FIELDS.CUSTO)).toBe(false);
  });

  it('denies an unregistered field (fail-closed default)', () => {
    expect(podeVerCampo('admin', 'campo-inexistente')).toBe(false);
  });

  it('denies access when role is undefined (unauthenticated)', () => {
    expect(podeVerCampo(undefined, FIELDS.CUSTO)).toBe(false);
  });
});

describe('podeExecutarAcao', () => {
  it('restricts GERENCIAR_ESTOQUE to admin', () => {
    expect(podeExecutarAcao('admin', ACTIONS.GERENCIAR_ESTOQUE)).toBe(true);
    expect(podeExecutarAcao('vendedor', ACTIONS.GERENCIAR_ESTOQUE)).toBe(false);
    expect(podeExecutarAcao('estoquista', ACTIONS.GERENCIAR_ESTOQUE)).toBe(false);
  });

  it('matches MOVIMENTAR_ESTOQUE to the /estoque route policy (admin or estoquista)', () => {
    expect(podeExecutarAcao('admin', ACTIONS.MOVIMENTAR_ESTOQUE)).toBe(true);
    expect(podeExecutarAcao('estoquista', ACTIONS.MOVIMENTAR_ESTOQUE)).toBe(true);
    expect(podeExecutarAcao('vendedor', ACTIONS.MOVIMENTAR_ESTOQUE)).toBe(false);
  });

  it('restricts CANCELAR_VENDA to admin', () => {
    expect(podeExecutarAcao('admin', ACTIONS.CANCELAR_VENDA)).toBe(true);
    expect(podeExecutarAcao('vendedor', ACTIONS.CANCELAR_VENDA)).toBe(false);
    expect(podeExecutarAcao('estoquista', ACTIONS.CANCELAR_VENDA)).toBe(false);
  });

  it('denies an unregistered action (fail-closed default)', () => {
    expect(podeExecutarAcao('admin', 'acao-inexistente')).toBe(false);
  });

  it('denies access when role is undefined (unauthenticated)', () => {
    expect(podeExecutarAcao(undefined, ACTIONS.MOVIMENTAR_ESTOQUE)).toBe(false);
  });
});
