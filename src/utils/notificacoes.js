// Regras puras do sino: "lido" é guardado só no aparelho (o servidor calcula os avisos na hora).

const PREFIXO_CHAVE = 'vertumno:avisos-lidos:';

export function chaveDeLidos(usuario) {
  return `${PREFIXO_CHAVE}${usuario?.id ?? 'anonimo'}`;
}

// Lê/grava com try/catch: o storage pode estar bloqueado (aba privada) e o sino continua funcionando.
export function lerLidos(storage, chave) {
  try {
    const bruto = storage.getItem(chave);
    const lista = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(lista) ? lista.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function salvarLidos(storage, chave, ids) {
  try {
    storage.setItem(chave, JSON.stringify(ids));
  } catch {
    // sem storage: o "lido" vale só até recarregar
  }
}

// Esquece o que já não é aviso: se a situação voltar a acontecer, o aviso volta como novo.
export function podarLidos(lidos, itens) {
  const atuais = new Set(itens.map((i) => i.id));
  return lidos.filter((id) => atuais.has(id));
}

export function contarNaoLidos(itens, lidos) {
  const set = new Set(lidos);
  return itens.filter((i) => !set.has(i.id)).length;
}

export function marcarLido(lidos, id) {
  return lidos.includes(id) ? lidos : [...lidos, id];
}

export function marcarTodosLidos(lidos, itens) {
  return [...new Set([...lidos, ...itens.map((i) => i.id)])];
}

// Rótulo curto do contador do sino ("9+" acima de 9).
export function rotuloContador(qtd) {
  if (!qtd || qtd < 1) return '';
  return qtd > 9 ? '9+' : String(qtd);
}

const ROTULO_TIPO = {
  falta: 'Em falta',
  abaixo_minimo: 'Abaixo do mínimo',
  perto_de_acabar: 'Perto de acabar',
  parado: 'Parado',
  alto_giro: 'Alto giro',
  transferencia_pendente: 'Transferência sem aceite',
  maleta_sem_conferencia: 'Maleta sem conferência',
  maleta_sem_venda: 'Maleta sem vender',
  maleta_divergencia: 'Diferença na conferência',
};

export function rotuloDoTipo(tipo) {
  return ROTULO_TIPO[tipo] ?? 'Aviso';
}

// Avisos de maleta: a equipe (que vê estoque) vai às telas de transferência e acerto; a vendedora, à própria maleta.
const TIPOS_MALETA = ['transferencia_pendente', 'maleta_sem_conferencia', 'maleta_sem_venda', 'maleta_divergencia'];

// Para onde o aviso leva: telas de estoque para quem gere estoque; catálogo para os demais.
export function destinoDoAviso(aviso, podeVerEstoque) {
  if (TIPOS_MALETA.includes(aviso.tipo)) {
    if (!podeVerEstoque) return '/minha-maleta';
    return aviso.tipo === 'transferencia_pendente' ? '/transferencias' : '/acerto-estoque';
  }
  if (['falta', 'abaixo_minimo', 'perto_de_acabar'].includes(aviso.tipo) && podeVerEstoque) {
    return '/estoque';
  }
  return '/produtos';
}
