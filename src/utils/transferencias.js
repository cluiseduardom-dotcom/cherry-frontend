// Regras de apresentação das transferências. A autorização de verdade é do backend: aqui só
// decidimos quais botões mostrar, espelhando as regras dele para não oferecer o que daria 403.

export const STATUS_ROTULO = {
  pendente: 'Aguardando aceite',
  concluida: 'Concluída',
  recusada: 'Recusada',
  cancelada: 'Cancelada',
};

export const STATUS_BADGE = {
  pendente: 'badge-warning',
  concluida: 'badge-success',
  recusada: 'badge-danger',
  cancelada: 'badge-info',
};

export const FILTROS_DE_STATUS = [
  { key: '', label: 'Todas' },
  { key: 'pendente', label: 'Aguardando aceite' },
  { key: 'concluida', label: 'Concluídas' },
  { key: 'recusada', label: 'Recusadas' },
  { key: 'cancelada', label: 'Canceladas' },
];

export const ROTULO_ACAO = {
  criar: 'Criada',
  aceitar: 'Aceita',
  recusar: 'Recusada',
  cancelar: 'Cancelada',
};

const MOTIVO_MIN = 3;
const MOTIVO_MAX = 300;
const OBSERVACAO_MAX = 500;
const ITENS_MAX = 200;

const ehEquipe = user => user?.role === 'admin' || user?.role === 'estoquista';

// Quem recebe decide: dono da maleta de destino (nem o admin responde por ele); nos demais destinos, a equipe.
export function podeResponder(t, user) {
  if (!t || t.status !== 'pendente' || !user) return false;
  return t.destino_tipo === 'maleta' ? t.destino_usuario_id === user.id : ehEquipe(user);
}

// Cancelar: quem criou ou o admin.
export function podeCancelar(t, user) {
  if (!t || t.status !== 'pendente' || !user) return false;
  return t.criado_por === user.id || user.role === 'admin';
}

export function acoesPermitidas(t, user) {
  const responder = podeResponder(t, user);
  return { aceitar: responder, recusar: responder, cancelar: podeCancelar(t, user) };
}

// Origens e destinos que a pessoa pode escolher ao criar. Equipe: qualquer rota entre locais.
// Demais: só devolver da PRÓPRIA maleta ao Central.
export function rotasDisponiveis(locais, user) {
  const lista = locais ?? [];
  if (ehEquipe(user)) return { origens: lista, destinos: lista };

  return {
    origens: lista.filter(l => l.tipo === 'maleta' && l.usuario_id === user?.id),
    destinos: lista.filter(l => l.tipo === 'central'),
  };
}

export function validarMotivo(motivo) {
  const texto = (motivo ?? '').trim();
  if (texto.length < MOTIVO_MIN) return { valido: false, erro: `Informe o motivo (mínimo de ${MOTIVO_MIN} caracteres)` };
  if (texto.length > MOTIVO_MAX) return { valido: false, erro: `Motivo muito longo (máximo de ${MOTIVO_MAX} caracteres)` };
  return { valido: true, motivo: texto };
}

export const FORM_TRANSFERENCIA_VAZIO = { origem: '', destino: '', itens: [], observacao: '' };

// `saldos`: { [produto_id]: saldo disponível na origem }. Devolve { valido, erro, dados }.
export function validarNovaTransferencia(form, saldos = {}) {
  if (!form.origem) return { valido: false, erro: 'Selecione o local de origem', dados: null };
  if (!form.destino) return { valido: false, erro: 'Selecione o local de destino', dados: null };
  if (form.origem === form.destino) return { valido: false, erro: 'Origem e destino devem ser diferentes', dados: null };
  if (!form.itens.length) return { valido: false, erro: 'Adicione ao menos um produto', dados: null };
  if (form.itens.length > ITENS_MAX) return { valido: false, erro: `Máximo de ${ITENS_MAX} produtos por transferência`, dados: null };
  if ((form.observacao ?? '').trim().length > OBSERVACAO_MAX) {
    return { valido: false, erro: `Observação muito longa (máximo de ${OBSERVACAO_MAX} caracteres)`, dados: null };
  }

  const vistos = new Set();
  for (const item of form.itens) {
    const quantidade = Number(item.quantidade);
    const nome = item.nome ?? 'produto';

    if (vistos.has(item.produto_id)) return { valido: false, erro: `Produto repetido: ${nome}`, dados: null };
    vistos.add(item.produto_id);

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      return { valido: false, erro: `Quantidade inválida para ${nome}`, dados: null };
    }
    if (saldos[item.produto_id] !== undefined && quantidade > saldos[item.produto_id]) {
      return { valido: false, erro: `Saldo insuficiente de ${nome} na origem (disponível: ${saldos[item.produto_id]})`, dados: null };
    }
  }

  const observacao = (form.observacao ?? '').trim();
  return {
    valido: true,
    erro: '',
    dados: {
      origem_local_id: Number(form.origem),
      destino_local_id: Number(form.destino),
      itens: form.itens.map(i => ({ produto_id: i.produto_id, quantidade: Number(i.quantidade) })),
      ...(observacao ? { observacao } : {}),
    },
  };
}

// Adiciona o produto à lista (ignora repetido) com a quantidade inicial 1.
export function adicionarItem(itens, produto) {
  if (!produto || itens.some(i => i.produto_id === produto.produto_id)) return itens;
  return [...itens, { produto_id: produto.produto_id, nome: produto.nome, sku: produto.sku ?? null, quantidade: 1 }];
}

export function removerItem(itens, produtoId) {
  return itens.filter(i => i.produto_id !== produtoId);
}

export function atualizarQuantidade(itens, produtoId, quantidade) {
  return itens.map(i => (i.produto_id === produtoId ? { ...i, quantidade } : i));
}

export function totalDeUnidades(itens) {
  return (itens ?? []).reduce((soma, i) => soma + Number(i.quantidade ?? 0), 0);
}
