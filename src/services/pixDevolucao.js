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

// Cartão (link) pago sem venda ou de venda cancelada: só listagem; a devolução é feita no painel do Mercado Pago.
// { items: [{ codigo, valor, criado_em, venda_id, situacao, metodo: 'cartao_link', tipo_cartao, parcelas }], total, valor_total }
// Exige o backend com `metodo=cartao_link`; um backend antigo ignora o parâmetro e devolve Pix, por isso filtramos.
export async function listarCartaoSemVenda(paginacao) {
  const body = await apiFetch(`/pagamentos-gateway/a-devolver?${paginar(paginacao)}&metodo=cartao_link`);
  const items = (body.data?.items ?? []).filter(i => i.metodo === 'cartao_link');
  return { ...body.data, items };
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
