import { apiFetch } from './api';

export async function listarUsuarios() {
  const body = await apiFetch('/usuarios');
  return body.data;
}

export async function criarUsuario({ nome, email, senha, papel }) {
  const payload = {
    nome: String(nome).trim(),
    email: String(email).trim(),
    senha: String(senha),
    papel: String(papel).trim(),
  };

  const body = await apiFetch('/usuarios', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return body.data;
}

export async function alterarBloqueioUsuario(id, { bloqueado, motivo }) {
  const payload = {
    bloqueado: Boolean(bloqueado),
    motivo: String(motivo).trim(),
  };

  const body = await apiFetch(`/usuarios/${id}/bloqueio`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return body.data;
}

export async function listarEventosUsuarios({ page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  const body = await apiFetch(`/usuarios/eventos?${params.toString()}`);
  return body.data;
}
