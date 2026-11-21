import { describe, it, expect } from 'vitest';
import { validar, montarPayload } from './ProductModal.jsx';

const formBase = {
  nome: 'Anel Prata',
  descricao: '',
  tipo: 'acabado',
  unidade: 'UN',
  custo: '20',
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

  it('nunca envia estoque_atual: cadastrar não lança estoque, a entrada é um ato à parte', () => {
    expect('estoque_atual' in montarPayload(formBase, 'create')).toBe(false);
    expect('estoque_atual' in montarPayload({ ...formBase, estoque_atual: '10' }, 'create')).toBe(false);
    expect('estoque_atual' in montarPayload(formBase, 'edit')).toBe(false);
  });
});

describe('tipo do produto', () => {
  it('envia tipo na criação (acabado por padrão, insumo quando escolhido)', () => {
    expect(montarPayload(formBase, 'create').tipo).toBe('acabado');
    expect(montarPayload({ ...formBase, tipo: 'insumo' }, 'create').tipo).toBe('insumo');
  });
  it('não envia tipo na edição', () => {
    expect(montarPayload({ ...formBase, tipo: 'insumo' }, 'edit').tipo).toBeUndefined();
  });
});

describe('montarPayload — vender por kg/litro', () => {
  it('G ou ML marcado envia o preço por 1000; sem marcar, ou outra unidade, ou insumo, envia 1', () => {
    expect(montarPayload({ ...formBase, unidade: 'G', por_peso: true, custo: '30' }, 'create').preco_base_quantidade).toBe(1000);
    expect(montarPayload({ ...formBase, unidade: 'ML', por_peso: true, custo: '8' }, 'edit').preco_base_quantidade).toBe(1000);
    expect(montarPayload({ ...formBase, unidade: 'G', por_peso: false, custo: '30' }, 'create').preco_base_quantidade).toBe(1);
    expect(montarPayload({ ...formBase, unidade: 'UN', por_peso: true }, 'create').preco_base_quantidade).toBe(1);
    expect(montarPayload({ ...formBase, unidade: 'G', tipo: 'insumo', por_peso: true, custo: '30' }, 'create').preco_base_quantidade).toBe(1);
  });

  it('o custo continua indo por unidade-base (R$ 30/kg = R$ 0,03/g)', () => {
    expect(montarPayload({ ...formBase, unidade: 'G', por_peso: true, custo: '30' }, 'create').custo).toBe(0.03);
  });
});
