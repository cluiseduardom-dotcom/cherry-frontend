// Regras puras da tela de Produção (PCP). Sem DOM, testável.

export const STATUS_ORDEM = {
  planejada: { rotulo: 'Planejada', badge: 'badge-info' },
  em_producao: { rotulo: 'Em produção', badge: 'badge-warning' },
  concluida: { rotulo: 'Concluída', badge: 'badge-success' },
  cancelada: { rotulo: 'Cancelada', badge: '' },
};

export const FILTROS_STATUS = [
  { valor: '', rotulo: 'Todas' },
  { valor: 'planejada', rotulo: 'Planejadas' },
  { valor: 'em_producao', rotulo: 'Em produção' },
  { valor: 'concluida', rotulo: 'Concluídas' },
  { valor: 'cancelada', rotulo: 'Canceladas' },
];

export function rotuloStatus(status) {
  return STATUS_ORDEM[status]?.rotulo ?? String(status ?? '—');
}

// Ações que cada estado permite. O backend decide de novo (409 quando não vale).
export function acoesDaOrdem(ordem) {
  if (!ordem) return [];
  switch (ordem.status) {
    case 'planejada': return ['iniciar', 'cancelar'];
    case 'em_producao': return ['concluir', 'cancelar'];
    case 'concluida': return ordem.tem_pendencia ? ['regularizar'] : [];
    default: return [];
  }
}

const inteiro = texto => {
  const n = Number(texto);
  return Number.isInteger(n) ? n : NaN;
};

// Erro do formulário de nova ordem ('' = válido).
export function validarNovaOrdem({ produto_id, quantidade_planejada, prazo }) {
  if (!produto_id) return 'Escolha o produto.';
  const q = inteiro(quantidade_planejada);
  if (!(q >= 1)) return 'Informe a quantidade, um número inteiro maior que zero.';
  if (q > 1000000) return 'A quantidade máxima é 1.000.000.';
  if (prazo && !/^\d{4}-\d{2}-\d{2}$/.test(prazo)) return 'Prazo inválido.';
  return '';
}

// Erro do formulário de conclusão ('' = válido). A perda é opcional (vazia = 0).
export function validarConclusao({ quantidade_produzida, quantidade_perdida }) {
  const produzida = inteiro(quantidade_produzida === '' ? 0 : quantidade_produzida);
  const perdida = inteiro(quantidade_perdida === '' || quantidade_perdida === undefined ? 0 : quantidade_perdida);
  if (!(produzida >= 0)) return 'A quantidade produzida deve ser um número inteiro, zero ou mais.';
  if (!(perdida >= 0)) return 'A quantidade perdida deve ser um número inteiro, zero ou mais.';
  if (produzida + perdida < 1) return 'Informe ao menos uma unidade produzida ou perdida.';
  return '';
}

export function montarConclusao({ quantidade_produzida, quantidade_perdida }) {
  return {
    quantidade_produzida: Number(quantidade_produzida === '' ? 0 : quantidade_produzida),
    quantidade_perdida: Number(quantidade_perdida === '' || quantidade_perdida === undefined ? 0 : quantidade_perdida),
  };
}

export function validarMotivo(motivo) {
  const texto = String(motivo ?? '').trim();
  if (texto.length < 3) return 'Informe o motivo (mínimo 3 caracteres).';
  if (texto.length > 200) return 'O motivo deve ter até 200 caracteres.';
  return '';
}

// Ficha técnica: [{ insumo_produto_id, quantidade }] (texto dos campos) → erro ou ''.
export function validarFichaTecnica(itens) {
  if (!itens.length) return 'Adicione ao menos um insumo à ficha.';
  const vistos = new Set();
  for (const item of itens) {
    if (!item.insumo_produto_id) return 'Escolha o insumo em todas as linhas.';
    if (vistos.has(String(item.insumo_produto_id))) return 'Há insumo repetido na ficha.';
    vistos.add(String(item.insumo_produto_id));
    const q = inteiro(item.quantidade);
    if (!(q >= 1)) return 'Cada quantidade deve ser um número inteiro maior que zero.';
  }
  return '';
}

export function montarFichaTecnica(itens) {
  return itens.map(i => ({ insumo_produto_id: Number(i.insumo_produto_id), quantidade_necessaria: Number(i.quantidade) }));
}

// Resumo da prévia de necessidade para a pessoa: faltar insumo NÃO impede produzir, só avisa.
export function resumirNecessidade(necessidade) {
  if (!necessidade) return { tom: 'neutro', titulo: '', detalhe: '', faltantes: [] };
  const faltantes = (necessidade.insumos ?? []).filter(i => !i.suficiente);
  if (faltantes.length === 0) {
    return { tom: 'ok', titulo: 'Insumos suficientes em estoque.', detalhe: '', faltantes };
  }
  return {
    tom: 'aviso',
    titulo: 'Faltam insumos no estoque do sistema.',
    detalhe: 'Você pode produzir mesmo assim: se o insumo já existe e ainda não deu entrada, a baixa fica pendente e é feita depois que a entrada for lançada.',
    faltantes,
  };
}

// Pendências da ordem (insumo que faltou no sistema ao concluir).
export function resumirPendencias(ordem) {
  const pendencias = ordem?.pendencias ?? [];
  return { tem: pendencias.length > 0, total: pendencias.reduce((soma, p) => soma + Number(p.quantidade_pendente || 0), 0), pendencias };
}

export function temCustoNaOrdem(ordem) {
  return Boolean(ordem) && Object.prototype.hasOwnProperty.call(ordem, 'custo_insumos');
}

export function formatarPrazo(prazo) {
  if (!prazo) return '—';
  const [ano, mes, dia] = String(prazo).slice(0, 10).split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : '—';
}

// Só produtos acabados podem ser produzidos.
export function produtosProduziveis(produtos) {
  return (produtos ?? []).filter(p => p.tipo === 'acabado' && p.ativo !== false);
}
