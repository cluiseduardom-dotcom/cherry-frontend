import { apiFetch } from './api';

// Condições de venda da loja online (frete grátis acima de um valor, garantia, embalagem de presente).
// Contrato (backend, rota /loja-condicoes; só admin e só com a funcionalidade `loja_online`):
//   GET /loja-condicoes   { frete_gratis_acima (número ou null), garantia_texto, embalagem_presente_texto }
//   PUT /loja-condicoes   campo ausente não muda; vazio/null limpa (a loja deixa de mostrar)
export const CAMPOS_CONDICOES = ['frete_gratis_acima', 'garantia_texto', 'embalagem_presente_texto'];

export async function buscarCondicoes() {
  const body = await apiFetch('/loja-condicoes');
  return body.data;
}

export async function salvarCondicoes(dados) {
  const permitido = {};
  for (const campo of CAMPOS_CONDICOES) {
    if (campo in dados) permitido[campo] = dados[campo];
  }

  const body = await apiFetch('/loja-condicoes', { method: 'PUT', body: JSON.stringify(permitido) });
  return body.data;
}
