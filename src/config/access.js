export const HOME_ROUTE_BY_ROLE = {
  admin: '/',
  vendedor: '/venda',
  estoquista: '/estoque',
};

export function homeRouteForRole(role) {
  return HOME_ROUTE_BY_ROLE[role] ?? '/login';
}

export const ALLOWED_ROLES_BY_PATH = {
  '/': ['admin'],
  '/venda': ['admin', 'vendedor'],
  '/estoque': ['admin', 'estoquista'],
  '/produtos': ['admin', 'vendedor', 'estoquista'],
  '/produtos/:id/precos': ['admin'],
  '/clientes': ['admin', 'vendedor'],
  '/fornecedores': ['admin', 'estoquista'],
  '/compras': ['admin'],
  '/historico': ['admin', 'vendedor'],
  '/mais': ['admin', 'vendedor', 'estoquista'],
  '/relatorios': ['admin'],
  '/contas-pagar': ['admin'],
  '/contas-receber': ['admin'],
  '/ponto-equilibrio': ['admin'],
  '/despesas-fixas': ['admin'],
  '/configuracoes': ['admin'],
  '/configuracoes/categorias': ['admin'],
  '/configuracoes/sku': ['admin'],
};

export function canAccessRoute(path, role) {
  const allowedRoles = ALLOWED_ROLES_BY_PATH[path];
  return Boolean(allowedRoles) && allowedRoles.includes(role);
}

export const FIELDS = {
  CUSTO: 'custo',
};

const ALLOWED_ROLES_BY_FIELD = {
  [FIELDS.CUSTO]: ['admin'],
};

export function podeVerCampo(role, field) {
  const allowedRoles = ALLOWED_ROLES_BY_FIELD[field];
  return Boolean(allowedRoles) && allowedRoles.includes(role);
}

export const ACTIONS = {
  GERENCIAR_ESTOQUE: 'gerenciar_estoque',
  MOVIMENTAR_ESTOQUE: 'movimentar_estoque',
  CANCELAR_VENDA: 'cancelar_venda',
  GERENCIAR_PRECOS: 'gerenciar_precos',
  CATEGORIZAR_PRODUTO: 'categorizar_produto',
};

const ALLOWED_ROLES_BY_ACTION = {
  [ACTIONS.GERENCIAR_ESTOQUE]: ['admin'],
  [ACTIONS.MOVIMENTAR_ESTOQUE]: ['admin', 'estoquista'],
  [ACTIONS.CANCELAR_VENDA]: ['admin'],
  [ACTIONS.GERENCIAR_PRECOS]: ['admin'],
  [ACTIONS.CATEGORIZAR_PRODUTO]: ['admin', 'estoquista'],
};

export function podeExecutarAcao(role, action) {
  const allowedRoles = ALLOWED_ROLES_BY_ACTION[action];
  return Boolean(allowedRoles) && allowedRoles.includes(role);
}
