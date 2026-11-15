import { describe, it, expect } from 'vitest';
import {
  MAX_PARCELAS,
  calcularResumoPagamento,
  descreverParcelas,
  dividirParcelas,
  montarPagamento,
  rotuloStatusPagamento,
  vencimentoParcela,
  vencimentosCrediario,
} from './pagamentoVenda.js';

const nbsp = s => s.replace(/R\$ /g, 'R$ ');
const soma = arr => arr.reduce((a, b) => a + b, 0);

describe('dividirParcelas — centavos exatos, sobra nas primeiras', () => {
  it('R$ 100,00 em 3x = 33,34 + 33,33 + 33,33', () => {
    expect(dividirParcelas(10000, 3)).toEqual([3334, 3333, 3333]);
  });

  it('divisão exata não gera sobra', () => {
    expect(dividirParcelas(7000, 2)).toEqual([3500, 3500]);
    expect(dividirParcelas(6000, 6)).toEqual([1000, 1000, 1000, 1000, 1000, 1000]);
  });

  it('sobra de mais de 1 centavo vai uma para cada uma das primeiras parcelas', () => {
    expect(dividirParcelas(101, 3)).toEqual([34, 34, 33]);
  });

  it('1x devolve o valor inteiro', () => {
    expect(dividirParcelas(10000, 1)).toEqual([10000]);
  });

  it('a soma das parcelas é sempre o valor original (1..12 parcelas)', () => {
    for (const valor of [1, 99, 100, 10000, 12345, 99999]) {
      for (let n = 1; n <= MAX_PARCELAS; n++) {
        if (valor < n) continue;
        const partes = dividirParcelas(valor, n);
        expect(partes).toHaveLength(n);
        expect(soma(partes)).toBe(valor);
        expect(Math.max(...partes) - Math.min(...partes)).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('descreverParcelas — "3x de R$ XX,XX"', () => {
  it('divisão exata', () => {
    expect(descreverParcelas(7000, 3)).toBe(nbsp('1x de R$ 23,34 + 2x de R$ 23,33'));
    expect(descreverParcelas(6000, 3)).toBe(nbsp('3x de R$ 20,00'));
    expect(descreverParcelas(10000, 1)).toBe(nbsp('1x de R$ 100,00'));
  });

  it('com sobra mostra os dois valores', () => {
    expect(descreverParcelas(10000, 3)).toBe(nbsp('1x de R$ 33,34 + 2x de R$ 33,33'));
  });
});

describe('montarPagamento — parcelas só valem para crédito e crediário', () => {
  const base = { textoValor: '100,00', saldoCentavos: 10000 };

  it('PIX, Débito e Dinheiro ignoram parcelas inválidas (não falham em silêncio)', () => {
    for (const forma of ['pix', 'debito', 'dinheiro']) {
      const r = montarPagamento({ ...base, forma, parcelas: '0' });
      expect(r.erro).toBeUndefined();
      expect(r.pagamento.numero_parcelas).toBe(1);
      expect(r.pagamento.meses_prazo).toBeUndefined();
    }
  });

  it('crédito 3x mantém o número de parcelas', () => {
    const r = montarPagamento({ ...base, forma: 'credito', parcelas: '3' });
    expect(r.pagamento).toMatchObject({ forma_pagamento: 'credito', valor: 100, numero_parcelas: 3, status: 'confirmado' });
    expect(r.pagamento.meses_prazo).toBeUndefined();
  });

  it('crédito rejeita 0, decimal e acima do máximo, no campo "parcelas"', () => {
    for (const parcelas of ['0', '1.5', String(MAX_PARCELAS + 1), '', 'abc']) {
      const r = montarPagamento({ ...base, forma: 'credito', parcelas });
      expect(r.campo).toBe('parcelas');
      expect(r.erro).toBeTruthy();
    }
  });

  it('crédito aceita o máximo', () => {
    const r = montarPagamento({ ...base, forma: 'credito', parcelas: String(MAX_PARCELAS) });
    expect(r.pagamento.numero_parcelas).toBe(MAX_PARCELAS);
  });

  it('valor menor que 1 centavo por parcela é rejeitado', () => {
    const r = montarPagamento({ textoValor: '0,05', saldoCentavos: 5, forma: 'credito', parcelas: '6' });
    expect(r.campo).toBe('parcelas');
  });

  it('crediário exige cliente, parcelas e prazo válidos', () => {
    expect(montarPagamento({ ...base, forma: 'crediario', temCliente: false }).campo).toBe('forma');
    expect(montarPagamento({ ...base, forma: 'crediario', temCliente: true, parcelas: '0' }).campo).toBe('parcelas');
    expect(montarPagamento({ ...base, forma: 'crediario', temCliente: true, parcelas: '1', mesesPrazo: '0' }).campo).toBe('meses');
    const ok = montarPagamento({ ...base, forma: 'crediario', temCliente: true, parcelas: '3', mesesPrazo: '2' });
    expect(ok.pagamento).toMatchObject({ forma_pagamento: 'crediario', numero_parcelas: 3, meses_prazo: 2, status: 'confirmado' });
  });
});

describe('Crediário é "A receber", nunca "Pago"', () => {
  it('rótulo de status do pagamento', () => {
    expect(rotuloStatusPagamento({ forma_pagamento: 'crediario', status: 'confirmado' })).toBe('A receber');
    expect(rotuloStatusPagamento({ forma_pagamento: 'crediario' })).toBe('A receber');
    expect(rotuloStatusPagamento({ forma_pagamento: 'debito', status: 'confirmado' })).toBe('Pago');
    expect(rotuloStatusPagamento({ forma_pagamento: 'pix', status: 'pendente' })).toBe('Aguardando pagamento');
  });

  it('o resumo separa o que é crediário, mas o saldo continua abatido', () => {
    const r = calcularResumoPagamento(100, [
      { forma_pagamento: 'pix', valor: 30, numero_parcelas: 1, status: 'confirmado' },
      { forma_pagamento: 'crediario', valor: 70, numero_parcelas: 2, meses_prazo: 1, status: 'confirmado' },
    ]);
    expect(r.aReceberCentavos).toBe(7000);
    expect(r.pagoCentavos).toBe(10000);
    expect(r.saldoCentavos).toBe(0);
    expect(r.podeFinalizar).toBe(true);
  });
});

describe('vencimentos (mesma regra do backend)', () => {
  it('soma meses limitando ao último dia do mês', () => {
    expect(vencimentoParcela(1, new Date(2026, 0, 31))).toBe('28/02/2026');
    expect(vencimentoParcela(2, new Date(2026, 9, 8))).toBe('08/12/2026');
    expect(vencimentoParcela(4, new Date(2026, 9, 8))).toBe('08/02/2027');
  });

  it('crediário: 1º = prazo, último = prazo × parcelas', () => {
    expect(vencimentosCrediario(3, 2, new Date(2026, 9, 8))).toEqual({ primeiro: '08/12/2026', ultimo: '08/04/2027' });
  });
});

import { MAX_HORIZONTE_CREDIARIO_MESES, MAX_MESES_PRAZO, problemaDoHorizonte, problemaDoPrazo } from './pagamentoVenda.js';

describe('crediário: último vencimento em no máximo 6 meses (decisão do PO)', () => {
  const base = { textoValor: '75,00', saldoCentavos: 7500, forma: 'crediario', temCliente: true };

  it('limites: 6 meses entre as parcelas e 6 meses até o último vencimento', () => {
    expect(MAX_MESES_PRAZO).toBe(6);
    expect(MAX_HORIZONTE_CREDIARIO_MESES).toBe(6);
  });

  it('266 meses (o caso do print) e 7 meses são recusados no campo de meses', () => {
    for (const meses of ['266', '7', '0', '1.5', '']) {
      expect(montarPagamento({ ...base, parcelas: '1', mesesPrazo: meses }).campo).toBe('meses');
    }
    expect(montarPagamento({ ...base, parcelas: '1', mesesPrazo: '266' }).erro).toBe('Informe de 1 a 6 meses entre as parcelas (1 = uma parcela por mês).');
  });

  it.each([
    ['6x de 1 mês', '6', '1'],
    ['3x de 2 meses', '3', '2'],
    ['2x de 3 meses', '2', '3'],
    ['1x em 6 meses', '1', '6'],
    ['1x no padrão', '1', '1'],
  ])('cabe no teto: %s', (_, parcelas, meses) => {
    const r = montarPagamento({ ...base, parcelas, mesesPrazo: meses });

    expect(r.pagamento).toMatchObject({ forma_pagamento: 'crediario', numero_parcelas: Number(parcelas), meses_prazo: Number(meses) });
  });

  it.each([
    ['12x de 1 mês (último em 12 meses)', '12', '1', 'o máximo é 6 parcelas'],
    ['7x de 1 mês', '7', '1', 'o máximo é 6 parcelas'],
    ['4x de 2 meses (último em 8 meses)', '4', '2', 'o máximo é 3 parcelas'],
    ['3x de 3 meses', '3', '3', 'o máximo é 2 parcelas'],
    ['2x de 4 meses', '2', '4', 'o máximo é 1 parcela'],
  ])('não cabe: %s, com a explicação', (_, parcelas, meses, trecho) => {
    const r = montarPagamento({ ...base, parcelas, mesesPrazo: meses });

    expect(r.campo).toBe('parcelas');
    expect(r.erro).toContain('o último vencimento pode ser em até 6 meses');
    expect(r.erro).toContain(trecho);
  });

  it('cartão de crédito não tem esse teto (12x continua valendo)', () => {
    expect(montarPagamento({ ...base, forma: 'credito', parcelas: '12' }).pagamento.numero_parcelas).toBe(12);
  });

  it('mensagens na hora: prazo fora da faixa e horizonte; vazio ou inválido não gera mensagem de horizonte', () => {
    expect(problemaDoPrazo('')).toBeNull();
    expect(problemaDoPrazo('6')).toBeNull();
    expect(problemaDoPrazo('266')).toBe('O máximo é 6 meses entre as parcelas.');
    expect(problemaDoPrazo('2,5')).toMatch(/inteiro/);
    expect(problemaDoHorizonte(6, 1)).toBeNull();
    expect(problemaDoHorizonte(12, 1)).toContain('o máximo é 6 parcelas');
    expect(problemaDoHorizonte('x', 1)).toBeNull();
    expect(problemaDoHorizonte(3, 266)).toBeNull();
  });

  it('vencimentos com o padrão (1) ficam em meses, não em décadas', () => {
    expect(vencimentosCrediario(6, 1, new Date(2026, 10, 14))).toEqual({ primeiro: '14/12/2026', ultimo: '14/05/2027' });
  });
});
