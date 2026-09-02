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

export const FIELDS = {
  CUSTO: 'custo',
};

// Fail-closed: um campo sem entrada aqui é negado, nunca permitido por omissão.
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
};

// Fail-closed: uma ação sem entrada aqui é negada, nunca permitida por omissão.
// MOVIMENTAR_ESTOQUE precisa bater com ALLOWED_ROLES_BY_PATH['/estoque'].
const ALLOWED_ROLES_BY_ACTION = {
  [ACTIONS.GERENCIAR_ESTOQUE]: ['admin'],
  [ACTIONS.MOVIMENTAR_ESTOQUE]: ['admin', 'estoquista'],
  [ACTIONS.CANCELAR_VENDA]: ['admin'],
};

export function podeExecutarAcao(role, action) {
  const allowedRoles = ALLOWED_ROLES_BY_ACTION[action];
  return Boolean(allowedRoles) && allowedRoles.includes(role);
}
