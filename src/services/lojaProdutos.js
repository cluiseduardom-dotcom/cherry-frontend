import { apiFetch } from './api';

// Marcação "mostrar na loja online" dos produtos. Contrato (backend, docs/LOJA_API.md):
//   GET /loja-produtos            lista os produtos acabados e ativos com a marcação (admin + funcionalidade loja_online)
//   GET /produtos/:id/loja        marcação de um produto
//   PUT /produtos/:id/loja        cria/atualiza: visivel, titulo, descricao, materiais, cuidados, ordem, carrossel_novidades
// Preço e estoque NÃO são editados aqui: o preço do canal online e o estoque continuam nas telas de sempre.
export async function listarProdutosDaLoja({ situacao = 'todos', busca = '', pagina = 1, limite = 20 } = {}) {
  const params = new URLSearchParams({ situacao, pagina: String(pagina), limite: String(limite) });
  const texto = typeof busca === 'string' ? busca.trim() : '';
  if (texto) params.set('busca', texto);

  const body = await apiFetch(`/loja-produtos?${params.toString()}`);
  return body.data;
}

export async function buscarMarcacaoDaLoja(produtoId) {
  const body = await apiFetch(`/produtos/${encodeURIComponent(produtoId)}/loja`);
  return body.data;
}

// Só os campos suportados pelo backend (o corpo é estrito: qualquer outro vira 400).
export async function salvarMarcacaoDaLoja(produtoId, dados) {
  const permitido = {};
  for (const campo of ['visivel', 'titulo', 'descricao', 'materiais', 'cuidados', 'ordem', 'carrossel_novidades']) {
    if (campo in dados) permitido[campo] = dados[campo];
  }

  const body = await apiFetch(`/produtos/${encodeURIComponent(produtoId)}/loja`, {
    method: 'PUT',
    body: JSON.stringify(permitido),
  });
  return body.data;
}

// Copia descrição e material do cadastro para as peças JÁ marcadas na loja que ainda estão sem esse texto.
// Nunca troca texto já escrito. Resposta: { atualizados }.
export async function preencherTextosDoCadastro() {
  const body = await apiFetch('/loja-produtos/preencher-do-cadastro', { method: 'POST' });
  return body.data;
}
