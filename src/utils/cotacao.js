// Regras puras da tela de cotação. O backend valida tudo de novo e decide a melhor oferta; aqui é só guiar o preenchimento
// e montar o que vai para a API. A escolha do fornecedor de cada item é sempre da pessoa (a melhor oferta é só sugestão).

export const STATUS_COTACAO = {
  ABERTA: { rotulo: 'Aberta', badge: 'badge badge-info' },
  EM_ANALISE: { rotulo: 'Em análise', badge: 'badge badge-info' },
  ENCERRADA: { rotulo: 'Pedidos gerados', badge: 'badge badge-success' },
  CANCELADA: { rotulo: 'Cancelada', badge: 'badge badge-danger' },
};

export const STATUS_FORNECEDOR = {
  PENDENTE: { rotulo: 'Aguardando proposta', badge: 'badge badge-warning' },
  RESPONDIDA: { rotulo: 'Respondeu', badge: 'badge badge-success' },
  RECUSADA: { rotulo: 'Recusou', badge: 'badge badge-danger' },
  SEM_RESPOSTA: { rotulo: 'Sem resposta', badge: 'badge badge-warning' },
};

export const rotuloStatusCotacao = (s) => STATUS_COTACAO[s]?.rotulo || s;
export const badgeStatusCotacao = (s) => STATUS_COTACAO[s]?.badge || 'badge badge-warning';
export const rotuloStatusFornecedor = (s) => STATUS_FORNECEDOR[s]?.rotulo || s;
export const badgeStatusFornecedor = (s) => STATUS_FORNECEDOR[s]?.badge || 'badge badge-warning';

export const FILTROS_STATUS_COTACAO = ['ABERTA', 'ENCERRADA', 'CANCELADA'];

const aberta = (cotacao) => ['ABERTA', 'EM_ANALISE'].includes(cotacao?.status);

// O que dá para fazer, por situação da cotação.
export function acoesDaCotacao(cotacao) {
  const ab = aberta(cotacao);
  return { registrarProposta: ab, recusar: ab, gerarPedidos: ab, cancelar: ab };
}

// ---- Nova cotação ----

export const itemVazio = () => ({ produto_id: '', quantidade: 1 });
export const formVazio = () => ({ itens: [itemVazio()], fornecedor_ids: [], data_limite: '', observacoes: '' });

export function validarCotacaoForm(form) {
  if (!form.itens.length) return 'Informe ao menos um item.';
  for (const [i, item] of form.itens.entries()) {
    if (!item.produto_id) return `Item ${i + 1}: escolha o produto.`;
    if (!Number.isInteger(Number(item.quantidade)) || Number(item.quantidade) <= 0) return `Item ${i + 1}: a quantidade deve ser um número inteiro maior que zero.`;
  }
  const produtos = form.itens.map(i => String(i.produto_id));
  if (new Set(produtos).size !== produtos.length) return 'Há produto repetido: junte as quantidades em uma linha.';
  if (!form.fornecedor_ids.length) return 'Escolha ao menos um fornecedor para pedir o preço.';
  if (form.fornecedor_ids.length > 20) return 'No máximo 20 fornecedores por cotação.';
  return null;
}

export function montarCorpoCotacao(form) {
  const corpo = {
    itens: form.itens.map(i => ({ produto_id: Number(i.produto_id), quantidade: Number(i.quantidade) })),
    fornecedor_ids: form.fornecedor_ids.map(Number),
  };
  if (form.data_limite) corpo.data_limite = form.data_limite;
  if (form.observacoes.trim()) corpo.observacoes = form.observacoes.trim();
  return corpo;
}

// ---- Proposta de um fornecedor ----

// Linhas do modal: uma por item da cotação, com o que o fornecedor já tinha proposto (se tinha).
export function linhasDaProposta(cotacao, fornecedorId) {
  const dele = (cotacao.ofertas || []).filter(o => o.fornecedor_id === fornecedorId);
  return cotacao.itens.map(item => {
    const oferta = dele.find(o => o.cotacao_item_id === item.id);
    return {
      cotacao_item_id: item.id,
      rotulo: item.produto_nome || item.descricao_snapshot,
      solicitada: item.quantidade_solicitada,
      preco_unitario: oferta ? String(oferta.preco_unitario) : '',
      desconto: oferta && oferta.desconto > 0 ? String(oferta.desconto) : '',
      quantidade_ofertada: oferta ? String(oferta.quantidade_ofertada) : String(item.quantidade_solicitada),
    };
  });
}

// Prazo e condição valem para a proposta toda (o backend guarda por item). Linha sem preço = item que o fornecedor não cotou.
export function montarItensProposta(linhas, { prazo_entrega_dias, condicao_pagamento }) {
  return linhas
    .filter(l => l.preco_unitario !== '')
    .map(l => {
      const item = { cotacao_item_id: l.cotacao_item_id, preco_unitario: Number(l.preco_unitario) };
      if (Number(l.desconto) > 0) item.desconto = Number(l.desconto);
      if (l.quantidade_ofertada !== '' && Number(l.quantidade_ofertada) !== l.solicitada) item.quantidade_ofertada = Number(l.quantidade_ofertada);
      if (prazo_entrega_dias !== '' && prazo_entrega_dias !== undefined) item.prazo_entrega_dias = Number(prazo_entrega_dias);
      if (String(condicao_pagamento ?? '').trim()) item.condicao_pagamento = condicao_pagamento.trim();
      return item;
    });
}

export function validarProposta(linhas, { prazo_entrega_dias }) {
  const cotadas = linhas.filter(l => l.preco_unitario !== '');
  if (!cotadas.length) return 'Informe o preço de ao menos um item.';
  for (const l of cotadas) {
    if (!(Number(l.preco_unitario) >= 0)) return `${l.rotulo}: preço inválido.`;
    const q = Number(l.quantidade_ofertada);
    if (!Number.isInteger(q) || q <= 0) return `${l.rotulo}: a quantidade deve ser um número inteiro maior que zero.`;
    if (q > l.solicitada) return `${l.rotulo}: o fornecedor não pode oferecer mais do que o pedido (${l.solicitada}).`;
    if (Number(l.desconto) < 0 || Number(l.desconto) > q * Number(l.preco_unitario)) return `${l.rotulo}: desconto inválido.`;
  }
  if (prazo_entrega_dias !== '' && (!Number.isInteger(Number(prazo_entrega_dias)) || Number(prazo_entrega_dias) < 0 || Number(prazo_entrega_dias) > 365)) {
    return 'O prazo de entrega deve ser de 0 a 365 dias.';
  }
  return null;
}

// ---- Comparação e escolha ----

export const ofertaDe = (cotacao, itemId, fornecedorId) => (cotacao.ofertas || []).find(o => o.cotacao_item_id === itemId && o.fornecedor_id === fornecedorId) || null;

// Escolha inicial: a melhor oferta de cada item (sugestão do backend). Item sem oferta fica sem escolha.
export function escolhaInicial(cotacao) {
  const escolha = {};
  for (const item of cotacao.itens) {
    if (item.melhor_fornecedor_id !== null && item.melhor_fornecedor_id !== undefined) escolha[item.id] = item.melhor_fornecedor_id;
  }
  return escolha;
}

// A escolha só vale se o fornecedor realmente cotou o item.
export function escolhaValida(cotacao, escolha) {
  return Object.entries(escolha).filter(([itemId, fornecedorId]) => ofertaDe(cotacao, Number(itemId), fornecedorId));
}

export const montarEscolhas = (cotacao, escolha) => escolhaValida(cotacao, escolha).map(([itemId, fornecedorId]) => ({ cotacao_item_id: Number(itemId), fornecedor_id: Number(fornecedorId) }));

// Resumo por fornecedor do que seria pedido: quantos itens e quanto. Para a pessoa conferir antes de gerar.
export function resumoPorFornecedor(cotacao, escolha) {
  const mapa = new Map();
  for (const [itemId, fornecedorId] of escolhaValida(cotacao, escolha)) {
    const oferta = ofertaDe(cotacao, Number(itemId), fornecedorId);
    const atual = mapa.get(fornecedorId) || { fornecedor_id: fornecedorId, nome: cotacao.fornecedores.find(f => f.fornecedor_id === fornecedorId)?.fornecedor_nome, itens: 0, total: 0 };
    atual.itens += 1;
    atual.total = Math.round((atual.total + oferta.total) * 100) / 100;
    mapa.set(fornecedorId, atual);
  }
  return [...mapa.values()];
}
