import { describe, it, expect } from 'vitest';
import { validar, montarPayload } from './ProductModal.jsx';

const formBase = {
  nome: 'Anel Prata',
  descricao: '',
  unidade: 'UN',
  custo: '20',
  estoque_atual: '10',
  estoque_minimo: '2',
  ativo: true,
};

describe('validar', () => {
  it('não exige SKU, categoria nem preço de venda — só nome (e custo para quem pode ver)', () => {
    expect(validar(formBase, 'create', true)).toBe('');
  });

  it('continua exigindo nome', () => {
    expect(validar({ ...formBase, nome: '' }, 'create', true)).toBe('Nome é obrigatório');
  });

  it('continua exigindo custo válido para quem pode ver custo', () => {
    expect(validar({ ...formBase, custo: '0' }, 'create', true)).toBe('Custo deve ser maior que zero');
    expect(validar({ ...formBase, custo: '' }, 'create', true)).toBe('Custo deve ser maior que zero');
  });
});

describe('montarPayload', () => {
  it('não envia preco_venda: o preço é definido por canal em "Precificar por canal"', () => {
    expect('preco_venda' in montarPayload(formBase, 'create')).toBe(false);
    expect('preco_venda' in montarPayload(formBase, 'edit')).toBe(false);
  });

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
