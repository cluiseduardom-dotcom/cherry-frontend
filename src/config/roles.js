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
  '/relatorios': ['admin'],
  '/venda': ['admin', 'vendedor'],
  '/historico': ['admin', 'vendedor'],
  '/contas-pagar': ['admin'],
  '/contas-receber': ['admin'],
  '/ponto-equilibrio': ['admin'],
  '/despesas-fixas': ['admin'],
};

export function canAccessRoute(path, role) {
  const allowedRoles = ALLOWED_ROLES_BY_PATH[path];
  return !allowedRoles || allowedRoles.includes(role);
}
