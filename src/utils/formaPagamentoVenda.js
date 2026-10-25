// Como a venda foi paga, para o Histórico. A API traz `pagamentos` (forma, valor, status) na ordem
// lançada; venda anterior ao módulo de pagamentos vem com [] e só tem o `forma_pagamento` legado.

const ROTULO_FORMA = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  debito: 'Débito',
  credito: 'Crédito',
  crediario: 'Crediário',
};

const ROTULO_LEGADO = {
  a_vista: 'À vista',
  prazo: 'Crediário',
};

export function rotuloDaForma(forma) {
  return ROTULO_FORMA[forma] ?? ROTULO_LEGADO[forma] ?? forma ?? '—';
}

// "Dinheiro + Pix" (formas distintas, na ordem em que foram lançadas); '—' se não há informação.
export function resumoFormasDePagamento(venda) {
  const pagamentos = Array.isArray(venda?.pagamentos) ? venda.pagamentos : [];

  if (pagamentos.length === 0) {
    return venda?.forma_pagamento ? rotuloDaForma(venda.forma_pagamento) : '—';
  }

  const formas = [...new Set(pagamentos.map(p => p.forma_pagamento))];
  return formas.map(rotuloDaForma).join(' + ');
}

// Detalhe para o tooltip: "Dinheiro R$ 40,00 · Pix R$ 60,00" (valor já formatado por quem chama).
export function detalheDosPagamentos(venda, formatarValor) {
  const pagamentos = Array.isArray(venda?.pagamentos) ? venda.pagamentos : [];

  return pagamentos.map(p => `${rotuloDaForma(p.forma_pagamento)} ${formatarValor(p.valor)}`).join(' · ');
}
