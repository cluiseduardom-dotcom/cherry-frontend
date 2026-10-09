import { describe, it, expect } from 'vitest';
import {
  paraCentavos,
  deCentavos,
  sanitizarValorDigitado,
  calcularResumoPagamento,
  validarNovoPagamento,
  formatarCentavosParaCampo,
  valorSugerido,
  textoValorExibido,
  calcularTroco,
  montarPagamento,
  pagamentosParaEnvio,
  pagamentosAposMudancaDoCarrinho,
  confirmarPagamentoPendente,
  recusarPagamentoPendente,
  removerPagamentoDaLista,
  rotuloStatus,
  FORMAS_PAGAMENTO,
} from './pagamentoVenda.js';

// Simula o operador como o PagamentoPDV: o campo Valor mostra o que ainda pode
// ser alocado (restante menos o reservado em PIX aguardando); tocar na forma
// registra o pagamento. PIX nasce "aguardando": por padrão o operador confirma
// o recebimento em seguida (passe { confirmar: false } para deixá-lo pendente).
function lancar(total, pagamentos, forma, extra = {}) {
  const { confirmar = true, ...resto } = extra;
  const resumo = calcularResumoPagamento(total, pagamentos);
  const textoValor = resto.textoValor ?? textoValorExibido(null, resumo.alocavelCentavos);
  const r = montarPagamento({ forma, saldoCentavos: resumo.alocavelCentavos, temCliente: true, ...resto, textoValor });
  if (!r.pagamento) return { pagamentos, erro: r };
  let lista = [...pagamentos, r.pagamento];
  if (confirmar && r.pagamento.status === 'pendente') lista = confirmarPagamentoPendente(lista, lista.length - 1);
  return { pagamentos: lista, erro: null };
}

describe('paraCentavos', () => {
  it('converte texto pt-BR e ponto decimal sem erro de ponto flutuante', () => {
    expect(paraCentavos('10,50')).toBe(1050);
    expect(paraCentavos('10.5')).toBe(1050);
    expect(paraCentavos('0,1')).toBe(10);
    expect(paraCentavos('19,99')).toBe(1999);
    expect(paraCentavos('1.005')).toBe(101);
  });

  it('converte number arredondando em centavos', () => {
    expect(paraCentavos(0.1 + 0.2)).toBe(30);
    expect(paraCentavos(1.15)).toBe(115);
  });

  it('retorna null para vazio ou inválido', () => {
    expect(paraCentavos('')).toBeNull();
    expect(paraCentavos('abc')).toBeNull();
    expect(paraCentavos(undefined)).toBeNull();
  });
});

describe('deCentavos / formatarCentavosParaCampo', () => {
  it('volta para reais e formata para o campo', () => {
    expect(deCentavos(1050)).toBe(10.5);
    expect(formatarCentavosParaCampo(500)).toBe('5,00');
    expect(formatarCentavosParaCampo(0)).toBe('0,00');
  });
});

describe('sanitizarValorDigitado', () => {
  it('mantém só dígitos e um separador, com no máximo 2 decimais', () => {
    expect(sanitizarValorDigitado('12a3')).toBe('123');
    expect(sanitizarValorDigitado('1,2,3')).toBe('1,23');
    expect(sanitizarValorDigitado('10,999')).toBe('10,99');
    expect(sanitizarValorDigitado('10.5')).toBe('10,5');
    expect(sanitizarValorDigitado('-5')).toBe('5');
  });
});

describe('calcularResumoPagamento', () => {
  it('total 10 / pago 0: saldo 10, não pode finalizar', () => {
    expect(calcularResumoPagamento(10, [])).toMatchObject({ totalCentavos: 1000, pagoCentavos: 0, saldoCentavos: 1000, completo: false, podeFinalizar: false });
  });

  it('pago 5 de 10: saldo 5, não pode finalizar', () => {
    expect(calcularResumoPagamento(10, [{ valor: 5 }])).toMatchObject({ pagoCentavos: 500, saldoCentavos: 500, podeFinalizar: false });
  });

  it('pago 5 + 5 de 10: saldo 0, pode finalizar', () => {
    expect(calcularResumoPagamento(10, [{ valor: 5 }, { valor: 5 }])).toMatchObject({ saldoCentavos: 0, completo: true, podeFinalizar: true });
  });

  it('0,10 + 0,20 fecha exatamente 0,30 (sem erro de float)', () => {
    const r = calcularResumoPagamento(0.3, [{ valor: 0.1 }, { valor: 0.2 }]);
    expect(r.saldoCentavos).toBe(0);
    expect(r.podeFinalizar).toBe(true);
  });

  it('pagamentos acima do total (ex.: desconto/juros mudou depois) não permitem finalizar', () => {
    const r = calcularResumoPagamento(8, [{ valor: 10 }]);
    expect(r).toMatchObject({ saldoCentavos: -200, excedente: true, podeFinalizar: false });
  });

  it('total zero nunca finaliza', () => {
    expect(calcularResumoPagamento(0, []).podeFinalizar).toBe(false);
  });

  it('pagamento PENDENTE não conta como pago', () => {
    const r = calcularResumoPagamento(50, [{ valor: 25, status: 'confirmado' }, { valor: 25, status: 'pendente' }]);
    expect(r).toMatchObject({ pagoCentavos: 2500, saldoCentavos: 2500, pendenteCentavos: 2500, podeFinalizar: false });
  });

  it('pagamento RECUSADO não altera o saldo', () => {
    const r = calcularResumoPagamento(50, [{ valor: 25 }, { valor: 25, status: 'recusado' }]);
    expect(r).toMatchObject({ pagoCentavos: 2500, saldoCentavos: 2500, podeFinalizar: false });
  });

  it('troco: dinheiro recebido acima do valor não abate a venda além do valor', () => {
    const r = calcularResumoPagamento(50, [{ forma_pagamento: 'dinheiro', valor: 50, valor_recebido: 100 }]);
    expect(r).toMatchObject({ pagoCentavos: 5000, saldoCentavos: 0, trocoCentavos: 5000, podeFinalizar: true });
  });
});

describe('validarNovoPagamento', () => {
  it('rejeita campo vazio e zero', () => {
    expect(validarNovoPagamento('', 1000).erro).toBe('Informe um valor maior que R$ 0,00.');
    expect(validarNovoPagamento('0,00', 1000).erro).toBe('Informe um valor maior que R$ 0,00.');
    expect(validarNovoPagamento('0', 1000).erro).toBe('Informe um valor maior que R$ 0,00.');
  });

  it('aceita valor menor ou igual ao saldo', () => {
    expect(validarNovoPagamento('5,00', 1000)).toEqual({ valor: 5 });
    expect(validarNovoPagamento('10,00', 1000)).toEqual({ valor: 10 });
  });

  it('rejeita valor acima do saldo, citando o saldo', () => {
    expect(validarNovoPagamento('10,01', 1000).erro).toMatch(/^O valor informado é maior que o saldo restante de R\$\s10,00\.$/);
  });

  it('rejeita qualquer valor quando não há saldo (nunca saldo negativo)', () => {
    expect(validarNovoPagamento('1,00', 0).erro).toMatch(/saldo restante de R\$\s0,00/);
    expect(validarNovoPagamento('1,00', -200).erro).toMatch(/saldo restante de R\$\s0,00/);
  });
});

describe('valor sugerido (preenchimento automático do saldo)', () => {
  it('sugere o saldo restante, nunca negativo', () => {
    expect(valorSugerido(5000)).toBe('50,00');
    expect(valorSugerido(0)).toBe('0,00');
    expect(valorSugerido(-200)).toBe('0,00');
  });

  it('mostra o que o operador editou só enquanto o saldo for o mesmo', () => {
    const edicao = { texto: '10,00', base: 5000 };
    expect(textoValorExibido(edicao, 5000)).toBe('10,00');
    expect(textoValorExibido(edicao, 2500)).toBe('25,00'); // saldo mudou: volta a sugerir o saldo
    expect(textoValorExibido(edicao, 4000)).toBe('40,00');
    expect(textoValorExibido(null, 5000)).toBe('50,00');
  });
});

describe('montarPagamento', () => {
  it('exige a forma de pagamento escolhida pelo operador', () => {
    expect(montarPagamento({ forma: null, textoValor: '50,00', saldoCentavos: 5000 })).toMatchObject({ campo: 'forma' });
  });

  it('pagamento zero não é montado', () => {
    expect(montarPagamento({ forma: 'pix', textoValor: '0,00', saldoCentavos: 5000 })).toMatchObject({ campo: 'valor', erro: 'Informe um valor maior que R$ 0,00.' });
  });

  it('pagamento maior que o saldo não é montado', () => {
    expect(montarPagamento({ forma: 'pix', textoValor: '50,01', saldoCentavos: 5000 })).toMatchObject({ campo: 'valor' });
  });

  it('crediário exige cliente', () => {
    expect(montarPagamento({ forma: 'crediario', textoValor: '10,00', saldoCentavos: 5000, temCliente: false })).toMatchObject({ campo: 'forma' });
  });

  it('dinheiro recebido menor que o valor é rejeitado', () => {
    expect(montarPagamento({ forma: 'dinheiro', textoValor: '50,00', textoRecebido: '40,00', saldoCentavos: 5000 })).toMatchObject({ campo: 'recebido' });
  });

  it('dinheiro sem recebido informado assume recebido = valor', () => {
    expect(montarPagamento({ forma: 'dinheiro', textoValor: '50,00', saldoCentavos: 5000 }).pagamento).toMatchObject({ valor: 50, valor_recebido: 50 });
  });

  it('crédito leva o número de parcelas; os demais sempre 1', () => {
    expect(montarPagamento({ forma: 'credito', textoValor: '10,00', parcelas: '3', saldoCentavos: 5000 }).pagamento.numero_parcelas).toBe(3);
    expect(montarPagamento({ forma: 'debito', textoValor: '10,00', parcelas: '3', saldoCentavos: 5000 }).pagamento.numero_parcelas).toBe(1);
  });
});

describe('calcularTroco', () => {
  it('troco = recebido - valor, nunca negativo', () => {
    expect(calcularTroco(5000, 10000)).toBe(5000);
    expect(calcularTroco(5000, 5000)).toBe(0);
    expect(calcularTroco(5000, 3000)).toBe(0);
    expect(calcularTroco(5000, null)).toBe(0);
  });
});

describe('cenários de PDV (fluxo completo)', () => {
  it('1. pagamento único exato', () => {
    const r = lancar(50, [], 'pix');
    expect(calcularResumoPagamento(50, r.pagamentos)).toMatchObject({ podeFinalizar: true, saldoCentavos: 0 });
  });

  it('2/3. PIX parcial 25 + débito automático 25 (exemplo obrigatório R$ 50)', () => {
    expect(textoValorExibido(null, calcularResumoPagamento(50, []).saldoCentavos)).toBe('50,00');
    let s = lancar(50, [], 'pix', { textoValor: '25,00' });
    let resumo = calcularResumoPagamento(50, s.pagamentos);
    expect(resumo).toMatchObject({ pagoCentavos: 2500, saldoCentavos: 2500, podeFinalizar: false });
    expect(textoValorExibido(null, resumo.saldoCentavos)).toBe('25,00'); // próximo valor já vem preenchido
    s = lancar(50, s.pagamentos, 'debito'); // sem redigitar valor
    expect(s.pagamentos[1]).toMatchObject({ forma_pagamento: 'debito', valor: 25 });
    resumo = calcularResumoPagamento(50, s.pagamentos);
    expect(resumo).toMatchObject({ pagoCentavos: 5000, saldoCentavos: 0, podeFinalizar: true });
  });

  it('4. PIX 30 + crédito automático 70 (R$ 100)', () => {
    let s = lancar(100, [], 'pix', { textoValor: '30,00' });
    s = lancar(100, s.pagamentos, 'credito');
    expect(s.pagamentos[1].valor).toBe(70);
    expect(calcularResumoPagamento(100, s.pagamentos).podeFinalizar).toBe(true);
  });

  it('5. três formas: PIX 30 + dinheiro 20 + crédito automático 50 (R$ 100)', () => {
    let s = lancar(100, [], 'pix', { textoValor: '30,00' });
    s = lancar(100, s.pagamentos, 'dinheiro', { textoValor: '20,00' });
    expect(calcularResumoPagamento(100, s.pagamentos).saldoCentavos).toBe(5000);
    s = lancar(100, s.pagamentos, 'credito');
    expect(s.pagamentos.map(p => p.valor)).toEqual([30, 20, 50]);
    expect(calcularResumoPagamento(100, s.pagamentos).podeFinalizar).toBe(true);
  });

  it('6/7. zero e acima do saldo não entram no estado', () => {
    const zero = lancar(50, [], 'pix', { textoValor: '0,00' });
    expect(zero.erro.campo).toBe('valor');
    expect(zero.pagamentos).toEqual([]);
    const acima = lancar(50, [], 'pix', { textoValor: '50,01' });
    expect(acima.erro.campo).toBe('valor');
    expect(acima.pagamentos).toEqual([]);
  });

  it('8. remover pagamento recalcula Pago e Restante e volta a sugerir o saldo', () => {
    let s = lancar(50, [], 'pix', { textoValor: '25,00' });
    s = lancar(50, s.pagamentos, 'debito');
    const sem = s.pagamentos.filter((_, i) => i !== 1);
    const resumo = calcularResumoPagamento(50, sem);
    expect(resumo).toMatchObject({ pagoCentavos: 2500, saldoCentavos: 2500, podeFinalizar: false });
    expect(textoValorExibido(null, resumo.saldoCentavos)).toBe('25,00');
  });

  it('9/10. recusado e pendente não deixam finalizar', () => {
    const pagamentos = [{ valor: 25, status: 'confirmado' }, { valor: 25, status: 'recusado' }, { valor: 25, status: 'pendente' }];
    expect(calcularResumoPagamento(50, pagamentos)).toMatchObject({ saldoCentavos: 2500, podeFinalizar: false });
    expect(pagamentosParaEnvio(pagamentos)).toEqual([{ valor: 25 }]);
  });

  it('11. dinheiro com troco: venda 50, recebido 100, troco 50, venda paga', () => {
    const s = lancar(50, [], 'dinheiro', { textoRecebido: '100,00' });
    expect(s.pagamentos[0]).toMatchObject({ valor: 50, valor_recebido: 100 });
    expect(calcularTroco(5000, paraCentavos('100,00'))).toBe(5000);
    expect(calcularResumoPagamento(50, s.pagamentos)).toMatchObject({ podeFinalizar: true, trocoCentavos: 5000 });
  });

  it('12. centavos: 0,10 + 0,20 em venda de 0,30', () => {
    let s = lancar(0.3, [], 'pix', { textoValor: '0,10' });
    s = lancar(0.3, s.pagamentos, 'debito'); // sugerido = 0,20
    expect(s.pagamentos[1].valor).toBe(0.2);
    expect(calcularResumoPagamento(0.3, s.pagamentos).podeFinalizar).toBe(true);
  });

  it('13. desconto aplicado depois de um pagamento: total cai, excedente bloqueia finalizar', () => {
    const s = lancar(50, [], 'pix', { textoValor: '30,00' });
    // desconto de 25 -> total 25: pago (30) passa do total
    expect(calcularResumoPagamento(25, s.pagamentos)).toMatchObject({ excedente: true, saldoCentavos: -500, podeFinalizar: false });
    // desconto de 20 -> total 30: pago exato, libera
    expect(calcularResumoPagamento(30, s.pagamentos).podeFinalizar).toBe(true);
    // desconto de 10 -> total 40: falta 10, e o campo sugere o novo saldo
    const resumo = calcularResumoPagamento(40, s.pagamentos);
    expect(resumo.podeFinalizar).toBe(false);
    expect(valorSugerido(resumo.saldoCentavos)).toBe('10,00');
  });

  it('14. juros depois de um pagamento: total sobe, falta pagar a diferença', () => {
    const s = lancar(50, [], 'pix'); // pagou os 50
    expect(calcularResumoPagamento(50, s.pagamentos).podeFinalizar).toBe(true);
    const resumo = calcularResumoPagamento(52.5, s.pagamentos); // +2,50 de juros
    expect(resumo).toMatchObject({ saldoCentavos: 250, podeFinalizar: false });
    expect(valorSugerido(resumo.saldoCentavos)).toBe('2,50');
  });
});

describe('pagamentosParaEnvio', () => {
  it('remove o campo interno status do payload', () => {
    expect(pagamentosParaEnvio([{ forma_pagamento: 'pix', valor: 5, numero_parcelas: 1, status: 'confirmado' }]))
      .toEqual([{ forma_pagamento: 'pix', valor: 5, numero_parcelas: 1 }]);
  });
});

describe('pagamentos residuais ao limpar o carrinho', () => {
  it('venda R$ 50 com PIX R$ 25 parcial; carrinho esvaziado -> nova venda sem pagamentos', () => {
    // venda de 50, PIX parcial de 25
    const venda = lancar(50, [], 'pix', { textoValor: '25,00' });
    const parcial = calcularResumoPagamento(50, venda.pagamentos);
    expect(parcial).toMatchObject({ pagoCentavos: 2500, saldoCentavos: 2500 });

    // Limpar carrinho: carrinho vazio -> pagamentos descartados
    const aposLimpar = pagamentosAposMudancaDoCarrinho([], venda.pagamentos);
    expect(aposLimpar).toEqual([]);

    // nova venda: total 0, pago 0, restante 0, nada a finalizar
    expect(calcularResumoPagamento(0, aposLimpar)).toMatchObject({
      totalCentavos: 0, pagoCentavos: 0, saldoCentavos: 0, excedente: false, podeFinalizar: false,
    });
  });

  it('remover o ÚLTIMO item também descarta os pagamentos; remover um de vários mantém', () => {
    const pagamentos = [{ forma_pagamento: 'pix', valor: 25 }];
    expect(pagamentosAposMudancaDoCarrinho([], pagamentos)).toEqual([]);
    expect(pagamentosAposMudancaDoCarrinho([{ id: 1 }], pagamentos)).toBe(pagamentos);
  });

  it('nova venda depois de limpar não herda o PIX anterior: o saldo sugerido é o total novo', () => {
    const aposLimpar = pagamentosAposMudancaDoCarrinho([], [{ valor: 25 }]);
    const resumoNova = calcularResumoPagamento(30, aposLimpar);
    expect(resumoNova).toMatchObject({ pagoCentavos: 0, saldoCentavos: 3000 });
    expect(valorSugerido(resumoNova.saldoCentavos)).toBe('30,00');
  });
});

describe('fluxo orientado pelo saldo restante (PDV)', () => {
  it('PIX nasce aguardando confirmação; débito/crédito/dinheiro nascem confirmados', () => {
    const status = f => montarPagamento({ forma: f, textoValor: '10,00', saldoCentavos: 5000, temCliente: true }).pagamento.status;
    expect(status('pix')).toBe('pendente');
    expect(status('debito')).toBe('confirmado');
    expect(status('credito')).toBe('confirmado');
    expect(status('dinheiro')).toBe('confirmado');
  });

  it('1. R$ 50: valor inicial = 50 -> PIX 25 confirmado -> restante 25 -> próximo valor 25 -> DÉBITO automático 25 -> completo', () => {
    let resumo = calcularResumoPagamento(50, []);
    expect(textoValorExibido(null, resumo.alocavelCentavos)).toBe('50,00');
    expect(resumo).toMatchObject({ totalCentavos: 5000, pagoCentavos: 0, saldoCentavos: 5000 });

    let s = lancar(50, [], 'pix', { textoValor: '25,00' });
    resumo = calcularResumoPagamento(50, s.pagamentos);
    expect(resumo).toMatchObject({ pagoCentavos: 2500, saldoCentavos: 2500, aguardando: false, podeFinalizar: false });
    expect(textoValorExibido(null, resumo.alocavelCentavos)).toBe('25,00');

    s = lancar(50, s.pagamentos, 'debito'); // sem redigitar
    expect(s.pagamentos[1]).toMatchObject({ forma_pagamento: 'debito', valor: 25 });
    resumo = calcularResumoPagamento(50, s.pagamentos);
    expect(resumo).toMatchObject({ pagoCentavos: 5000, saldoCentavos: 0, completo: true, podeFinalizar: true });
  });

  it('2. R$ 50 -> PIX R$ 50 (valor automático) -> completo', () => {
    const s = lancar(50, [], 'pix');
    expect(s.pagamentos[0].valor).toBe(50);
    expect(calcularResumoPagamento(50, s.pagamentos)).toMatchObject({ completo: true, podeFinalizar: true });
  });

  it('3. R$ 100 -> PIX 30 -> DÉBITO automático 70', () => {
    let s = lancar(100, [], 'pix', { textoValor: '30,00' });
    s = lancar(100, s.pagamentos, 'debito');
    expect(s.pagamentos.map(p => p.valor)).toEqual([30, 70]);
    expect(calcularResumoPagamento(100, s.pagamentos).podeFinalizar).toBe(true);
  });

  it('4. R$ 100 -> PIX 30 -> DÉBITO 40 -> CRÉDITO automático 30', () => {
    let s = lancar(100, [], 'pix', { textoValor: '30,00' });
    s = lancar(100, s.pagamentos, 'debito', { textoValor: '40,00' });
    expect(calcularResumoPagamento(100, s.pagamentos)).toMatchObject({ saldoCentavos: 3000, alocavelCentavos: 3000 });
    s = lancar(100, s.pagamentos, 'credito');
    expect(s.pagamentos.map(p => p.valor)).toEqual([30, 40, 30]);
    expect(calcularResumoPagamento(100, s.pagamentos).podeFinalizar).toBe(true);
  });

  it('5. pagamento acima do saldo é rejeitado (inclusive acima do que ainda está alocável)', () => {
    const acima = lancar(50, [], 'debito', { textoValor: '50,01' });
    expect(acima.erro).toMatchObject({ campo: 'valor' });
    expect(acima.pagamentos).toEqual([]);
    // PIX 30 aguardando reserva 30: só restam 20 para alocar
    const pix = lancar(50, [], 'pix', { textoValor: '30,00', confirmar: false });
    const tentativa = lancar(50, pix.pagamentos, 'debito', { textoValor: '25,00' });
    expect(tentativa.erro).toMatchObject({ campo: 'valor' });
    expect(tentativa.pagamentos).toHaveLength(1);
  });

  it('6. pagamento de R$ 0 é rejeitado', () => {
    const zero = lancar(50, [], 'debito', { textoValor: '0,00' });
    expect(zero.erro).toMatchObject({ campo: 'valor', erro: 'Informe um valor maior que R$ 0,00.' });
    expect(zero.pagamentos).toEqual([]);
  });

  it('7. remover pagamento recalcula o saldo e o campo volta a sugerir o novo restante', () => {
    let s = lancar(50, [], 'pix', { textoValor: '25,00' });
    s = lancar(50, s.pagamentos, 'debito');
    const sem = removerPagamentoDaLista(s.pagamentos, 1);
    const resumo = calcularResumoPagamento(50, sem);
    expect(resumo).toMatchObject({ pagoCentavos: 2500, saldoCentavos: 2500, podeFinalizar: false });
    expect(textoValorExibido(null, resumo.alocavelCentavos)).toBe('25,00');
  });

  it('8. pagamento RECUSADO não reduz o saldo, não reserva valor e não bloqueia um novo pagamento', () => {
    let s = lancar(50, [], 'pix', { textoValor: '25,00', confirmar: false });
    s = { pagamentos: recusarPagamentoPendente(s.pagamentos, 0) };
    const resumo = calcularResumoPagamento(50, s.pagamentos);
    expect(resumo).toMatchObject({ pagoCentavos: 0, saldoCentavos: 5000, pendenteCentavos: 0, alocavelCentavos: 5000, podeFinalizar: false });
    expect(rotuloStatus(s.pagamentos[0].status)).toBe('Recusado');
    expect(pagamentosParaEnvio(s.pagamentos)).toEqual([]);
  });

  it('9. PIX PENDENTE não reduz o restante, reserva o valor e impede finalizar', () => {
    const s = lancar(50, [], 'pix', { textoValor: '25,00', confirmar: false });
    const resumo = calcularResumoPagamento(50, s.pagamentos);
    expect(s.pagamentos[0].status).toBe('pendente');
    expect(rotuloStatus('pendente')).toBe('Aguardando pagamento');
    expect(resumo).toMatchObject({
      pagoCentavos: 0, saldoCentavos: 5000, pendenteCentavos: 2500, alocavelCentavos: 2500, aguardando: true, podeFinalizar: false,
    });
    // o próximo pagamento sugere só o que ainda não está reservado
    expect(textoValorExibido(null, resumo.alocavelCentavos)).toBe('25,00');
    expect(pagamentosParaEnvio(s.pagamentos)).toEqual([]);
  });

  it('9b. venda totalmente alocada em PIX pendente: não finaliza até confirmar; confirmado, finaliza', () => {
    const pendente = lancar(50, [], 'pix', { confirmar: false });
    expect(calcularResumoPagamento(50, pendente.pagamentos)).toMatchObject({ saldoCentavos: 5000, alocavelCentavos: 0, podeFinalizar: false });
    const confirmado = confirmarPagamentoPendente(pendente.pagamentos, 0);
    expect(calcularResumoPagamento(50, confirmado)).toMatchObject({ saldoCentavos: 0, aguardando: false, podeFinalizar: true });
  });

  it('só um pagamento pendente muda de estado (confirmar/recusar ignoram os demais)', () => {
    const base = [{ forma_pagamento: 'debito', valor: 10, status: 'confirmado' }, { forma_pagamento: 'pix', valor: 5, status: 'pendente' }];
    expect(confirmarPagamentoPendente(base, 0)[0].status).toBe('confirmado');
    expect(recusarPagamentoPendente(base, 0)[0].status).toBe('confirmado');
    expect(recusarPagamentoPendente(base, 1)[1].status).toBe('recusado');
    expect(base[1].status).toBe('pendente'); // imutável
  });

  it('10. dinheiro: venda R$ 50, cliente entrega R$ 100 -> troco R$ 50 e venda paga', () => {
    const s = lancar(50, [], 'dinheiro', { textoRecebido: '100,00' });
    expect(s.pagamentos[0]).toMatchObject({ forma_pagamento: 'dinheiro', valor: 50, valor_recebido: 100, status: 'confirmado' });
    expect(calcularTroco(5000, paraCentavos('100,00'))).toBe(5000);
    expect(calcularResumoPagamento(50, s.pagamentos)).toMatchObject({ pagoCentavos: 5000, trocoCentavos: 5000, completo: true, podeFinalizar: true });
  });

  it('11. desconto e juros refletem no total e o campo acompanha o novo restante', () => {
    const s = lancar(100, [], 'pix', { textoValor: '30,00' });
    // desconto de 10 -> total 90 -> restante 60
    let resumo = calcularResumoPagamento(90, s.pagamentos);
    expect(resumo).toMatchObject({ saldoCentavos: 6000 });
    expect(textoValorExibido(null, resumo.alocavelCentavos)).toBe('60,00');
    // juros de 5 sobre os 100 -> total 105 -> restante 75
    resumo = calcularResumoPagamento(105, s.pagamentos);
    expect(textoValorExibido(null, resumo.alocavelCentavos)).toBe('75,00');
    // editado à mão contra um restante antigo volta ao novo restante
    expect(textoValorExibido({ texto: '20,00', base: 7000 }, resumo.alocavelCentavos)).toBe('75,00');
  });

  it('12. só finaliza com o pagamento completo, confirmado e sem nada aguardando', () => {
    expect(calcularResumoPagamento(50, []).podeFinalizar).toBe(false);
    expect(calcularResumoPagamento(50, [{ valor: 25 }]).podeFinalizar).toBe(false);
    expect(calcularResumoPagamento(50, [{ valor: 25 }, { valor: 25, status: 'pendente' }]).podeFinalizar).toBe(false);
    expect(calcularResumoPagamento(50, [{ valor: 25 }, { valor: 25 }]).podeFinalizar).toBe(true);
  });

  it('formas: PIX aguarda confirmação; dinheiro/crédito/crediário pedem um detalhe; PIX/débito registram direto', () => {
    const f = Object.fromEntries(FORMAS_PAGAMENTO.map(x => [x.valor, x]));
    expect(f.pix).toMatchObject({ aguardaConfirmacao: true, detalhe: null });
    expect(f.debito).toMatchObject({ aguardaConfirmacao: false, detalhe: null });
    expect(f.dinheiro.detalhe).toBe('recebido');
    expect(f.credito.detalhe).toBe('parcelas');
    expect(f.crediario.detalhe).toBe('crediario');
  });
});
