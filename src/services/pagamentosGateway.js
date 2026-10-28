import { apiFetch } from './api';

// Pix cobrado pelo Mercado Pago no PDV (admin e vendedor). Contrato: backend /pagamentos-gateway.
// Resposta: { codigo, status, valor, qr_code, qr_code_base64, ticket_url, expira_em, expirada }.
// Nunca traz a taxa da plataforma nem ids internos.
export async function criarCobrancaPix(valor) {
  const body = await apiFetch('/pagamentos-gateway/pix', {
    method: 'POST',
    body: JSON.stringify({ valor }),
  });
  return body.data;
}

export async function consultarCobrancaPix(codigo) {
  const body = await apiFetch(`/pagamentos-gateway/${encodeURIComponent(codigo)}`);
  return body.data;
}
