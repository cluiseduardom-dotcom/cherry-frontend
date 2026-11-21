// Regras puras da escolha de modelo de nicho. Sem DOM, testável.

export function totalDeCategorias(modelo) {
  return (modelo?.niveis ?? []).reduce((soma, n) => soma + (n.categorias?.length ?? 0), 0);
}

// Texto do diálogo de confirmação: diz exatamente o que será criado.
export function mensagemDeConfirmacao(modelo) {
  if (!modelo) return '';
  const niveis = modelo.niveis.length;
  return `Vamos criar ${totalDeCategorias(modelo)} categorias em ${niveis} níveis (${modelo.niveis.map(n => n.nome).join(' e ')}) e configurar o padrão de SKU, com exemplos como ${modelo.exemplo_sku}. Você poderá renomear, adicionar e remover categorias depois.`;
}

// O modelo só faz sentido numa empresa que ainda não tem categoria de produto.
export function podeOferecerModelos({ ehInsumo, totalCategorias }) {
  return !ehInsumo && totalCategorias === 0;
}

export function modeloPorId(modelos, id) {
  return (modelos ?? []).find(m => m.id === id) ?? null;
}
