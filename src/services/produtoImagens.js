import { apiFetch } from './api';

// Contrato: backend docs/PRODUTO_IMAGENS_API.md (cherry-backend #145).
// Foto: { id, url, ordem, principal, content_type, tamanho_bytes }. url é null se o bucket ainda não tem base pública.

export async function listarImagens(produtoId) {
  const body = await apiFetch(`/produtos/${produtoId}/imagens`);
  return body.data;
}

export async function enviarImagem(produtoId, arquivo) {
  const formData = new FormData();
  formData.append('arquivo', arquivo, arquivo.name || 'foto');
  const body = await apiFetch(`/produtos/${produtoId}/imagens`, { method: 'POST', body: formData });
  return body.data;
}

export async function removerImagem(produtoId, imagemId) {
  const body = await apiFetch(`/produtos/${produtoId}/imagens/${imagemId}`, { method: 'DELETE' });
  return body.data;
}

export async function reordenarImagens(produtoId, ids) {
  const body = await apiFetch(`/produtos/${produtoId}/imagens/ordem`, {
    method: 'PUT',
    body: JSON.stringify({ ids }),
  });
  return body.data;
}
