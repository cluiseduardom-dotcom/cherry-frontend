import { describe, it, expect } from 'vitest';
import { validar, montarPayload } from './ProductModal.jsx';

const formBase = {
  nome: 'Anel Prata',
  descricao: '',
  unidade: 'UN',
  preco_venda: '49.9',
  custo: '20',
  estoque_atual: '10',
  estoque_minimo: '2',
  ativo: true,
};

describe('validar', () => {
  it('não exige mais SKU nem categoria — só nome e preço (e custo para quem pode ver)', () => {
    expect(validar(formBase, 'create', true)).toBe('');
  });

  it('continua exigindo nome', () => {
    expect(validar({ ...formBase, nome: '' }, 'create', true)).toBe('Nome é obrigatório');
  });

  it('continua exigindo preço de venda válido', () => {
    expect(validar({ ...formBase, preco_venda: '0' }, 'create', true)).toBe('Preço de venda deve ser maior que zero');
  });
});

describe('montarPayload', () => {
  it('nunca envia sku nem categoria — o bug que este modal corrige', () => {
    const payload = montarPayload(formBase, 'create');
    expect('sku' in payload).toBe(false);
    expect('categoria' in payload).toBe(false);
  });

  it('envia estoque_atual só no modo create', () => {
    expect('estoque_atual' in montarPayload(formBase, 'create')).toBe(true);
    expect('estoque_atual' in montarPayload(formBase, 'edit')).toBe(false);
  });
});
