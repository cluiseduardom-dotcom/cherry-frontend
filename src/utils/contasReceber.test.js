import { describe, it, expect } from 'vitest';
import { ehParcial, recebidoDaConta, resumirContas, restanteDaConta, rotuloDaForma, soPorInteiro, validarRecebimento, valorDoRecebimento } from './contasReceber';

const parcial = { status: 'pendente', valor: '100.00', valor_recebido: '40.00', valor_restante: '60.00', parcela_id: 5 };
const intacta = { status: 'pendente', valor: '100.00', valor_recebido: '0.00', valor_restante: '100.00', parcela_id: 6 };
const recebida = { status: 'recebido', valor: '100.00', valor_recebido: '100.00', valor_restante: '0.00', parcela_id: 7 };
const cancelada = { status: 'cancelado', valor: '50.00', valor_recebido: '0.00', valor_restante: '0.00', parcela_id: 8 };

describe('restante e recebido', () => {
  it('usam o que o servidor devolve; cancelada não tem restante nem recebido', () => {
    expect(restanteDaConta(parcial)).toBe(60);
    expect(recebidoDaConta(parcial)).toBe(40);
    expect(restanteDaConta(cancelada)).toBe(0);
    expect(recebidoDaConta(cancelada)).toBe(0);
  });

  it('servidor antigo (sem os campos): pendente = valor cheio; recebida = tudo recebido', () => {
    expect(restanteDaConta({ status: 'pendente', valor: '80.00' })).toBe(80);
    expect(restanteDaConta({ status: 'recebido', valor: '80.00' })).toBe(0);
    expect(recebidoDaConta({ status: 'recebido', valor: '80.00' })).toBe(80);
    expect(recebidoDaConta({ status: 'pendente', valor: '80.00' })).toBe(0);
  });

  it('parcial só quando pendente e já entrou algo; conta antiga (sem parcela) só por inteiro', () => {
    expect(ehParcial(parcial)).toBe(true);
    expect(ehParcial(intacta)).toBe(false);
    expect(ehParcial(recebida)).toBe(false);
    expect(soPorInteiro({ parcela_id: null })).toBe(true);
    expect(soPorInteiro({})).toBe(true);
    expect(soPorInteiro(parcial)).toBe(false);
  });
});

describe('resumirContas', () => {
  it('pendente = restantes; recebido inclui o parcial; taxa = recebido / (recebido + pendente), sem erro de centavos', () => {
    const r = resumirContas([parcial, intacta, recebida, cancelada]);

    expect(r).toMatchObject({ pendente: 160, recebido: 140, cancelado: 50 });
    expect(r.taxa).toBeCloseTo((140 / 300) * 100, 5);
    expect(resumirContas([])).toEqual({ pendente: 0, recebido: 0, cancelado: 0, taxa: 0 });
    expect(resumirContas([{ status: 'pendente', valor: '0.10', valor_recebido: '0.00', valor_restante: '0.10' }, { status: 'pendente', valor: '0.20', valor_recebido: '0.00', valor_restante: '0.20' }]).pendente).toBe(0.3);
  });
});

describe('validarRecebimento', () => {
  it('em branco recebe o restante (válido se houver restante)', () => {
    expect(validarRecebimento({ valor: '' }, 60)).toBeNull();
    expect(validarRecebimento({ valor: '  ' }, 60)).toBeNull();
    expect(validarRecebimento({ valor: '' }, 0)).toMatch(/não tem saldo/);
  });

  it('aceita até o restante (inclusive); recusa acima, zero, lixo e 3 casas', () => {
    expect(validarRecebimento({ valor: '40' }, 60)).toBeNull();
    expect(validarRecebimento({ valor: '60,00' }, 60)).toBeNull();
    expect(validarRecebimento({ valor: '0,30' }, 0.1 + 0.2)).toBeNull();
    expect(validarRecebimento({ valor: '60,01' }, 60)).toMatch(/maior que o que falta/);
    expect(validarRecebimento({ valor: '0' }, 60)).toMatch(/maior que zero/);
    expect(validarRecebimento({ valor: 'abc' }, 60)).toMatch(/Informe o valor/);
    expect(validarRecebimento({ valor: '10,123' }, 60)).toMatch(/2 casas/);
  });

  it('observação limitada a 300 caracteres', () => {
    expect(validarRecebimento({ valor: '10', observacao: 'x'.repeat(300) }, 60)).toBeNull();
    expect(validarRecebimento({ valor: '10', observacao: 'x'.repeat(301) }, 60)).toMatch(/300/);
  });
});

describe('valorDoRecebimento e rótulo', () => {
  it('em branco = undefined (o servidor recebe o restante); número em reais', () => {
    expect(valorDoRecebimento('')).toBeUndefined();
    expect(valorDoRecebimento('25,90')).toBe(25.9);
    expect(rotuloDaForma('pix')).toBe('Pix');
    expect(rotuloDaForma('x')).toBe('x');
  });
});
