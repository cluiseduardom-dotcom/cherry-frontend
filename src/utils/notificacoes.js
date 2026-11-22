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
  insumo_pendente: 'Insumo faltou em venda',
  insumo_pendente_producao: 'Insumo pendente na produção',
  transferencia_pendente: 'Transferência sem aceite',
  maleta_sem_conferencia: 'Maleta sem conferência',
  maleta_sem_venda: 'Maleta sem vender',
  maleta_divergencia: 'Diferença na conferência',
  loja_pedido_pago: 'Pedido da loja pago',
  loja_pagamento_sem_venda: 'Pagamento da loja sem venda',
  loja_pagamento_estornado: 'Pagamento da loja estornado',
  cobranca_plataforma: 'Cobrança da plataforma',
};

// `vocabulario` (opcional): palavras da empresa para o estoque do vendedor; sem ele, "maleta".
export function rotuloDoTipo(tipo, vocabulario) {
  if (vocabulario && tipo === 'maleta_sem_conferencia') return vocabulario.avisoSemConferencia;
  if (vocabulario && tipo === 'maleta_sem_venda') return vocabulario.avisoSemVender;

  return ROTULO_TIPO[tipo] ?? 'Aviso';
}

// Avisos de maleta: a equipe (que vê estoque) vai às telas de transferência e acerto; a vendedora, à própria maleta.
const TIPOS_MALETA = ['transferencia_pendente', 'maleta_sem_conferencia', 'maleta_sem_venda', 'maleta_divergencia'];

// Para onde o aviso leva: telas de estoque para quem gere estoque; catálogo para os demais.
const TIPOS_LOJA = ['loja_pedido_pago', 'loja_pagamento_sem_venda', 'loja_pagamento_estornado'];

// Aviso sem tela de destino (a pendência se resolve falando com a GiroNex): devolve null e a lista não mostra "Ver".
const TIPOS_SEM_DESTINO = ['cobranca_plataforma'];

export function destinoDoAviso(aviso, podeVerEstoque, podeVerPixADevolver = false, podeVerProducao = false) {
  if (TIPOS_SEM_DESTINO.includes(aviso.tipo)) return null;
  // Insumo pendente na produção: a regularização é na ordem, em Produção (sem acesso à tela, não há para onde levar).
  if (aviso.tipo === 'insumo_pendente_producao') return podeVerProducao ? '/producao' : null;
  // Loja online: pedido pago vai à fila de contato; pagamento sem venda vai à devolução (quem pode) ou à fila de pedidos.
  if (TIPOS_LOJA.includes(aviso.tipo)) {
    return aviso.tipo === 'loja_pagamento_sem_venda' && podeVerPixADevolver ? '/pix-a-devolver' : '/pedidos-loja';
  }
  if (TIPOS_MALETA.includes(aviso.tipo)) {
    if (!podeVerEstoque) return '/minha-maleta';
    return aviso.tipo === 'transferencia_pendente' ? '/transferencias' : '/acerto-estoque';
  }
  if (['falta', 'abaixo_minimo', 'perto_de_acabar'].includes(aviso.tipo) && podeVerEstoque) {
    return '/estoque';
  }
  return '/produtos';
}
