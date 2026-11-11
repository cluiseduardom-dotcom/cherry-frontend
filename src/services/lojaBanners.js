import { apiFetch } from './api';

// Faixas (banners) rotativas da Home da loja. Contrato (backend, docs/LOJA_API.md, "Faixas (banners) rotativas da Home"):
//   GET    /loja-banners                     lista
//   POST   /loja-banners                     cria vazia e inativa (até 6 por empresa)
//   PATCH  /loja-banners/:id                 estrito: textos, fundo, usa_retrato, datas, ativo, ordem
//   PUT    /loja-banners/:id/imagem/:lado    multipart `arquivo` (esquerda | direita)
//   DELETE /loja-banners/:id/imagem/:lado    tira a imagem
//   DELETE /loja-banners/:id                 remove a faixa
export const CAMPOS_BANNER = ['ativo', 'usa_retrato', 'fundo', 'ordem', 'rotulo', 'titulo', 'destaque', 'subtitulo', 'botao_texto', 'link', 'rodape_texto', 'inicio_em', 'fim_em'];

export async function listarBanners() {
  const body = await apiFetch('/loja-banners');
  return body.data;
}

export async function criarBanner(dados = {}) {
  const body = await apiFetch('/loja-banners', { method: 'POST', body: JSON.stringify(dados) });
  return body.data;
}

// Só os campos que o backend aceita (o corpo é estrito: qualquer outro vira 400).
export async function atualizarBanner(id, dados) {
  const permitido = {};
  for (const campo of CAMPOS_BANNER) {
    if (campo in dados) permitido[campo] = dados[campo];
  }

  const body = await apiFetch(`/loja-banners/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(permitido) });
  return body.data;
}

export async function enviarImagemDoBanner(id, lado, arquivo) {
  const form = new FormData();
  form.append('arquivo', arquivo);

  const body = await apiFetch(`/loja-banners/${encodeURIComponent(id)}/imagem/${lado}`, { method: 'PUT', body: form });
  return body.data;
}

export async function removerImagemDoBanner(id, lado) {
  const body = await apiFetch(`/loja-banners/${encodeURIComponent(id)}/imagem/${lado}`, { method: 'DELETE' });
  return body.data;
}

export async function removerBanner(id) {
  const body = await apiFetch(`/loja-banners/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return body.data;
}
