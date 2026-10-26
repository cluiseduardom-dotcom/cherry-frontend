import { rotuloDoLocal } from './locaisEstoque';

// Local de saída da venda no PDV. O backend só aceita o Central ou a PRÓPRIA Maleta ativa
// (consignado, maleta alheia e Em trânsito = 403); aqui só se oferece o que ele aceita.
// Sem `local_id` o backend usa a Maleta ativa do vendedor, senão o Central: o padrão abaixo espelha isso.

export function locaisDeVenda(locais, usuarioId) {
  if (!Array.isArray(locais)) return [];

  const doUsuario = (l) => l.tipo === 'maleta' && usuarioId != null && Number(l.usuario_id) === Number(usuarioId);
  const opcoes = locais.filter((l) => l.tipo === 'central' || doUsuario(l));

  // Maleta primeiro (é o padrão), Central depois.
  return [...opcoes].sort((a, b) => Number(b.tipo === 'maleta') - Number(a.tipo === 'maleta'));
}

export function localPadraoDeVenda(opcoes) {
  return opcoes[0] ?? null;
}

// [{ produto_id, saldo }] -> { [produto_id]: saldo }
export function mapaDeSaldos(items) {
  const mapa = {};
  for (const item of items ?? []) mapa[item.produto_id] = Number(item.saldo);
  return mapa;
}

// Estoque exibido/limitado no PDV: saldo do local escolhido (0 se o produto não está nele).
// Sem local (backend antigo/sem locais), mantém o estoque do catálogo.
export function aplicarSaldosNosProdutos(produtos, saldos) {
  if (!saldos) return produtos;
  return produtos.map((p) => ({ ...p, stock: saldos[p.id] ?? 0 }));
}

// Baixa local pós-venda: soma todas as ocorrências do produto (avulso e dentro de kits).
export function reduzirSaldosAposVenda(saldos, itensVenda) {
  if (!saldos) return saldos;

  const novo = { ...saldos };
  for (const item of itensVenda ?? []) {
    novo[item.produto_id] = Math.max(0, (novo[item.produto_id] ?? 0) - item.quantidade);
  }
  return novo;
}

// Rótulo da linha de estoque na vitrine do PDV: "Disponível em Central" quando há local de saída;
// sem local (catálogo), mantém "Estoque".
export function rotuloEstoqueDoLocal(local) {
  const nome = rotuloDoLocal(local);
  return nome ? `Disponível em ${nome}` : 'Estoque';
}
