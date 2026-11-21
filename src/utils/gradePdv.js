// Grade no PDV: as variações (P, M, G / cores) são produtos normais ligados por `grade_id`. Na vitrine do PDV elas aparecem
// num único cartão da grade; ao tocar, a pessoa escolhe a variação e ela entra no carrinho como o produto que é.
// Sem DOM, testável. O carrinho, o estoque e a venda não mudam: só a vitrine agrupa.

const valoresDaVariacao = (variacao) => (variacao && typeof variacao === 'object' ? Object.values(variacao).map(String) : []);

// O nome de cada variação é "<nome da grade> <valores>" (ver backend). Tira os valores do fim para achar o título.
export function tituloDaGrade(produto) {
  const sufixo = valoresDaVariacao(produto.variacao).join(' / ');
  const nome = String(produto.name ?? '');
  if (sufixo && nome.endsWith(` ${sufixo}`)) return nome.slice(0, -(sufixo.length + 1)).trim() || nome;
  return nome;
}

// Rótulo curto da variação para o botão: "P", "Azul / P".
export const rotuloDaVariacao = (produto) => valoresDaVariacao(produto.variacao).join(' / ') || produto.name;

// Troca, na ordem da vitrine, as variações de uma mesma grade (2 ou mais) por UM cartão. Grade com uma só variação visível
// e produto sem grade seguem como estão.
export function agruparPorGrade(produtos) {
  const porGrade = new Map();
  for (const p of produtos) {
    if (p.grade_id == null) continue;
    if (!porGrade.has(p.grade_id)) porGrade.set(p.grade_id, []);
    porGrade.get(p.grade_id).push(p);
  }

  const jaColocada = new Set();
  const saida = [];
  for (const p of produtos) {
    const membros = p.grade_id == null ? null : porGrade.get(p.grade_id);
    if (!membros || membros.length < 2) {
      saida.push(p);
      continue;
    }
    if (jaColocada.has(p.grade_id)) continue;
    jaColocada.add(p.grade_id);

    const precos = membros.map((m) => m.price).filter((v) => v != null);
    saida.push({
      id: `grade-${p.grade_id}`,
      ehGrade: true,
      grade_id: p.grade_id,
      name: tituloDaGrade(p),
      sku: `${membros.length} variações`,
      category: p.category,
      price: precos.length ? Math.min(...precos) : null,
      precoVaria: new Set(precos).size > 1,
      stock: membros.reduce((soma, m) => soma + (Number(m.stock) || 0), 0),
      unidade: p.unidade,
      color: p.color,
      imageUrl: p.imageUrl,
      variacoes: membros,
    });
  }
  return saida;
}
