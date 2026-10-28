import { apiFetch } from './api';

// Conexão da loja com o Mercado Pago (só admin da empresa). Contrato: backend /integracoes/mercadopago.
// Resposta de status: { configurado, conectado, conectado_em }. Tokens nunca chegam ao navegador.
export async function obterStatusMercadoPago() {
  const body = await apiFetch('/integracoes/mercadopago');
  return body.data;
}

// Devolve { url } da autorização do Mercado Pago; quem chama redireciona o navegador para ela.
export async function iniciarConexaoMercadoPago() {
  const body = await apiFetch('/integracoes/mercadopago/conectar', { method: 'POST' });
  return body.data;
}

export async function desconectarMercadoPago() {
  const body = await apiFetch('/integracoes/mercadopago', { method: 'DELETE' });
  return body.data;
}
