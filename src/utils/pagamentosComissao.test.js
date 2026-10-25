import { describe, expect, it } from 'vitest';
import {
  FORM_PAGAMENTO_VAZIO, MODOS_PAGAMENTO_COMISSAO, descricaoDoModoComissao, hojeISO, podePagar, rotuloDaFormaComissao,
  temAguardandoFechamento, validarPagamentoComissao,
} from './pagamentosComissao';

const linha = { vendedor_id: 7, vendedor_nome: 'Bruno', a_pagar: '11.97', bruto_a_pagar: '11.97', descontos: '0.00' };
const form = (extra = {}) => ({ ...FORM_PAGAMENTO_VAZIO, pagoEm: '2026-10-24', ...extra });

describe('pagamentosComissao', () => {
  it('podePagar só com líquido positivo', () => {
    expect(podePagar({ a_pagar: '0.01' })).toBe(true);
    expect(podePagar({ a_pagar: '0.00' })).toBe(false);
    expect(podePagar({ a_pagar: '-10.00' })).toBe(false);
    expect(podePagar(undefined)).toBe(false);
  });

  it('monta o payload com o valor que a tela mostrou como valor_esperado', () => {
    expect(validarPagamentoComissao(linha, form({ forma: 'transferencia', observacao: '  outubro  ' }), '2026-10-25')).toEqual({
      valido: true,
      dados: { vendedor_id: 7, valor_esperado: 11.97, forma: 'transferencia', pago_em: '2026-10-24', observacao: 'outubro' },
    });
  });

  it('não envia observação vazia', () => {
    const r = validarPagamentoComissao(linha, form({ observacao: '   ' }), '2026-10-25');
    expect('observacao' in r.dados).toBe(false);
  });

  it.each([
    ['sem líquido', { ...linha, a_pagar: '-3.00' }, form()],
    ['forma inválida', linha, form({ forma: 'cripto' })],
    ['sem data', linha, form({ pagoEm: '' })],
    ['data futura', linha, form({ pagoEm: '2026-10-26' })],
  ])('recusa %s', (_, l, f) => {
    expect(validarPagamentoComissao(l, f, '2026-10-25').valido).toBe(false);
  });

  it('rótulos e data de hoje', () => {
    expect(rotuloDaFormaComissao('pix')).toBe('Pix');
    expect(rotuloDaFormaComissao('xyz')).toBe('xyz');
    expect(hojeISO(new Date(2026, 9, 5))).toBe('2026-10-05');
  });

  it('modos de pagamento: os dois do backend, com liberada como padrão se vier valor desconhecido', () => {
    expect(MODOS_PAGAMENTO_COMISSAO.map(m => m.valor)).toEqual(['liberada', 'fim_do_mes']);
    expect(descricaoDoModoComissao('fim_do_mes').rotulo).toBe('Só no fechamento do mês');
    expect(descricaoDoModoComissao('liberada').rotulo).toBe('Assim que liberada');
    expect(descricaoDoModoComissao(undefined).valor).toBe('liberada');
  });

  it('aguardando fechamento: só com valor positivo; vendedor sem líquido não é pagável', () => {
    expect(temAguardandoFechamento({ aguardando_fechamento: '10.00' })).toBe(true);
    expect(temAguardandoFechamento({ aguardando_fechamento: '0.00' })).toBe(false);
    expect(temAguardandoFechamento({})).toBe(false);
    expect(podePagar({ a_pagar: '0.00', aguardando_fechamento: '10.00' })).toBe(false);
  });
});
