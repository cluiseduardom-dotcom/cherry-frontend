// Regras puras do Pix cobrado pelo Mercado Pago no PDV (sem DOM, testáveis).

// 409 = integração desligada no ambiente ou loja sem Mercado Pago conectado: o PDV segue com o
// Pix manual de sempre. Qualquer outro erro é mostrado ao operador sem mascarar a causa.
export function gatewayIndisponivel(erro) {
  return erro?.status === 409;
}

// Situação da cobrança para a tela: aguardando | pago | encerrada (expirou, cancelou, falhou ou estornou).
export function situacaoCobranca(cobranca) {
  if (!cobranca) return 'aguardando';
  if (cobranca.status === 'pago') return 'pago';
  if (cobranca.status === 'pendente' && !cobranca.expirada) return 'aguardando';
  return 'encerrada';
}

// "29:05" até a expiração; "00:00" depois dela; "" sem data válida.
export function tempoRestante(expiraEm, agora = Date.now()) {
  const alvo = new Date(expiraEm).getTime();
  if (!expiraEm || Number.isNaN(alvo)) return '';
  const segundos = Math.max(0, Math.floor((alvo - agora) / 1000));
  const mm = String(Math.floor(segundos / 60)).padStart(2, '0');
  const ss = String(segundos % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

// Pagamento pendente que carrega a cobrança. `pix` é só para a tela (QR e validade): nunca vai à API.
export function pagamentoComCobranca(pagamento, cobranca) {
  return {
    ...pagamento,
    cobranca_codigo: cobranca.codigo,
    pix: {
      qr_code: cobranca.qr_code,
      qr_code_base64: cobranca.qr_code_base64,
      expira_em: cobranca.expira_em,
    },
  };
}

export function pagamentoDoGateway(pagamento) {
  return Boolean(pagamento?.cobranca_codigo);
}
