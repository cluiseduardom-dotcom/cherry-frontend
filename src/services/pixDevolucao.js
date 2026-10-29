import { apiFetch } from './api';

// Devolução de Pix cobrado pelo Mercado Pago (só quem tem gerir_financeiro). Contrato: backend
// /pagamentos-gateway. Nunca traz taxa da plataforma nem ids do provedor.

function paginar({ page = 1, pageSize = 20 } = {}) {
  return new URLSearchParams({ limit: String(pageSize), offset: String((page - 1) * pageSize) }).toString();
}

// { items: [{ codigo, valor, criado_em, venda_id, situacao: 'sem_venda' | 'venda_cancelada' }], total, valor_total }
export async function listarPixADevolver(paginacao) {
  const body = await apiFetch(`/pagamentos-gateway/a-devolver?${paginar(paginacao)}`);
  return body.data;
}

// { items: [{ id, cobranca_codigo, valor, status, motivo, erro, solicitado_por_nome, criado_em }], total }
export async function listarDevolucoesPix(paginacao) {
  const body = await apiFetch(`/pagamentos-gateway/devolucoes?${paginar(paginacao)}`);
  return body.data;
}

// Devolve o valor integral. Resposta: { codigo, valor, status: 'concluida' | 'solicitada' }.
export async function devolverPix(codigo, { motivo }) {
  const body = await apiFetch(`/pagamentos-gateway/${encodeURIComponent(codigo)}/devolucao`, {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  });
  return body.data;
}
