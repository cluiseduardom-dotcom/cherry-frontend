import { apiFetch } from './api';

// Pix cobrado pelo Mercado Pago no PDV (admin e vendedor). Contrato: backend /pagamentos-gateway.
// Resposta: { codigo, status, valor, qr_code, qr_code_base64, ticket_url, expira_em, expira_em_segundos, expirada }.
// Nunca traz a taxa da plataforma nem ids internos.
export async function criarCobrancaPix(valor) {
  const body = await apiFetch('/pagamentos-gateway/pix', {
    method: 'POST',
    body: JSON.stringify({ valor }),
  });
  return body.data;
}

// Antes de cobrar: { pix: boolean, motivo: null | 'nao_configurado' | 'loja_nao_conectada' }.
// Só o estado da integração; não consulta o Mercado Pago. Contrato: backend GET /pagamentos-gateway/disponibilidade.
export async function consultarDisponibilidadePix() {
  const body = await apiFetch('/pagamentos-gateway/disponibilidade');
  return body.data;
}

export async function consultarCobrancaPix(codigo) {
  const body = await apiFetch(`/pagamentos-gateway/${encodeURIComponent(codigo)}`);
  return body.data;
}

// Link de pagamento de cartão (crédito/débito, até 12x) pelo Mercado Pago. Contrato: backend POST /pagamentos-gateway/cartao.
// Resposta: { codigo, status, valor, metodo:'cartao_link', link_url, parcelas_maximas, expira_em, expira_em_segundos,
// expirada, tipo_cartao, parcelas }. `tipo_cartao` e `parcelas` só vêm preenchidos depois de pago (lidos do Mercado Pago).
export async function criarLinkCartao(valor) {
  const body = await apiFetch('/pagamentos-gateway/cartao', {
    method: 'POST',
    body: JSON.stringify({ valor }),
  });
  return body.data;
}
