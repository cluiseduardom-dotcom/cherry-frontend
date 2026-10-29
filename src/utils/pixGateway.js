// Regras puras do Pix cobrado pelo Mercado Pago no PDV (sem DOM, testáveis).

// 409 = integração desligada no ambiente ou loja sem Mercado Pago conectado: o PDV segue com o
// Pix manual de sempre. Qualquer outro erro é mostrado ao operador sem mascarar a causa.
export function gatewayIndisponivel(erro) {
  return erro?.status === 409;
}

// Texto para o operador quando o Pix automático não está disponível. O Pix continua funcionando como
// manual (o operador confere o recebimento no banco); só a cobrança com QR e a baixa automática não.
// `motivo` vem do backend; qualquer outro valor (ou ausência) cai no aviso genérico.
export function avisoPixIndisponivel(motivo) {
  const final = 'O Pix será lançado como manual: confirme o recebimento no seu banco antes de concluir a venda.';

  if (motivo === 'loja_nao_conectada') {
    return `Pix automático desligado: a loja ainda não conectou o Mercado Pago (o administrador conecta em Dados da empresa). ${final}`;
  }

  if (motivo === 'nao_configurado') {
    return `Pix automático não está ativo neste ambiente. ${final}`;
  }

  return `Pix automático indisponível no momento. ${final}`;
}

// Situação da cobrança para a tela: aguardando | pago | encerrada (expirou, cancelou, falhou ou estornou).
export function situacaoCobranca(cobranca) {
  if (!cobranca) return 'aguardando';
  if (cobranca.status === 'pago') return 'pago';
  if (cobranca.status === 'pendente' && !cobranca.expirada) return 'aguardando';
  return 'encerrada';
}

// "29:05" até a expiração; "00:00" depois dela; "" sem dado válido.
// Preferência: segundos restantes que o servidor informou (`segundosServidor`) no instante `recebidoEm`;
// só o tempo decorrido desde então vem do relógio local, então um relógio do PC errado não distorce a
// contagem. Sem isso (API antiga), cai no cálculo por data absoluta.
export function tempoRestante(expiraEm, agora = Date.now(), segundosServidor, recebidoEm) {
  let segundos;
  if (Number.isFinite(segundosServidor) && Number.isFinite(recebidoEm)) {
    segundos = Math.max(0, Math.floor(segundosServidor - Math.max(0, agora - recebidoEm) / 1000));
  } else {
    const alvo = new Date(expiraEm).getTime();
    if (!expiraEm || Number.isNaN(alvo)) return '';
    segundos = Math.max(0, Math.floor((alvo - agora) / 1000));
  }
  const mm = String(Math.floor(segundos / 60)).padStart(2, '0');
  const ss = String(segundos % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

// Pagamento pendente que carrega a cobrança. `pix` é só para a tela (QR e validade): nunca vai à API.
export function pagamentoComCobranca(pagamento, cobranca, recebidoEm = Date.now()) {
  return {
    ...pagamento,
    cobranca_codigo: cobranca.codigo,
    pix: {
      qr_code: cobranca.qr_code,
      qr_code_base64: cobranca.qr_code_base64,
      expira_em: cobranca.expira_em,
      expira_em_segundos: cobranca.expira_em_segundos,
      recebido_em: recebidoEm,
    },
  };
}

export function pagamentoDoGateway(pagamento) {
  return Boolean(pagamento?.cobranca_codigo);
}
