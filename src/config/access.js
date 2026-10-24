export const HOME_ROUTE_BY_ROLE = {
  admin: '/',
  vendedor: '/venda',
  estoquista: '/estoque',
  faturista: '/mais',
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
  '/compras': ['admin', 'estoquista'],
  '/compras/:id': ['admin', 'estoquista'],
  '/compras/recebimentos': ['admin', 'estoquista'],
  '/compras/recebimentos/:id': ['admin', 'estoquista'],
  '/historico': ['admin', 'vendedor'],
  '/comissoes': ['admin', 'vendedor'],
  '/mais': ['admin', 'vendedor', 'estoquista', 'faturista'],
  '/relatorios': ['admin'],
  '/contas-pagar': ['admin'],
  '/contas-receber': ['admin'],
  '/ponto-equilibrio': ['admin'],
  '/despesas-fixas': ['admin'],
  '/configuracoes': ['admin'],
  '/configuracoes/categorias': ['admin'],
  '/configuracoes/sku': ['admin'],
};

export const REQUIRED_CAPABILITIES_BY_PATH = {
  '/cancelamentos': ['ver_cancelamentos'],
  '/configuracoes/cargos': ['gerir_cargos', 'conceder_admin'],
};

export function podeComCapacidade(userOrCapacidades, capacidadeOuCapacidades) {
  if (!userOrCapacidades || !capacidadeOuCapacidades) return false;

  let caps = [];
  let role = null;

  if (Array.isArray(userOrCapacidades)) {
    caps = userOrCapacidades;
  } else if (typeof userOrCapacidades === 'object') {
    caps = Array.isArray(userOrCapacidades.capacidades) ? userOrCapacidades.capacidades : [];
    role = userOrCapacidades.role || userOrCapacidades.perfil;
  } else if (typeof userOrCapacidades === 'string') {
    role = userOrCapacidades;
  }

  // Admin ou portador da capacidade 'administrador' tem todas as capacidades
  if (role === 'admin' || caps.includes('administrador')) {
    return true;
  }

  const requeridas = Array.isArray(capacidadeOuCapacidades)
    ? capacidadeOuCapacidades
    : [capacidadeOuCapacidades];

  return requeridas.some(cap => caps.includes(cap));
}

export function canAccessRoute(path, userOrRole) {
  if (!path || !userOrRole) return false;

  let role = null;
  let user = null;

  if (typeof userOrRole === 'object') {
    user = userOrRole;
    role = user.role || user.perfil;
  } else if (typeof userOrRole === 'string') {
    role = userOrRole;
  }

  const allowedRoles = ALLOWED_ROLES_BY_PATH[path];
  const requiredCaps = REQUIRED_CAPABILITIES_BY_PATH[path];

  // Rota não registrada em nenhuma das tabelas -> fail-closed
  if (!allowedRoles && !requiredCaps) {
    return false;
  }

  // Admin efetivo tem acesso a todas as rotas conhecidas
  if (role === 'admin' || (user && podeComCapacidade(user, 'administrador'))) {
    return true;
  }

  // Checagem tradicional por papel
  if (allowedRoles && role && allowedRoles.includes(role)) {
    return true;
  }

  // Checagem por capacidade da rota
  if (user && requiredCaps) {
    return podeComCapacidade(user, requiredCaps);
  }

  return false;
}

export const FIELDS = {
  CUSTO: 'custo',
};

const ALLOWED_ROLES_BY_FIELD = {
  [FIELDS.CUSTO]: ['admin'],
};

export const REQUIRED_CAPABILITIES_BY_FIELD = {
  [FIELDS.CUSTO]: ['ver_custos'],
};

export function podeVerCampo(userOrRole, field) {
  if (!userOrRole || !field) return false;

  const allowedRoles = ALLOWED_ROLES_BY_FIELD[field];
  const requiredCaps = REQUIRED_CAPABILITIES_BY_FIELD[field];

  if (!allowedRoles && !requiredCaps) {
    return false;
  }

  let role = null;
  let user = null;

  if (typeof userOrRole === 'object') {
    user = userOrRole;
    role = user.role || user.perfil;
  } else if (typeof userOrRole === 'string') {
    role = userOrRole;
  }

  if (role === 'admin' || (user && podeComCapacidade(user, 'administrador'))) {
    return true;
  }

  if (allowedRoles && role && allowedRoles.includes(role)) {
    return true;
  }

  if (user && requiredCaps && podeComCapacidade(user, requiredCaps)) {
    return true;
  }

  return false;
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

export const REQUIRED_CAPABILITIES_BY_ACTION = {
  [ACTIONS.CANCELAR_VENDA]: ['cancelar_venda'],
};

export function podeExecutarAcao(userOrRole, action) {
  if (!userOrRole || !action) return false;

  const allowedRoles = ALLOWED_ROLES_BY_ACTION[action];
  const requiredCaps = REQUIRED_CAPABILITIES_BY_ACTION[action];

  if (!allowedRoles && !requiredCaps) {
    return false;
  }

  let role = null;
  let user = null;

  if (typeof userOrRole === 'object') {
    user = userOrRole;
    role = user.role || user.perfil;
  } else if (typeof userOrRole === 'string') {
    role = userOrRole;
  }

  if (role === 'admin' || (user && podeComCapacidade(user, 'administrador'))) {
    return true;
  }

  if (allowedRoles && role && allowedRoles.includes(role)) {
    return true;
  }

  if (user && requiredCaps && podeComCapacidade(user, requiredCaps)) {
    return true;
  }

  return false;
}
