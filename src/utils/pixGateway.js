// Regras puras do Pix cobrado pelo Mercado Pago no PDV (sem DOM, testáveis).

// 409 = integração desligada no ambiente ou loja sem Mercado Pago conectado: o PDV segue com o
// Pix manual de sempre. Qualquer outro erro é mostrado ao operador sem mascarar a causa.
export function gatewayIndisponivel(erro) {
  return erro?.status === 409;
}

// Aviso para o operador quando o Pix automático não está disponível: { texto, acao }. O Pix continua
// funcionando como manual (o operador confere o recebimento no banco); só a cobrança com QR e a baixa
// automática não. `motivo` vem do backend; qualquer outro valor (ou ausência) cai no aviso genérico.
// `podeConectar` (admin) troca o "peça ao administrador" por um atalho direto para a conexão.
export const ROTA_CONEXAO_MERCADO_PAGO = '/configuracoes/empresa';

export function avisoPixIndisponivel(motivo, { podeConectar = false } = {}) {
  const final = 'Este Pix será manual: confirme o recebimento no seu banco antes de concluir a venda.';

  if (motivo === 'loja_nao_conectada') {
    if (podeConectar) {
      return {
        texto: `Pix automático desligado: o Mercado Pago ainda não está conectado. Conecte para cobrar por QR e baixar sozinho. ${final}`,
        acao: { to: ROTA_CONEXAO_MERCADO_PAGO, rotulo: 'Conectar Mercado Pago' },
      };
    }
    return {
      texto: `Pix automático desligado: a loja ainda não conectou o Mercado Pago. Peça ao administrador para conectar em Dados da empresa. ${final}`,
      acao: null,
    };
  }

  if (motivo === 'nao_configurado') {
    return { texto: `Pix automático não está ativo neste ambiente. ${final}`, acao: null };
  }

  return { texto: `Pix automático indisponível no momento. ${final}`, acao: null };
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

// ---- Link de pagamento de cartão (Mercado Pago Checkout Pro) ----
// Enquanto o cliente não paga, o pagamento vive no PDV como 'cartao_link' (só para a tela: nunca vai à API).
// Quando o Mercado Pago confirma, vira `credito` ou `debito` com o nº de parcelas que o CLIENTE escolheu
// na página do Mercado Pago, lidos da cobrança (o operador não digita nada).
export const FORMA_LINK_CARTAO = 'cartao_link';

export function pagamentoLinkCartao(pagamento) {
  return pagamento?.forma_pagamento === FORMA_LINK_CARTAO;
}

// Cobrança paga em cartão pelo gateway, já convertida em crédito/débito (para os avisos de perda).
export function pagamentoCartaoDoGateway(pagamento) {
  return pagamentoDoGateway(pagamento) && pagamento.forma_pagamento !== 'pix';
}

export function pagamentoComLinkCartao(pagamento, cobranca, recebidoEm = Date.now()) {
  return {
    ...pagamento,
    forma_pagamento: FORMA_LINK_CARTAO,
    numero_parcelas: 1,
    cobranca_codigo: cobranca.codigo,
    link: {
      url: cobranca.link_url,
      parcelas_maximas: cobranca.parcelas_maximas,
      expira_em: cobranca.expira_em,
      expira_em_segundos: cobranca.expira_em_segundos,
      recebido_em: recebidoEm,
    },
  };
}

// Só vale como pago com o tipo de cartão e as parcelas já lidos do Mercado Pago: sem eles a venda seria
// recusada pelo backend, então a tela continua aguardando em vez de confirmar às cegas.
export function situacaoLinkCartao(cobranca) {
  if (cobranca?.status === 'pago' && !['credito', 'debito'].includes(cobranca.tipo_cartao)) return 'aguardando';
  return situacaoCobranca(cobranca);
}

// Troca o pagamento 'cartao_link' pendente por crédito/débito confirmado, com as parcelas do Mercado Pago.
export function confirmarLinkCartao(pagamentos, indice, cobranca) {
  const atual = pagamentos[indice];
  if (!pagamentoLinkCartao(atual) || atual.status !== 'pendente') return pagamentos;
  if (!['credito', 'debito'].includes(cobranca?.tipo_cartao)) return pagamentos;

  const parcelas = cobranca.tipo_cartao === 'debito' ? 1 : Number(cobranca.parcelas);
  if (!Number.isInteger(parcelas) || parcelas < 1) return pagamentos;

  return pagamentos.map((p, i) => (i === indice
    ? { ...p, forma_pagamento: cobranca.tipo_cartao, numero_parcelas: parcelas, status: 'confirmado', link: undefined }
    : p));
}

// Texto para enviar o link ao cliente (WhatsApp). O link é do Mercado Pago; nada sensível vai junto.
export function linkWhatsApp(url, valorFormatado) {
  const texto = `Link para pagar ${valorFormatado} no cartão: ${url}`;
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}

// Proteção do PDV: o Pix do Mercado Pago é dinheiro real que já pode ter saído da conta do cliente.
// Se o operador descartar a venda (limpar, esvaziar o carrinho, remover o Pix ou sair da tela) com
// ele pago ou ainda aguardando o QR, o dinheiro fica na cobrança sem venda — e só volta ao cliente por
// devolução manual. Retorna 'pago' (já confirmado pelo provedor), 'aguardando' (QR aberto) ou null.
// Pix já encerrado (recusado: expirou/cancelou) não oferece risco. 'pago' prevalece sobre 'aguardando'.
export function riscoPixGateway(pagamentos) {
  const doGateway = (pagamentos ?? []).filter(pagamentoDoGateway);
  if (doGateway.some(p => (p.status ?? 'confirmado') === 'confirmado')) return 'pago';
  if (doGateway.some(p => p.status === 'pendente')) return 'aguardando';
  return null;
}

// Texto do diálogo de confirmação. `acao` = o que o operador está tentando fazer, em verbo no infinitivo
// ("limpar a venda", "sair do PDV"...).
export function confirmacaoPerdaPix(risco, acao, { cartao = false } = {}) {
  if (cartao) {
    if (risco === 'pago') {
      return {
        title: 'Há um pagamento de cartão já pago nesta venda',
        message: `O cliente já pagou no cartão pelo link do Mercado Pago e a venda ainda não foi finalizada. Se você ${acao} agora, o pagamento fica sem venda e só volta ao cliente por estorno no painel do Mercado Pago. Para não perder, finalize a venda.`,
        confirmLabel: 'Descartar mesmo assim',
      };
    }
    return {
      title: 'Há um link de cartão aguardando pagamento',
      message: `Existe um link de pagamento de cartão aberto nesta venda. Se o cliente pagar depois que você ${acao}, o dinheiro fica sem venda e só volta por estorno no painel do Mercado Pago. Confirme que o cliente não vai pagar antes de continuar.`,
      confirmLabel: 'Descartar mesmo assim',
    };
  }

  if (risco === 'pago') {
    return {
      title: 'Há um Pix já pago nesta venda',
      message: `O cliente já pagou um Pix pelo Mercado Pago e a venda ainda não foi finalizada. Se você ${acao} agora, o pagamento fica sem venda e só volta ao cliente por devolução (Comissões → Pix a devolver). Para não perder, finalize a venda.`,
      confirmLabel: 'Descartar mesmo assim',
    };
  }
  return {
    title: 'Há um Pix aguardando pagamento',
    message: `Existe um QR Code de Pix aberto nesta venda. Se o cliente pagar depois que você ${acao}, o dinheiro fica sem venda e só volta por devolução (Comissões → Pix a devolver). Confirme que o cliente não vai pagar antes de continuar.`,
    confirmLabel: 'Descartar mesmo assim',
  };
}
