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
// 'confirmado' conta como pago — 'pendente' e 'recusado' nunca mexem no saldo
// (o PDV de hoje ainda não tem TEF/gateway, então tudo nasce confirmado, mas o
// modelo já está pronto para quando houver).

import { formatarMoeda } from './mascaras.js';

export const FORMAS_PAGAMENTO = [
  { valor: 'pix', rotulo: 'PIX' },
  { valor: 'debito', rotulo: 'Débito' },
  { valor: 'credito', rotulo: 'Crédito' },
  { valor: 'dinheiro', rotulo: 'Dinheiro' },
  { valor: 'crediario', rotulo: 'Crediário' },
];

export function rotuloForma(valor) {
  return FORMAS_PAGAMENTO.find(f => f.valor === valor)?.rotulo ?? valor;
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
  const saldoCentavos = totalCentavos - pagoCentavos;

  return {
    totalCentavos,
    pagoCentavos,
    pendenteCentavos,
    trocoCentavos,
    saldoCentavos,
    completo: totalCentavos > 0 && saldoCentavos === 0,
    // Pagamentos já lançados que passaram do total (ex.: o desconto subiu
    // depois). O backend exige soma exata, então não finaliza.
    excedente: saldoCentavos < 0,
    podeFinalizar: totalCentavos > 0 && pagoCentavos >= totalCentavos && saldoCentavos === 0,
  };
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

// Valida o valor digitado contra o saldo restante. Retorna { valor } (em
// reais, 2 casas) quando válido ou { erro } com a mensagem inline.
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

  const nParcelas = Number(parcelas);
  const nMeses = Number(mesesPrazo);

  if (!Number.isInteger(nParcelas) || nParcelas < 1) {
    return { campo: 'parcelas', erro: 'Informe um número de parcelas válido.' };
  }

  if (forma === 'crediario' && nParcelas > 1 && (!Number.isInteger(nMeses) || nMeses < 1)) {
    return { campo: 'meses', erro: 'Informe o prazo em meses para o crediário parcelado.' };
  }

  return {
    pagamento: {
      forma_pagamento: forma,
      valor,
      ...(forma === 'dinheiro' ? { valor_recebido: recebido } : {}),
      numero_parcelas: forma === 'credito' || forma === 'crediario' ? nParcelas : 1,
      ...(forma === 'crediario' ? { meses_prazo: nMeses } : {}),
      status: 'confirmado',
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
