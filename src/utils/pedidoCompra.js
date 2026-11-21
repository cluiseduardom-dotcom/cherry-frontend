// Regras puras da tela de pedido de compra. O backend valida tudo de novo; aqui é só para guiar o preenchimento.

export const STATUS_PEDIDO = {
  RASCUNHO: { rotulo: 'Rascunho', badge: 'badge badge-warning' },
  PENDENTE_APROVACAO: { rotulo: 'Aguardando aprovação', badge: 'badge badge-warning' },
  APROVADO: { rotulo: 'Aprovado', badge: 'badge badge-info' },
  ENVIADO: { rotulo: 'Enviado ao fornecedor', badge: 'badge badge-info' },
  CONFIRMADO: { rotulo: 'Confirmado pelo fornecedor', badge: 'badge badge-info' },
  PARCIALMENTE_RECEBIDO: { rotulo: 'Recebido em parte', badge: 'badge badge-warning' },
  RECEBIDO: { rotulo: 'Recebido', badge: 'badge badge-success' },
  CANCELADO: { rotulo: 'Cancelado', badge: 'badge badge-danger' },
};

export const FILTROS_STATUS = ['RASCUNHO', 'ENVIADO', 'CONFIRMADO', 'PARCIALMENTE_RECEBIDO', 'RECEBIDO', 'CANCELADO'];

export const rotuloStatusPedido = (status) => STATUS_PEDIDO[status]?.rotulo || status;
export const badgeStatusPedido = (status) => STATUS_PEDIDO[status]?.badge || 'badge badge-warning';

// O que cada status permite. `receber` só enquanto houver saldo (conferido pela tela).
export function acoesDoPedido(status) {
  return {
    editar: status === 'RASCUNHO',
    enviar: status === 'RASCUNHO' || status === 'APROVADO',
    confirmar: status === 'ENVIADO',
    cancelar: ['RASCUNHO', 'PENDENTE_APROVACAO', 'APROVADO', 'ENVIADO', 'CONFIRMADO'].includes(status),
    receber: ['ENVIADO', 'CONFIRMADO', 'PARCIALMENTE_RECEBIDO'].includes(status),
  };
}

export function itemVazio() {
  return { produto_id: '', quantidade: 1, preco_unitario: '', desconto: '' };
}

export function formVazio() {
  return {
    fornecedor_id: '',
    data_prevista_entrega: '',
    prazo_pagamento_dias: '',
    forma_pagamento: '',
    frete_valor: '',
    desconto: '',
    outras_despesas: '',
    observacoes: '',
    itens: [itemVazio()],
  };
}

const num = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v));
const centavos = (v) => Math.round(num(v) * 100);

export function totalDoItem(item) {
  return Math.max(0, Math.round(num(item.quantidade) * num(item.preco_unitario) * 100) - centavos(item.desconto)) / 100;
}

// Mesma conta do backend: Σ(qtd × preço − desconto do item) − desconto + frete + outras despesas, nunca negativo.
export function totalDoPedido(form) {
  const itens = (form.itens || []).reduce((soma, i) => soma + Math.round(num(i.quantidade) * num(i.preco_unitario) * 100) - centavos(i.desconto), 0);
  return Math.max(0, itens - centavos(form.desconto) + centavos(form.frete_valor) + centavos(form.outras_despesas)) / 100;
}

// Devolve a primeira mensagem de erro ou null.
export function validarPedidoForm(form) {
  if (!form.fornecedor_id) return 'Escolha o fornecedor.';
  if (!form.itens.length) return 'Informe ao menos um item.';
  for (const [i, item] of form.itens.entries()) {
    const n = i + 1;
    if (!item.produto_id) return `Item ${n}: escolha o produto.`;
    if (!Number.isInteger(Number(item.quantidade)) || Number(item.quantidade) <= 0) return `Item ${n}: a quantidade deve ser um número inteiro maior que zero.`;
    if (item.preco_unitario === '' || !(Number(item.preco_unitario) >= 0)) return `Item ${n}: informe o preço unitário.`;
    if (num(item.desconto) < 0) return `Item ${n}: desconto inválido.`;
    if (num(item.desconto) > Number(item.quantidade) * Number(item.preco_unitario)) return `Item ${n}: o desconto não pode passar do valor do item.`;
  }
  for (const [campo, rotulo] of [['frete_valor', 'frete'], ['desconto', 'desconto'], ['outras_despesas', 'outras despesas']]) {
    if (num(form[campo]) < 0) return `Valor de ${rotulo} inválido.`;
  }
  if (form.prazo_pagamento_dias !== '' && (!Number.isInteger(Number(form.prazo_pagamento_dias)) || Number(form.prazo_pagamento_dias) < 0 || Number(form.prazo_pagamento_dias) > 365)) {
    return 'O prazo de pagamento deve ser de 0 a 365 dias.';
  }
  return null;
}

// Só envia o que foi preenchido e que o backend aceita (nunca empresa_id, status ou total).
export function montarCorpoPedido(form) {
  const corpo = {
    fornecedor_id: Number(form.fornecedor_id),
    itens: form.itens.map((i) => {
      const item = { produto_id: Number(i.produto_id), quantidade: Number(i.quantidade), preco_unitario: Number(i.preco_unitario) };
      if (num(i.desconto) > 0) item.desconto = Number(i.desconto);
      return item;
    }),
  };
  if (form.data_prevista_entrega) corpo.data_prevista_entrega = form.data_prevista_entrega;
  if (form.prazo_pagamento_dias !== '') corpo.prazo_pagamento_dias = Number(form.prazo_pagamento_dias);
  if (form.forma_pagamento) corpo.forma_pagamento = form.forma_pagamento;
  for (const campo of ['frete_valor', 'desconto', 'outras_despesas']) {
    if (num(form[campo]) > 0) corpo[campo] = Number(form[campo]);
  }
  if (form.observacoes.trim()) corpo.observacoes = form.observacoes.trim();
  return corpo;
}

export function formDoPedido(pedido) {
  const texto = (v) => (v === null || v === undefined || Number(v) === 0 ? '' : String(v));
  return {
    fornecedor_id: String(pedido.fornecedor_id),
    data_prevista_entrega: pedido.data_prevista_entrega || '',
    prazo_pagamento_dias: pedido.prazo_pagamento_dias === null || pedido.prazo_pagamento_dias === undefined ? '' : String(pedido.prazo_pagamento_dias),
    forma_pagamento: pedido.forma_pagamento || '',
    frete_valor: texto(pedido.frete_valor),
    desconto: texto(pedido.desconto),
    outras_despesas: texto(pedido.outras_despesas),
    observacoes: pedido.observacoes || '',
    itens: (pedido.itens || []).map((i) => ({
      produto_id: String(i.produto_id),
      quantidade: i.quantidade,
      preco_unitario: i.preco_unitario,
      desconto: texto(i.desconto),
    })),
  };
}

// Itens com saldo a receber, com a quantidade proposta = saldo.
export function itensARecever(pedido) {
  return (pedido?.itens || []).filter((i) => Number(i.saldo) > 0).map((i) => ({ ...i, quantidade_a_receber: Number(i.saldo) }));
}

// Valida as quantidades digitadas e monta os itens do recebimento. Devolve { erro } ou { itens }.
export function montarItensRecebimento(itens, quantidades) {
  const saida = [];
  for (const item of itens) {
    const bruto = quantidades[item.id] ?? item.quantidade_a_receber;
    if (bruto === '' || Number(bruto) === 0) continue;
    const q = Number(bruto);
    if (!Number.isInteger(q) || q < 0) return { erro: `${item.descricao_snapshot}: a quantidade deve ser um número inteiro.` };
    if (q > Number(item.saldo)) return { erro: `${item.descricao_snapshot}: faltam só ${item.saldo} a receber.` };
    saida.push({ pedido_compra_item_id: item.id, produto_id: item.produto_id, descricao_snapshot: item.descricao_snapshot, quantidade_recebida: q });
  }
  if (!saida.length) return { erro: 'Informe a quantidade recebida de ao menos um item.' };
  return { itens: saida };
}
