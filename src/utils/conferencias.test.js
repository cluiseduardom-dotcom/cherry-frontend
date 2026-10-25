import { describe, expect, test } from 'vitest';
import {
  contaFecha, contagemValida, dataValida, diferencaDaContagem, itensContados,
  resumoDaConferencia, rotuloDaDiferenca, validarConferencia,
} from './conferencias';

const saldos = [
  { produto_id: 1, nome: 'Anel', saldo: 10 },
  { produto_id: 2, nome: 'Brinco', saldo: 5 },
  { produto_id: 3, nome: 'Colar', saldo: 7 },
];
const form = (contagens, extra = {}) => ({ contagens, observacao: '', aplicarAjuste: false, ...extra });

describe('contagem', () => {
  test('diferença = contado − sistema', () => {
    expect(diferencaDaContagem(10, '8')).toBe(-2);
    expect(diferencaDaContagem(5, 7)).toBe(2);
    expect(diferencaDaContagem(3, '3')).toBe(0);
  });

  test.each([['0', true], ['12', true], ['1000000', true], ['1000001', false], ['-1', false], ['1.5', false], ['abc', false], ['', false], [undefined, false]])(
    'contagemValida(%s) = %s', (v, esperado) => expect(contagemValida(v)).toBe(esperado)
  );

  test('só conta produtos com contagem digitada (0 conta; vazio não)', () => {
    expect(itensContados(saldos, { 1: '0', 2: '', 3: '4' }).map((s) => s.produto_id)).toEqual([1, 3]);
  });
});

describe('resumoDaConferencia', () => {
  test('soma sobras e faltas separadas e conta produtos com diferença', () => {
    // Anel 10→8 (falta 2), Brinco 5→6 (sobra 1), Colar 7→7 (confere)
    expect(resumoDaConferencia(saldos, { 1: '8', 2: '6', 3: '7' })).toEqual({ contados: 3, comDiferenca: 2, sobra: 1, falta: 2 });
  });

  test('ignora contagem inválida e não contada', () => {
    expect(resumoDaConferencia(saldos, { 1: 'x', 2: '' })).toEqual({ contados: 0, comDiferenca: 0, sobra: 0, falta: 0 });
  });

  test('rótulos', () => {
    expect([0, 3, -2].map(rotuloDaDiferenca)).toEqual(['confere', '+3', '−2']);
  });
});

describe('validarConferencia', () => {
  test('exige ao menos um produto contado', () => {
    expect(validarConferencia(saldos, form({}))).toMatchObject({ valido: false });
  });

  test('payload só com contados; observação aparada e aplicar_ajuste só quando marcado', () => {
    const r = validarConferencia(saldos, form({ 1: '8', 2: '' }, { observacao: '  fim do mês  ' }));
    expect(r).toEqual({ valido: true, dados: { itens: [{ produto_id: 1, quantidade_contada: 8 }], observacao: 'fim do mês' } });
    expect('aplicar_ajuste' in r.dados).toBe(false);
  });

  test('contagem 0 é enviada', () => {
    expect(validarConferencia(saldos, form({ 2: '0' })).dados.itens).toEqual([{ produto_id: 2, quantidade_contada: 0 }]);
  });

  test('contagem inválida nomeia o produto', () => {
    const r = validarConferencia(saldos, form({ 2: '-3' }));
    expect(r.valido).toBe(false);
    expect(r.erro).toContain('Brinco');
  });

  test('ajuste: só admin', () => {
    expect(validarConferencia(saldos, form({ 1: '8' }, { aplicarAjuste: true }), { admin: false }).valido).toBe(false);
    expect(validarConferencia(saldos, form({ 1: '8' }, { aplicarAjuste: true }), { admin: true }).dados.aplicar_ajuste).toBe(true);
  });
});

describe('acerto', () => {
  test('contaFecha confere a equação do backend', () => {
    expect(contaFecha({ saldo_inicial: 0, recebido: 10, enviado: 2, vendido: 3, ajustes: -1, outros: 0, saldo_atual: 4 })).toBe(true);
    expect(contaFecha({ saldo_inicial: 0, recebido: 10, enviado: 2, vendido: 3, ajustes: -1, outros: 0, saldo_atual: 5 })).toBe(false);
  });

  test.each([['2026-10-24', true], ['2026-02-30', false], ['24/10/2026', false], ['', false]])(
    'dataValida(%s) = %s', (v, esperado) => expect(dataValida(v)).toBe(esperado)
  );
});
