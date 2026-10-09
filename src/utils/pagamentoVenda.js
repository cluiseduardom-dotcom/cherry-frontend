// Lógica pura do pagamento no PDV (tela Nova Venda). Tudo é calculado em
// CENTAVOS inteiros — somar/comparar reais em float (0,1 + 0,2) deixa
// resíduos que travavam ou liberavam o "Finalizar Venda" por engano.
// A autoridade sobre o total continua sendo o backend; aqui só se decide
// o que a tela deixa o usuário fazer.
//
// Modelo de pagamento (uma linha de `pagamentos`):
//   { forma_pagamento, valor, valor_recebido?, numero_parcelas, meses_prazo?, status? }
// `valor` é o quanto ABATE da venda; em dinheiro, `valor_recebido` pode ser
// maior (a diferença é o troco, que nunca abate a venda).
// `status` é opcional e vale 'confirmado' quando ausente. Só pagamento
// 'confirmado' conta como PAGO (reduz o "Restante" e vai para a API).
//   - 'pendente' (aguardando confirmação, ex.: PIX): NÃO reduz o Restante, mas
//     RESERVA o valor — o próximo pagamento só pode usar o que ainda não está
//     alocado (`alocavelCentavos`), senão o operador pagaria o mesmo saldo duas
//     vezes enquanto o PIX não confirma;
//   - 'recusado' (falhou/expirou): não conta e não reserva nada.
// O PDV de hoje não tem TEF/gateway: PIX nasce 'pendente' e é confirmado pelo
// operador; as demais formas nascem 'confirmado'. O contrato do POST /vendas
// não muda (só os confirmados são enviados).

import { formatarMoeda } from './mascaras.js';

export const STATUS_PAGAMENTO = {
  CONFIRMADO: 'confirmado',
  PENDENTE: 'pendente',
  RECUSADO: 'recusado',
};

// aguardaConfirmacao: nasce pendente até o operador confirmar o recebimento.
// detalhe: o que falta perguntar antes de registrar ('recebido' | 'parcelas' |
// 'crediario'); sem detalhe, tocar na forma já registra o pagamento.
export const FORMAS_PAGAMENTO = [
  { valor: 'pix', rotulo: 'PIX', aguardaConfirmacao: true, detalhe: null },
  { valor: 'debito', rotulo: 'Débito', aguardaConfirmacao: false, detalhe: null },
  { valor: 'credito', rotulo: 'Crédito', aguardaConfirmacao: false, detalhe: 'parcelas' },
  { valor: 'dinheiro', rotulo: 'Dinheiro', aguardaConfirmacao: false, detalhe: 'recebido' },
  { valor: 'crediario', rotulo: 'Crediário', aguardaConfirmacao: false, detalhe: 'crediario' },
];

// Parcelamento: atalhos mostrados no passo e teto aceito (o campo numérico
// continua aceitando qualquer inteiro de 1 até MAX_PARCELAS).
export const MAX_PARCELAS = 12;
export const OPCOES_PARCELAS = [1, 2, 3, 6, 10, 12];

export function rotuloForma(valor) {
  return FORMAS_PAGAMENTO.find(f => f.valor === valor)?.rotulo ?? valor;
}

export function rotuloStatus(status) {
  switch (status ?? STATUS_PAGAMENTO.CONFIRMADO) {
    case STATUS_PAGAMENTO.PENDENTE: return 'Aguardando pagamento';
    case STATUS_PAGAMENTO.RECUSADO: return 'Recusado';
    default: return 'Pago';
  }
}

// Crediário é dinheiro A RECEBER, não recebido: mesmo "confirmado" (lançado na
// venda) o rótulo nunca pode dizer "Pago".
export function rotuloStatusPagamento(pagamento) {
  const status = pagamento.status ?? STATUS_PAGAMENTO.CONFIRMADO;
  if (status === STATUS_PAGAMENTO.CONFIRMADO && pagamento.forma_pagamento === 'crediario') {
    return 'A receber';
  }
  return rotuloStatus(status);
}

// Divide `valorCentavos` em `quantidade` parcelas inteiras. A sobra (1 centavo
// por parcela) vai para as PRIMEIRAS parcelas — mesma regra do backend
// (dividirEmCentavos em vendasRepository), para a tela mostrar o que será gravado.
export function dividirParcelas(valorCentavos, quantidade) {
  const base = Math.floor(valorCentavos / quantidade);
  const resto = valorCentavos - base * quantidade;
  return Array.from({ length: quantidade }, (_, i) => base + (i < resto ? 1 : 0));
}

// "3x de R$ 33,33" ou, quando não divide exato, "1x de R$ 33,34 + 2x de R$ 33,33".
export function descreverParcelas(valorCentavos, quantidade) {
  const partes = dividirParcelas(valorCentavos, quantidade);
  const grupos = [];
  for (const centavos of partes) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.centavos === centavos) ultimo.qtd += 1;
    else grupos.push({ centavos, qtd: 1 });
  }
  return grupos.map(g => `${g.qtd}x de ${formatarMoeda(deCentavos(g.centavos))}`).join(' + ');
}

// Vencimento da parcela `numero` (mesma regra do backend: soma de meses a partir
// de hoje, limitada ao último dia do mês). Crediário usa meses_prazo * numero;
// crédito, numero meses. Datas com getters LOCAIS (nunca toISOString).
export function vencimentoParcela(meses, hoje = new Date()) {
  const alvo = new Date(hoje.getFullYear(), hoje.getMonth() + meses, 1);
  const ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  const dia = Math.min(hoje.getDate(), ultimoDia);
  return `${String(dia).padStart(2, '0')}/${String(alvo.getMonth() + 1).padStart(2, '0')}/${alvo.getFullYear()}`;
}

// Vencimentos do crediário: 1ª e última parcela.
export function vencimentosCrediario(numeroParcelas, mesesPrazo, hoje = new Date()) {
  return {
    primeiro: vencimentoParcela(mesesPrazo, hoje),
    ultimo: vencimentoParcela(mesesPrazo * numeroParcelas, hoje),
  };
}

// Texto digitado (pt-BR "10,50" ou "10.50") ou number -> centavos inteiros.
// Retorna null quando vazio/inválido.
export function paraCentavos(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = typeof valor === 'number'
    ? valor
    : Number(String(valor).trim().replace(',', '.'));
  if (!Number.isFinite(numero)) return null;
  // toPrecision(12) elimina o resíduo de float (100.49999999999999 -> 100.5)
  // antes de arredondar.
  return Math.round(Number((numero * 100).toPrecision(12)));
}

export function deCentavos(centavos) {
  return centavos / 100;
}

// 500 -> "5,00" (valor para preencher o campo).
export function formatarCentavosParaCampo(centavos) {
  return (centavos / 100).toFixed(2).replace('.', ',');
}

// Filtro de digitação do campo Valor: só dígitos e um separador decimal
// (vírgula), no máximo 2 casas. Aceita "." digitado e o converte para ",".
export function sanitizarValorDigitado(texto) {
  const limpo = String(texto ?? '').replace(/[^\d.,]/g, '').replace(/\./g, ',');
  const [inteira, ...resto] = limpo.split(',');
  if (resto.length === 0) return inteira;
  return `${inteira},${resto.join('').slice(0, 2)}`;
}

export function pagamentoConfirmado(pagamento) {
  return (pagamento.status ?? 'confirmado') === 'confirmado';
}

export function calcularResumoPagamento(total, pagamentos) {
  const totalCentavos = paraCentavos(total) ?? 0;
  const confirmados = pagamentos.filter(pagamentoConfirmado);
  const pagoCentavos = confirmados.reduce((soma, p) => soma + (paraCentavos(p.valor) ?? 0), 0);
  const pendenteCentavos = pagamentos
    .filter(p => p.status === 'pendente')
    .reduce((soma, p) => soma + (paraCentavos(p.valor) ?? 0), 0);
  const trocoCentavos = confirmados.reduce((soma, p) => {
    const recebido = paraCentavos(p.valor_recebido);
    const valor = paraCentavos(p.valor) ?? 0;
    return recebido !== null && recebido > valor ? soma + (recebido - valor) : soma;
  }, 0);
  // Crediário abate o saldo da venda, mas ainda não foi recebido.
  const aReceberCentavos = confirmados
    .filter(p => p.forma_pagamento === 'crediario')
    .reduce((soma, p) => soma + (paraCentavos(p.valor) ?? 0), 0);
  const saldoCentavos = totalCentavos - pagoCentavos;
  // O que ainda pode receber um NOVO pagamento: o restante menos o que já está
  // reservado em pagamentos aguardando confirmação.
  const alocavelCentavos = saldoCentavos - pendenteCentavos;

  return {
    totalCentavos,
    pagoCentavos,
    pendenteCentavos,
    aReceberCentavos,
    trocoCentavos,
    saldoCentavos,
    alocavelCentavos,
    aguardando: pendenteCentavos > 0,
    completo: totalCentavos > 0 && saldoCentavos === 0,
    // Pagamentos já lançados que passaram do total (ex.: o desconto subiu
    // depois). O backend exige soma exata, então não finaliza.
    excedente: saldoCentavos < 0,
    // Só finaliza com tudo CONFIRMADO e nada aguardando: um PIX pendente ainda
    // pode falhar, então não se fecha a venda por cima dele.
    podeFinalizar:
      totalCentavos > 0 && pagoCentavos >= totalCentavos && saldoCentavos === 0 && pendenteCentavos === 0,
  };
}

// Operador confirmou (ou recusou) um pagamento que estava aguardando. Só um
// pagamento 'pendente' muda de estado; qualquer outro índice/estado é ignorado.
function mudarStatusPendente(pagamentos, indice, novoStatus) {
  return pagamentos.map((p, i) =>
    i === indice && p.status === STATUS_PAGAMENTO.PENDENTE ? { ...p, status: novoStatus } : p
  );
}

export function confirmarPagamentoPendente(pagamentos, indice) {
  return mudarStatusPendente(pagamentos, indice, STATUS_PAGAMENTO.CONFIRMADO);
}

export function recusarPagamentoPendente(pagamentos, indice) {
  return mudarStatusPendente(pagamentos, indice, STATUS_PAGAMENTO.RECUSADO);
}

export function removerPagamentoDaLista(pagamentos, indice) {
  return pagamentos.filter((_, i) => i !== indice);
}

// Valor sugerido no campo: sempre o saldo restante (nunca negativo).
export function valorSugerido(saldoCentavos) {
  return formatarCentavosParaCampo(Math.max(0, saldoCentavos));
}

// O que o campo Valor mostra: o texto que o operador editou — mas só enquanto
// o saldo ainda é aquele contra o qual ele editou. Mudou o saldo (pagamento
// confirmado/removido, desconto, juros, item do carrinho)? volta a sugerir o
// saldo restante, sem o operador precisar redigitar nem clicar em "Usar saldo".
export function textoValorExibido(edicao, saldoCentavos) {
  return edicao && edicao.base === saldoCentavos ? edicao.texto : valorSugerido(saldoCentavos);
}

export function calcularTroco(valorCentavos, recebidoCentavos) {
  if (recebidoCentavos === null || valorCentavos === null) return 0;
  return Math.max(0, recebidoCentavos - valorCentavos);
}

const MSG_ZERO = 'Informe um valor maior que R$ 0,00.';

// Valida o valor digitado contra o que ainda pode ser pago (saldo restante já
// descontado do que está reservado em pagamentos aguardando). Retorna
// { valor } (em reais, 2 casas) quando válido ou { erro } com a mensagem inline.
export function validarNovoPagamento(textoValor, saldoCentavos) {
  const centavos = paraCentavos(textoValor);

  if (centavos === null || centavos <= 0) {
    return { erro: MSG_ZERO };
  }

  if (centavos > Math.max(0, saldoCentavos)) {
    return {
      erro: `O valor informado é maior que o saldo restante de ${formatarMoeda(deCentavos(Math.max(0, saldoCentavos)))}.`,
    };
  }

  return { valor: deCentavos(centavos) };
}

// Monta o pagamento a ser lançado, aplicando TODAS as regras de entrada.
// Retorna { pagamento } ou { campo, erro } (campo = onde mostrar a mensagem).
export function montarPagamento({
  forma,
  textoValor,
  saldoCentavos,
  textoRecebido = '',
  parcelas = '1',
  mesesPrazo = '1',
  temCliente = false,
}) {
  if (!forma) return { campo: 'forma', erro: 'Escolha como o cliente vai pagar.' };

  const validacao = validarNovoPagamento(textoValor, saldoCentavos);
  if (validacao.erro) return { campo: 'valor', erro: validacao.erro };
  const { valor } = validacao;
  const valorCentavos = paraCentavos(valor);

  if (forma === 'crediario' && !temCliente) {
    return { campo: 'forma', erro: 'Crediário exige um cliente identificado.' };
  }

  let recebido;
  if (forma === 'dinheiro') {
    const recebidoCentavos = textoRecebido === '' ? valorCentavos : paraCentavos(textoRecebido);
    if (recebidoCentavos === null || recebidoCentavos < valorCentavos) {
      return { campo: 'recebido', erro: 'O valor recebido em dinheiro não pode ser menor que o pagamento.' };
    }
    recebido = deCentavos(recebidoCentavos);
  }

  // Parcelas e prazo só existem para crédito/crediário. Validar para as outras
  // formas fazia PIX/Débito falharem em silêncio por causa de um campo que nem
  // está na tela.
  const parcelado = forma === 'credito' || forma === 'crediario';
  const nParcelas = parcelado ? Number(parcelas) : 1;
  const nMeses = forma === 'crediario' ? Number(mesesPrazo) : 1;

  if (parcelado) {
    if (!Number.isInteger(nParcelas) || nParcelas < 1 || nParcelas > MAX_PARCELAS) {
      return { campo: 'parcelas', erro: `Informe de 1 a ${MAX_PARCELAS} parcelas.` };
    }
    if (valorCentavos < nParcelas) {
      return { campo: 'parcelas', erro: 'O valor é pequeno demais para esse número de parcelas.' };
    }
  }

  if (forma === 'crediario' && (!Number.isInteger(nMeses) || nMeses < 1)) {
    return { campo: 'meses', erro: 'Informe o prazo em meses para o crediário.' };
  }

  return {
    pagamento: {
      forma_pagamento: forma,
      valor,
      ...(forma === 'dinheiro' ? { valor_recebido: recebido } : {}),
      numero_parcelas: nParcelas,
      ...(forma === 'crediario' ? { meses_prazo: nMeses } : {}),
      status: FORMAS_PAGAMENTO.find(f => f.valor === forma)?.aguardaConfirmacao
        ? STATUS_PAGAMENTO.PENDENTE
        : STATUS_PAGAMENTO.CONFIRMADO,
    },
  };
}

// Pagamento pertence a UMA venda: se o carrinho ficou vazio (limpar, ou remover
// o último item), os pagamentos lançados somem junto — nada de pagamento
// residual aparecendo numa venda nova.
export function pagamentosAposMudancaDoCarrinho(carrinho, pagamentos) {
  return carrinho.length === 0 ? [] : pagamentos;
}

// Payload para a API: só o que foi confirmado, sem o campo interno `status`.
export function pagamentosParaEnvio(pagamentos) {
  return pagamentos.filter(pagamentoConfirmado).map(({ status: _status, ...resto }) => resto);
}
