// Regras puras da devolução de Pix (sem DOM, testáveis). O backend valida tudo de novo.

export const MOTIVO_MIN = 3;
export const MOTIVO_MAX = 200;
// Pix pago há menos que isso e ainda sem venda pode estar sendo concluído em outro caixa.
export const MINUTOS_PIX_RECENTE = 30;

export function validarMotivoDevolucao(motivo) {
  const texto = String(motivo ?? '').trim();

  if (texto.length < MOTIVO_MIN) return { valido: false, erro: 'Informe o motivo da devolução.' };
  if (texto.length > MOTIVO_MAX) return { valido: false, erro: `O motivo deve ter no máximo ${MOTIVO_MAX} caracteres.` };

  return { valido: true, motivo: texto };
}

export function rotuloOrigemPix(item) {
  if (item?.situacao === 'venda_cancelada') return `Venda #${item.venda_id} cancelada`;
  return 'Sem venda concluída';
}

// Pix sem venda criado há pouco: o operador pode ainda estar finalizando a venda.
export function pixRecente(item, agora = Date.now()) {
  if (item?.situacao !== 'sem_venda') return false;

  const criado = new Date(item.criado_em).getTime();
  if (Number.isNaN(criado)) return false;

  return agora - criado < MINUTOS_PIX_RECENTE * 60 * 1000;
}

export function rotuloStatusDevolucao(status) {
  switch (status) {
    case 'concluida': return 'Devolvido';
    case 'solicitada': return 'Em processamento';
    case 'falhou': return 'Falhou';
    default: return status ?? '';
  }
}

// Texto do aviso depois de pedir a devolução. 'solicitada' = o Mercado Pago ainda está processando.
export function mensagemDevolucao(status) {
  if (status === 'concluida') return 'Pix devolvido ao pagador.';
  return 'Devolução solicitada ao Mercado Pago. Ela aparece como concluída quando o provedor confirmar.';
}
