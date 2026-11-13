import { apiFetch } from './api';

// Seção comercial da página inicial da loja online (presentes por faixa de preço, últimas unidades e ajuda por WhatsApp).
// Contrato (backend, rota /loja-home-vendas; só admin e só com a funcionalidade `loja_online`):
//   GET /loja-home-vendas   { home_vendas_ativo, home_*_titulo, home_*_texto } (textos nulos quando vazios)
//   PUT /loja-home-vendas   campo ausente não muda; texto vazio limpa (a loja usa o texto padrão)
export const CAMPOS_HOME_VENDAS = [
  'home_vendas_ativo',
  'home_presentes_titulo', 'home_presentes_texto',
  'home_ultimas_titulo', 'home_ultimas_texto',
  'home_ajuda_titulo', 'home_ajuda_texto',
];

export async function buscarHomeVendas() {
  const body = await apiFetch('/loja-home-vendas');
  return body.data;
}

export async function salvarHomeVendas(dados) {
  const permitido = {};
  for (const campo of CAMPOS_HOME_VENDAS) {
    if (campo in dados) permitido[campo] = dados[campo];
  }

  const body = await apiFetch('/loja-home-vendas', { method: 'PUT', body: JSON.stringify(permitido) });
  return body.data;
}
