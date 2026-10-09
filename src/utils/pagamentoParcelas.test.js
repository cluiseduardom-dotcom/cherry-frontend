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
