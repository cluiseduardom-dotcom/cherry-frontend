import { describe, it, expect } from 'vitest';
import {
  ALLOWED_ROLES_BY_PATH,
  REQUIRED_CAPABILITIES_BY_PATH,
  canAccessRoute,
  rotaSoPlataforma,
  homeRouteForRole,
  podeComCapacidade,
  FIELDS,
  ACTIONS,
  podeVerCampo,
  podeExecutarAcao,
} from './access';

describe('rotas de transferência de estoque', () => {
  it('Transferências: admin e estoquista; vendedor não', () => {
    expect(canAccessRoute('/transferencias', 'admin')).toBe(true);
    expect(canAccessRoute('/transferencias', 'estoquista')).toBe(true);
    expect(canAccessRoute('/transferencias', 'vendedor')).toBe(false);
  });

  it('Minha maleta: só vendedor (e quem tem a capacidade de administrador)', () => {
    expect(canAccessRoute('/minha-maleta', 'vendedor')).toBe(true);
    expect(canAccessRoute('/minha-maleta', 'estoquista')).toBe(false);
    expect(canAccessRoute('/minha-maleta', 'faturista')).toBe(false);
  });
});

describe('rotas do operador da plataforma', () => {
  it('exigem a marca plataforma_admin: admin comum e quem tem a capacidade administrador não entram', () => {
    expect(canAccessRoute('/plataforma/taxas', 'admin')).toBe(false);
    expect(canAccessRoute('/plataforma/taxas', { role: 'admin' })).toBe(false);
    expect(canAccessRoute('/plataforma/taxas', { role: 'admin', plataforma_admin: false })).toBe(false);
    expect(canAccessRoute('/plataforma/taxas', { role: 'vendedor', capacidades: ['administrador'] })).toBe(false);
    expect(canAccessRoute('/plataforma/taxas', { role: 'vendedor', plataforma_admin: true })).toBe(false);
    expect(canAccessRoute('/plataforma/taxas', { role: 'admin', plataforma_admin: 'true' })).toBe(false);
  });

  it('liberam admin com a marca', () => {
    expect(canAccessRoute('/plataforma/taxas', { role: 'admin', plataforma_admin: true })).toBe(true);
    expect(canAccessRoute('/plataforma/empresas', { role: 'admin', plataforma_admin: true })).toBe(true);
  });

  it('planos e condições (/plataforma/empresas) também exigem a marca', () => {
    expect(canAccessRoute('/plataforma/empresas', 'admin')).toBe(false);
    expect(canAccessRoute('/plataforma/empresas', { role: 'admin', plataforma_admin: false })).toBe(false);
    expect(canAccessRoute('/plataforma/empresas', { role: 'vendedor', plataforma_admin: true })).toBe(false);
    expect(canAccessRoute('/plataforma/empresas', { role: 'vendedor', capacidades: ['administrador'] })).toBe(false);
    expect(rotaSoPlataforma('/plataforma/empresas')).toBe(true);
  });

  it('rotaSoPlataforma reconhece só as rotas de plataforma', () => {
    expect(rotaSoPlataforma('/plataforma/taxas')).toBe(true);
    expect(rotaSoPlataforma('/configuracoes/empresa')).toBe(false);
  });
});

describe('canAccessRoute', () => {
  it('allows admin on every registered route', () => {
    for (const path of Object.keys(ALLOWED_ROLES_BY_PATH).filter(p => !rotaSoPlataforma(p))) {
      expect(canAccessRoute(path, 'admin')).toBe(true);
      expect(canAccessRoute(path, { role: 'admin' })).toBe(true);
      expect(canAccessRoute(path, { perfil: 'admin' })).toBe(true);
      expect(canAccessRoute(path, { role: 'vendedor', capacidades: ['administrador'] })).toBe(true);
    }
  });

  it('allows vendedor on venda, produtos, clientes, historico, comissoes', () => {
    expect(canAccessRoute('/venda', 'vendedor')).toBe(true);
    expect(canAccessRoute('/produtos', 'vendedor')).toBe(true);
    expect(canAccessRoute('/clientes', 'vendedor')).toBe(true);
    expect(canAccessRoute('/historico', 'vendedor')).toBe(true);
    expect(canAccessRoute('/comissoes', 'vendedor')).toBe(true);
  });

  it('denies vendedor on estoque, configuracoes, relatorios, and financeiro routes', () => {
    expect(canAccessRoute('/estoque', 'vendedor')).toBe(false);
    expect(canAccessRoute('/configuracoes', 'vendedor')).toBe(false);
    expect(canAccessRoute('/relatorios', 'vendedor')).toBe(false);
    expect(canAccessRoute('/contas-pagar', 'vendedor')).toBe(false);
    expect(canAccessRoute('/contas-receber', 'vendedor')).toBe(false);
    expect(canAccessRoute('/ponto-equilibrio', 'vendedor')).toBe(false);
    expect(canAccessRoute('/despesas-fixas', 'vendedor')).toBe(false);
    expect(canAccessRoute('/usuarios', 'vendedor')).toBe(false);
  });

  it('allows estoquista on estoque, produtos, fornecedores and compras', () => {
    expect(canAccessRoute('/estoque', 'estoquista')).toBe(true);
    expect(canAccessRoute('/produtos', 'estoquista')).toBe(true);
    expect(canAccessRoute('/fornecedores', 'estoquista')).toBe(true);
    expect(canAccessRoute('/compras', 'estoquista')).toBe(true);
  });

  it('denies estoquista on clientes, configuracoes, venda, and comissoes', () => {
    expect(canAccessRoute('/clientes', 'estoquista')).toBe(false);
    expect(canAccessRoute('/configuracoes', 'estoquista')).toBe(false);
    expect(canAccessRoute('/venda', 'estoquista')).toBe(false);
    expect(canAccessRoute('/comissoes', 'estoquista')).toBe(false);
    expect(canAccessRoute('/usuarios', 'estoquista')).toBe(false);
  });

  it('denies vendedor on compras (matches backend requireEstoquista policy)', () => {
    expect(canAccessRoute('/compras', 'vendedor')).toBe(false);
  });

  it('restricts /produtos/:id/precos to admin only', () => {
    expect(canAccessRoute('/produtos/:id/precos', 'admin')).toBe(true);
    expect(canAccessRoute('/produtos/:id/precos', 'vendedor')).toBe(false);
    expect(canAccessRoute('/produtos/:id/precos', 'estoquista')).toBe(false);
  });

  it('allows admin and estoquista on /compras/:id, /compras/recebimentos and /compras/recebimentos/:id, matching /compras', () => {
    expect(canAccessRoute('/compras/:id', 'admin')).toBe(true);
    expect(canAccessRoute('/compras/:id', 'estoquista')).toBe(true);
    expect(canAccessRoute('/compras/:id', 'vendedor')).toBe(false);
    expect(canAccessRoute('/compras/recebimentos', 'admin')).toBe(true);
    expect(canAccessRoute('/compras/recebimentos', 'estoquista')).toBe(true);
    expect(canAccessRoute('/compras/recebimentos', 'vendedor')).toBe(false);
    expect(canAccessRoute('/compras/recebimentos/:id', 'admin')).toBe(true);
    expect(canAccessRoute('/compras/recebimentos/:id', 'estoquista')).toBe(true);
    expect(canAccessRoute('/compras/recebimentos/:id', 'vendedor')).toBe(false);
  });

  it('restricts /configuracoes/categorias to admin only', () => {
    expect(canAccessRoute('/configuracoes/categorias', 'admin')).toBe(true);
    expect(canAccessRoute('/configuracoes/categorias', 'vendedor')).toBe(false);
    expect(canAccessRoute('/configuracoes/categorias', 'estoquista')).toBe(false);
  });

  it('permits gerente (cargo gerente e perfil vendedor) on /historico', () => {
    const gerenteUser = { role: 'vendedor', perfil: 'vendedor', cargo: 'gerente' };
    expect(canAccessRoute('/historico', gerenteUser)).toBe(true);
    // O acesso vem do perfil legado (vendedor), não do nome do cargo: o nome do cargo sozinho não abre nada.
    expect(canAccessRoute('/historico', { role: 'gerente' })).toBe(false);
    expect(canAccessRoute('/historico', 'gerente')).toBe(false);
  });

  it('denies gerente without admin permission on admin-only routes', () => {
    const gerenteUser = { role: 'vendedor', perfil: 'vendedor', cargo: 'gerente' };
    expect(canAccessRoute('/relatorios', gerenteUser)).toBe(false);
    expect(canAccessRoute('/configuracoes', gerenteUser)).toBe(false);
  });

  it('allows faturista on safe route /mais and denies on unpermitted routes', () => {
    expect(canAccessRoute('/mais', 'faturista')).toBe(true);
    expect(canAccessRoute('/mais', { role: 'faturista', perfil: 'faturista' })).toBe(true);
    expect(canAccessRoute('/venda', 'faturista')).toBe(false);
    expect(canAccessRoute('/estoque', 'faturista')).toBe(false);
    expect(canAccessRoute('/relatorios', 'faturista')).toBe(false);
    expect(canAccessRoute('/comissoes', 'faturista')).toBe(false);
    expect(canAccessRoute('/usuarios', 'faturista')).toBe(false);
  });

  it('evaluates capability-based routes (/cancelamentos and /configuracoes/cargos)', () => {
    expect(REQUIRED_CAPABILITIES_BY_PATH['/cancelamentos']).toEqual(['ver_cancelamentos']);
    expect(REQUIRED_CAPABILITIES_BY_PATH['/configuracoes/cargos']).toEqual(['gerir_cargos', 'conceder_admin']);

    const userComCancelamento = { role: 'vendedor', capacidades: ['ver_cancelamentos'] };
    const userSemCancelamento = { role: 'vendedor', capacidades: [] };

    expect(canAccessRoute('/cancelamentos', userComCancelamento)).toBe(true);
    expect(canAccessRoute('/cancelamentos', userSemCancelamento)).toBe(false);
    expect(canAccessRoute('/cancelamentos', 'admin')).toBe(true);

    const userComGerirCargos = { role: 'vendedor', capacidades: ['gerir_cargos'] };
    const userComConcederAdmin = { role: 'vendedor', capacidades: ['conceder_admin'] };
    const userComOutraCapacidade = { role: 'vendedor', capacidades: ['ver_custos'] };

    expect(canAccessRoute('/configuracoes/cargos', userComGerirCargos)).toBe(true);
    expect(canAccessRoute('/configuracoes/cargos', userComConcederAdmin)).toBe(true);
    expect(canAccessRoute('/configuracoes/cargos', userComOutraCapacidade)).toBe(false);
    expect(canAccessRoute('/configuracoes/cargos', 'admin')).toBe(true);
  });

  it('evaluates access to /usuarios (admin or user with gerir_usuarios)', () => {
    expect(ALLOWED_ROLES_BY_PATH['/usuarios']).toEqual(['admin']);
    expect(REQUIRED_CAPABILITIES_BY_PATH['/usuarios']).toEqual(['gerir_usuarios']);

    expect(canAccessRoute('/usuarios', 'admin')).toBe(true);
    expect(canAccessRoute('/usuarios', { role: 'admin' })).toBe(true);

    const userGerente = { role: 'vendedor', cargo: 'gerente', capacidades: ['gerir_usuarios'] };
    expect(canAccessRoute('/usuarios', userGerente)).toBe(true);

    const userVendedorComum = { role: 'vendedor', cargo: 'vendedor', capacidades: [] };
    expect(canAccessRoute('/usuarios', userVendedorComum)).toBe(false);
    expect(canAccessRoute('/usuarios', 'vendedor')).toBe(false);
    expect(canAccessRoute('/usuarios', 'estoquista')).toBe(false);
    expect(canAccessRoute('/usuarios', 'faturista')).toBe(false);
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
    expect(homeRouteForRole('faturista')).toBe('/mais');
  });

  it('falls back to /login for an unknown role', () => {
    expect(homeRouteForRole('desconhecido')).toBe('/login');
    expect(homeRouteForRole(undefined)).toBe('/login');
  });
});

describe('podeComCapacidade', () => {
  it('returns true when user has specific capacity', () => {
    expect(podeComCapacidade({ capacidades: ['ver_custos'] }, 'ver_custos')).toBe(true);
    expect(podeComCapacidade(['ver_custos'], 'ver_custos')).toBe(true);
  });

  it('returns true when user has any of multiple required capacities', () => {
    const user = { capacidades: ['gerir_cargos'] };
    expect(podeComCapacidade(user, ['gerir_cargos', 'conceder_admin'])).toBe(true);
  });

  it('returns true when user has administrador capacity or admin role', () => {
    expect(podeComCapacidade({ capacidades: ['administrador'] }, 'qualquer_capacidade')).toBe(true);
    expect(podeComCapacidade({ role: 'admin' }, 'qualquer_capacidade')).toBe(true);
    expect(podeComCapacidade('admin', 'qualquer_capacidade')).toBe(true);
  });

  it('returns false when user lacks required capacity', () => {
    expect(podeComCapacidade({ capacidades: ['ver_custos'] }, 'cancelar_venda')).toBe(false);
    expect(podeComCapacidade([], 'cancelar_venda')).toBe(false);
  });

  it('returns false on missing inputs', () => {
    expect(podeComCapacidade(null, 'ver_custos')).toBe(false);
    expect(podeComCapacidade({ capacidades: ['ver_custos'] }, null)).toBe(false);
    expect(podeComCapacidade(undefined, undefined)).toBe(false);
  });
});

describe('podeVerCampo', () => {
  it('allows admin to see custo', () => {
    expect(podeVerCampo('admin', FIELDS.CUSTO)).toBe(true);
    expect(podeVerCampo({ role: 'admin' }, FIELDS.CUSTO)).toBe(true);
  });

  it('allows user with ver_custos or administrador to see custo', () => {
    expect(podeVerCampo({ role: 'vendedor', capacidades: ['ver_custos'] }, FIELDS.CUSTO)).toBe(true);
    expect(podeVerCampo({ role: 'vendedor', capacidades: ['administrador'] }, FIELDS.CUSTO)).toBe(true);
  });

  it('denies vendedor and estoquista without ver_custos from seeing custo', () => {
    expect(podeVerCampo('vendedor', FIELDS.CUSTO)).toBe(false);
    expect(podeVerCampo('estoquista', FIELDS.CUSTO)).toBe(false);
    expect(podeVerCampo({ role: 'vendedor', capacidades: [] }, FIELDS.CUSTO)).toBe(false);
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

  it('allows CANCELAR_VENDA to admin and users with cancelar_venda capability', () => {
    expect(podeExecutarAcao('admin', ACTIONS.CANCELAR_VENDA)).toBe(true);
    expect(podeExecutarAcao({ role: 'admin' }, ACTIONS.CANCELAR_VENDA)).toBe(true);
    expect(podeExecutarAcao({ role: 'vendedor', capacidades: ['cancelar_venda'] }, ACTIONS.CANCELAR_VENDA)).toBe(true);
    expect(podeExecutarAcao({ role: 'vendedor', capacidades: ['administrador'] }, ACTIONS.CANCELAR_VENDA)).toBe(true);
    expect(podeExecutarAcao('vendedor', ACTIONS.CANCELAR_VENDA)).toBe(false);
    expect(podeExecutarAcao('estoquista', ACTIONS.CANCELAR_VENDA)).toBe(false);
    expect(podeExecutarAcao({ role: 'vendedor', capacidades: [] }, ACTIONS.CANCELAR_VENDA)).toBe(false);
  });

  it('allows user with administrador capability to execute any valid action', () => {
    const adminCapUser = { role: 'vendedor', capacidades: ['administrador'] };
    expect(podeExecutarAcao(adminCapUser, ACTIONS.GERENCIAR_ESTOQUE)).toBe(true);
    expect(podeExecutarAcao(adminCapUser, ACTIONS.MOVIMENTAR_ESTOQUE)).toBe(true);
    expect(podeExecutarAcao(adminCapUser, ACTIONS.GERENCIAR_PRECOS)).toBe(true);
    expect(podeExecutarAcao(adminCapUser, ACTIONS.CATEGORIZAR_PRODUTO)).toBe(true);
  });

  it('restricts GERENCIAR_PRECOS to admin', () => {
    expect(podeExecutarAcao('admin', ACTIONS.GERENCIAR_PRECOS)).toBe(true);
    expect(podeExecutarAcao('vendedor', ACTIONS.GERENCIAR_PRECOS)).toBe(false);
    expect(podeExecutarAcao('estoquista', ACTIONS.GERENCIAR_PRECOS)).toBe(false);
  });

  it('restricts CATEGORIZAR_PRODUTO to admin and estoquista', () => {
    expect(podeExecutarAcao('admin', ACTIONS.CATEGORIZAR_PRODUTO)).toBe(true);
    expect(podeExecutarAcao('estoquista', ACTIONS.CATEGORIZAR_PRODUTO)).toBe(true);
    expect(podeExecutarAcao('vendedor', ACTIONS.CATEGORIZAR_PRODUTO)).toBe(false);
  });

  it('denies an unregistered action (fail-closed default)', () => {
    expect(podeExecutarAcao('admin', 'acao-inexistente')).toBe(false);
  });

  it('denies access when role is undefined (unauthenticated)', () => {
    expect(podeExecutarAcao(undefined, ACTIONS.MOVIMENTAR_ESTOQUE)).toBe(false);
  });
});
