import { describe, expect, it } from 'vitest';
import { destinoConta, destinoFiado, resultadoDoPixPago, validarValorPix } from './pixReceber';

describe('destino do Pix de recebimento', () => {
  it('monta o destino com ids numéricos', () => {
    expect(destinoFiado('12')).toEqual({ tipo: 'fiado', cliente_id: 12 });
    expect(destinoConta('5')).toEqual({ tipo: 'conta_receber', conta_id: 5 });
  });
});

describe('validarValorPix', () => {
  it('aceita valor até o que falta (inclusive o total)', () => {
    expect(validarValorPix('40', 100)).toBeNull();
    expect(validarValorPix('100,00', 100)).toBeNull();
    expect(validarValorPix('1.234,56', 5000)).toBeNull();
  });

  it('recusa vazio, lixo, zero, negativo, mais de 2 casas e acima do que falta', () => {
    expect(validarValorPix('', 100)).toMatch(/Informe o valor/);
    expect(validarValorPix('abc', 100)).toMatch(/Informe o valor/);
    expect(validarValorPix('0', 100)).toMatch(/maior que zero/);
    expect(validarValorPix('-5', 100)).toMatch(/Informe o valor/);
    expect(validarValorPix('10,999', 100)).toMatch(/2 casas/);
    expect(validarValorPix('100,01', 100)).toMatch(/passar do que falta/);
  });

  it('compara em centavos (sem erro de ponto flutuante)', () => {
    expect(validarValorPix('0,30', 0.1 + 0.2)).toBeNull();
  });
});

describe('resultadoDoPixPago', () => {
  it('aplicado: confirma o lançamento', () => {
    expect(resultadoDoPixPago({ valor: '40.00', destino: { tipo: 'fiado', aplicado: true, erro: null } }).situacao).toBe('aplicado');
  });

  it('erro: avisa que o Pix foi pago mas não lançado e que fica em "Pix a devolver"', () => {
    const r = resultadoDoPixPago({ valor: '40.00', destino: { tipo: 'fiado', aplicado: false, erro: 'O valor do Pix é maior que o que o cliente deve.' } });

    expect(r.situacao).toBe('falhou');
    expect(r.mensagem).toMatch(/Pix a devolver/);
  });

  it('sem aplicar e sem erro: ainda confirmando', () => {
    expect(resultadoDoPixPago({ valor: '40.00', destino: { tipo: 'fiado', aplicado: false, erro: null } }).situacao).toBe('aguardando');
    expect(resultadoDoPixPago(null).situacao).toBe('aguardando');
  });
});
