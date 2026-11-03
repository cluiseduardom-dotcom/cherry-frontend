import { apiFetch } from './api';

// Privilégio de Admin (backend /privilegios, capacidade `conceder_admin`). Conceder e revogar exigem a SENHA de
// quem executa e um MOTIVO (mín. 5 caracteres); ambos vão para a auditoria. O backend decide tudo de novo.

// [{ id, nome, email, cargo, ativo, administrador, admin_concedido }]
// administrador: é Admin por qualquer via (cargo admin, cargo com a capacidade ou concessão individual).
// admin_concedido: tem concessão individual (só esta pode ser revogada aqui; a do cargo, não).
export async function listarAdminsPorUsuario() {
  const body = await apiFetch('/privilegios/usuarios');
  return body.data;
}

export async function concederAdmin(usuarioId, { senha, motivo }) {
  const body = await apiFetch(`/privilegios/usuarios/${encodeURIComponent(usuarioId)}/administrador`, {
    method: 'POST',
    body: JSON.stringify({ senha, motivo: String(motivo).trim() }),
  });
  return body.data;
}

export async function revogarAdmin(usuarioId, { senha, motivo }) {
  const body = await apiFetch(`/privilegios/usuarios/${encodeURIComponent(usuarioId)}/administrador/revogar`, {
    method: 'POST',
    body: JSON.stringify({ senha, motivo: String(motivo).trim() }),
  });
  return body.data;
}
