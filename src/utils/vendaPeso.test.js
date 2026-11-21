import { describe, it, expect } from 'vitest';
import { baseDoProduto, ehPorPeso, totalDaLinha, sufixoDoPreco, quantidadeInicial, somarQuantidade, validarQuantidadeDigitada } from './vendaPeso';

describe('totalDaLinha (mesma conta do backend)', () => {
  it('base 1: quantidade × preço, como sempre', () => {
    expect(totalDaLinha(100, 3)).toBe(300);
    expect(totalDaLinha(19.9, 2, 1)).toBeCloseTo(39.8, 10);
  });

  it('350 g a R$ 45/kg = R$ 15,75; 1 kg = R$ 45', () => {
    expect(totalDaLinha(45, 350, 1000)).toBe(15.75);
    expect(totalDaLinha(45, 1000, 1000)).toBe(45);
  });

  it('arredonda ao centavo por linha: 333 ml a R$ 9,90/L = 3,30; 7 g a R$ 45/kg = 0,32', () => {
    expect(totalDaLinha(9.9, 333, 1000)).toBe(3.3);
    expect(totalDaLinha(45, 7, 1000)).toBe(0.32);
  });

  it('base 100 (preço por 100 g)', () => {
    expect(totalDaLinha(8, 250, 100)).toBe(20);
  });
});

describe('detecção de produto por peso', () => {
  it('só G/ML com base > 1', () => {
    expect(ehPorPeso({ unidade: 'G', base: 1000 })).toBe(true);
    expect(ehPorPeso({ unidade: 'ML', base: 100 })).toBe(true);
    expect(ehPorPeso({ unidade: 'G', base: 1 })).toBe(false);
    expect(ehPorPeso({ unidade: 'UN', base: 1000 })).toBe(false);
    expect(ehPorPeso({ unidade: 'G' })).toBe(false);
    expect(baseDoProduto({})).toBe(1);
  });

  it('sufixo do preço', () => {
    expect(sufixoDoPreco('G', 1000)).toBe('/kg');
    expect(sufixoDoPreco('ML', 1000)).toBe('/L');
    expect(sufixoDoPreco('G', 100)).toBe('/100 g');
    expect(sufixoDoPreco('UN', 1)).toBe('');
    expect(sufixoDoPreco('G', 1)).toBe('');
  });
});

describe('quantidade no carrinho', () => {
  const queijo = { unidade: 'G', base: 1000, stock: 4650 };

  it('começa em 100 g (ou o que houver) e o passo é 50; por unidade segue 1', () => {
    expect(quantidadeInicial(queijo)).toBe(100);
    expect(quantidadeInicial({ ...queijo, stock: 30 })).toBe(30);
    expect(quantidadeInicial({ unidade: 'UN', base: 1, stock: 9 })).toBe(1);
    expect(somarQuantidade({ ...queijo, qty: 100 }, 1)).toBe(150);
    expect(somarQuantidade({ ...queijo, qty: 100 }, -1)).toBe(50);
    expect(somarQuantidade({ unidade: 'UN', base: 1, stock: 9, qty: 2 }, 1)).toBe(3);
  });

  it('não passa do estoque nem fica abaixo de 1', () => {
    expect(somarQuantidade({ ...queijo, qty: 4640 }, 1)).toBe(4650);
    expect(somarQuantidade({ ...queijo, qty: 20 }, -1)).toBe(1);
  });

  it('valida o que foi digitado contra o estoque', () => {
    expect(validarQuantidadeDigitada(350, 4650)).toEqual({ valor: 350, erro: '' });
    expect(validarQuantidadeDigitada(5000, 4650, '4,65 kg').erro).toBe('Só há 4,65 kg em estoque.');
    expect(validarQuantidadeDigitada(0, 4650).erro).toContain('maior que zero');
    expect(validarQuantidadeDigitada(NaN, 4650).erro).toContain('maior que zero');
  });
});

import { custoNaBaseDoPreco } from './vendaPeso';

describe('custoNaBaseDoPreco (tela de preço)', () => {
  it('R$ 0,03 o grama vira R$ 30 o kg; R$ 0,004 o ml vira R$ 4 o L', () => {
    expect(custoNaBaseDoPreco(0.03, 'G', 1000)).toEqual({ valor: 30, sufixo: '/kg' });
    expect(custoNaBaseDoPreco('0.004000', 'ML', 1000)).toEqual({ valor: 4, sufixo: '/L' });
  });

  it('produto por unidade (ou G sem preço por kg) não muda', () => {
    expect(custoNaBaseDoPreco(40, 'UN', 1)).toEqual({ valor: 40, sufixo: '' });
    expect(custoNaBaseDoPreco(0.03, 'G', 1)).toEqual({ valor: 0.03, sufixo: '' });
    expect(custoNaBaseDoPreco(5, 'UN', 1000)).toEqual({ valor: 5, sufixo: '' });
  });
});
