// Issue #45: o backend (GET /clientes/:id/historico) retorna uma linha por
// item de venda — o cabeçalho do cliente mostra "N compras" mas a tabela
// tinha mais linhas que isso, confundindo o usuário. Esta função agrupa as
// linhas planas por venda inteiramente no frontend, sem exigir mudança de
// contrato de API: os dados para "quantidade de itens" e "total da venda"
// já estão implícitos nas linhas existentes.
//
// `total_venda` é opcional (campo novo, ainda não implementado no backend —
// ver docs/ai/CLIENTES-HUB-BACKEND-CONTRACT.md): quando presente, é o total
// real da venda (com desconto/juros já aplicados); quando ausente, cai para
// a soma dos itens (pode divergir do total oficial se a venda teve desconto
// ou juros, já que o histórico não traz esses campos).
export function agruparHistoricoPorVenda(registros) {
  const lista = Array.isArray(registros) ? registros : [];
  const porVenda = new Map();

  for (const item of lista) {
    if (!porVenda.has(item.venda_id)) {
      porVenda.set(item.venda_id, {
        venda_id: item.venda_id,
        data: item.data,
        totalVenda: item.total_venda != null ? Number(item.total_venda) : null,
        itens: [],
      });
    }
    porVenda.get(item.venda_id).itens.push(item);
  }

  return [...porVenda.values()].map(venda => ({
    ...venda,
    quantidadeItens: venda.itens.length,
    totalVenda: venda.totalVenda ?? venda.itens.reduce((soma, i) => soma + Number(i.total_item || 0), 0),
  }));
}
