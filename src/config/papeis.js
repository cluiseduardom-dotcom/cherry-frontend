// Rótulos de apresentação dos papéis de usuário (o RBAC em si fica em access.js).
export const ROLE_LABEL = {
  admin: 'Administrador(a)',
  vendedor: 'Vendedor(a)',
  estoquista: 'Estoquista',
};

// Nome do cargo como o usuário o conhece (o `role` acima é só o perfil de acesso: um Analista
// financeiro tem perfil "vendedor"). Admin (por cargo ou por concessão) aparece como Administrador(a).
export const CARGO_LABEL = {
  admin: 'Administrador(a)',
  diretor: 'Diretor(a)',
  gerente: 'Gerente',
  coordenador: 'Coordenador(a)',
  supervisor: 'Supervisor(a)',
  analista: 'Analista',
  vendedor: 'Vendedor(a)',
  operador: 'Operador(a)',
  auxiliar: 'Auxiliar',
  estoquista: 'Estoquista',
  faturista: 'Faturista',
  financeiro: 'Analista financeiro',
};

export function rotuloDoUsuario(user) {
  if (!user) return '';
  if (user.role === 'admin') return ROLE_LABEL.admin;
  return CARGO_LABEL[user.cargo] || ROLE_LABEL[user.role] || '';
}
