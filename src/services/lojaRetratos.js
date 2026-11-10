import { apiFetch } from './api';

// Retratos da abertura da Home da loja online. Contrato (backend, docs/LOJA_API.md, "Retratos da abertura"):
//   GET    /loja-retratos         lista (id, url, alt, nome, ordem, ativo, autorizacao_assinada, autorizado_por, autorizado_em)
//   POST   /loja-retratos         multipart: arquivo (+ alt, nome opcionais). Nasce inativo e sem autorização
//   PATCH  /loja-retratos/:id     alt, nome, ordem, ativo, autorizacao_assinada (estrito)
//   DELETE /loja-retratos/:id     remove da loja e do armazenamento
export async function listarRetratos() {
  const body = await apiFetch('/loja-retratos');
  return body.data;
}

export async function enviarRetrato(arquivo, { alt = '', nome = '' } = {}) {
  const form = new FormData();
  form.append('arquivo', arquivo);
  if (alt.trim()) form.append('alt', alt.trim());
  if (nome.trim()) form.append('nome', nome.trim());

  const body = await apiFetch('/loja-retratos', { method: 'POST', body: form });
  return body.data;
}

// Só os campos que o backend aceita (o corpo é estrito: qualquer outro vira 400).
export async function atualizarRetrato(id, dados) {
  const permitido = {};
  for (const campo of ['alt', 'nome', 'ordem', 'ativo', 'autorizacao_assinada']) {
    if (campo in dados) permitido[campo] = dados[campo];
  }

  const body = await apiFetch(`/loja-retratos/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(permitido) });
  return body.data;
}

export async function removerRetrato(id) {
  const body = await apiFetch(`/loja-retratos/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return body.data;
}
