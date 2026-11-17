// Passos do assistente que aparece depois de criar um produto. Cada passo só entra na lista se o usuário
// tem a permissão da tela equivalente (o backend valida de novo).
export const PASSOS_ASSISTENTE = {
  fotos: { titulo: 'Fotos', ajuda: 'Até 5 fotos; a primeira aparece nos cards.' },
  categoria: { titulo: 'Categoria e SKU', ajuda: 'Escolha as categorias; o SKU é gerado a partir delas.' },
  preco: { titulo: 'Preço de venda', ajuda: 'Defina por markup sobre o custo ou pelo preço direto.' },
  estoque: { titulo: 'Estoque inicial', ajuda: 'Quantidade que já existe na loja. Só o administrador lança, uma única vez.' },
};

export function passosDoAssistente({ podeFotos, podeCategorizar, podePreco, podeEstoqueInicial }) {
  const passos = [];
  if (podeFotos) passos.push('fotos');
  if (podeCategorizar) passos.push('categoria');
  if (podePreco) passos.push('preco');
  if (podeEstoqueInicial) passos.push('estoque');
  return passos;
}

// Primeiro passo ainda não feito, na ordem da lista; null quando tudo foi feito.
export function proximoPasso(passos, concluidos) {
  return passos.find(id => !concluidos[id]) ?? null;
}

export function temPrecoDefinido(canais) {
  return (canais ?? []).some(c => c.preco_venda != null);
}

export function podeLancarEstoqueInicial(user) {
  return user?.role === 'admin' || user?.perfil === 'admin';
}
