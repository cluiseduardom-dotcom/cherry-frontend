import { apiFetch } from './api';

// Contrato: backend docs/USUARIO_FOTOS_API.md. Resposta: { foto_url } (null = sem foto ou sem base pública).
// `/auth/foto` é a PRÓPRIA foto (qualquer cargo); `/usuarios/:id/foto` é a de outro usuário (gestor, mesma
// hierarquia da edição de dados). Arquivo: JPEG/PNG/WebP, até 2 MB, campo "arquivo".

function formulario(arquivo) {
  const formData = new FormData();
  formData.append('arquivo', arquivo, arquivo.name || 'perfil');
  return formData;
}

export async function enviarMinhaFoto(arquivo) {
  const body = await apiFetch('/auth/foto', { method: 'PUT', body: formulario(arquivo) });
  return body.data;
}

export async function removerMinhaFoto() {
  const body = await apiFetch('/auth/foto', { method: 'DELETE' });
  return body.data;
}

export async function enviarFotoUsuario(usuarioId, arquivo) {
  const body = await apiFetch(`/usuarios/${usuarioId}/foto`, { method: 'PUT', body: formulario(arquivo) });
  return body.data;
}

export async function removerFotoUsuario(usuarioId) {
  const body = await apiFetch(`/usuarios/${usuarioId}/foto`, { method: 'DELETE' });
  return body.data;
}
