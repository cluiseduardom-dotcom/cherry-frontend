import { describe, expect, it } from 'vitest';
import { detalheDosPagamentos, resumoFormasDePagamento, rotuloDaForma } from './formaPagamentoVenda';

describe('formaPagamentoVenda', () => {
  it('rotula as formas conhecidas e o legado', () => {
    expect(['pix', 'dinheiro', 'debito', 'credito', 'crediario'].map(rotuloDaForma))
      .toEqual(['Pix', 'Dinheiro', 'Débito', 'Crédito', 'Crediário']);
    expect(rotuloDaForma('a_vista')).toBe('À vista');
    expect(rotuloDaForma('prazo')).toBe('Crediário');
    expect(rotuloDaForma(undefined)).toBe('—');
  });

  it('junta formas distintas na ordem lançada', () => {
    const venda = { pagamentos: [{ forma_pagamento: 'dinheiro' }, { forma_pagamento: 'pix' }, { forma_pagamento: 'dinheiro' }] };
    expect(resumoFormasDePagamento(venda)).toBe('Dinheiro + Pix');
  });

  it('sem pagamentos usa o legado; sem nada, traço', () => {
    expect(resumoFormasDePagamento({ pagamentos: [], forma_pagamento: 'a_vista' })).toBe('À vista');
    expect(resumoFormasDePagamento({ pagamentos: [] })).toBe('—');
    expect(resumoFormasDePagamento({})).toBe('—');
    expect(resumoFormasDePagamento(undefined)).toBe('—');
  });

  it('detalhe usa o formatador recebido', () => {
    const venda = { pagamentos: [{ forma_pagamento: 'dinheiro', valor: '40.00' }, { forma_pagamento: 'pix', valor: '60.00' }] };
    expect(detalheDosPagamentos(venda, v => `R$ ${v}`)).toBe('Dinheiro R$ 40.00 · Pix R$ 60.00');
    expect(detalheDosPagamentos({}, v => v)).toBe('');
  });
});
