import { describe, it, expect } from 'vitest';
import {
  validarAvulso, montarAvulso, validarLinhaVenda, validarFicha, montarFicha,
  podeRetirar, podeRegularizar, formatarCusto,
} from './consumos';

describe('consumo avulso', () => {
  const base = { produto_id: '5', quantidade: '2', motivo: 'perda' };
  it('valida campos', () => {
    expect(validarAvulso(base)).toBe('');
    expect(validarAvulso({ ...base, produto_id: '' })).toBe('Escolha o insumo');
    expect(validarAvulso({ ...base, quantidade: '0' })).toMatch(/Quantidade/);
    expect(validarAvulso({ ...base, quantidade: '1.5' })).toMatch(/Quantidade/);
    expect(validarAvulso({ ...base, motivo: '' })).toBe('Escolha o motivo');
  });
  it('uso interno exige finalidade', () => {
    expect(validarAvulso({ ...base, motivo: 'uso_interno' })).toMatch(/finalidade/);
    expect(validarAvulso({ ...base, motivo: 'uso_interno', finalidade: 'Embalar' })).toBe('');
  });
  it('monta payload só com o necessário', () => {
    expect(montarAvulso({ ...base, finalidade: ' ', observacao: '' })).toEqual({ produto_id: 5, quantidade: 2, motivo: 'perda' });
    expect(montarAvulso({ ...base, responsavel_id: '3', observacao: ' x ' }))
      .toEqual({ produto_id: 5, quantidade: 2, motivo: 'perda', responsavel_id: 3, observacao: 'x' });
  });
});

describe('linha de venda', () => {
  it('valida', () => {
    expect(validarLinhaVenda({ produto_id: '1', quantidade: '1', motivo: 'brinde' })).toBe('');
    expect(validarLinhaVenda({ produto_id: '1', quantidade: '-1', motivo: 'brinde' })).toMatch(/Quantidade/);
  });
  it('retirar/regularizar conforme estado', () => {
    expect(podeRetirar({ estado: 'ativa' })).toBe(true);
    expect(podeRetirar({ estado: 'pendente' })).toBe(true);
    expect(podeRetirar({ estado: 'retirada' })).toBe(false);
    expect(podeRetirar({ estado: 'cancelamento' })).toBe(false);
    expect(podeRegularizar({ estado: 'pendente', quantidade_pendente: 2 })).toBe(true);
    expect(podeRegularizar({ estado: 'ativa', quantidade_pendente: 0 })).toBe(false);
  });
});

describe('ficha de venda', () => {
  it('valida duplicados, quantidade e insumo', () => {
    expect(validarFicha([{ insumo_produto_id: '1', quantidade: '2' }])).toBe('');
    expect(validarFicha([{ insumo_produto_id: '', quantidade: '2' }])).toMatch(/insumo/);
    expect(validarFicha([{ insumo_produto_id: '1', quantidade: '0' }])).toMatch(/Quantidade/);
    expect(validarFicha([{ insumo_produto_id: '1', quantidade: '1' }, { insumo_produto_id: 1, quantidade: '2' }])).toMatch(/repetido/);
  });
  it('monta payload numérico', () => {
    expect(montarFicha([{ insumo_produto_id: '1', quantidade: '2', extra: 1 }])).toEqual([{ insumo_produto_id: 1, quantidade: 2 }]);
  });
});

describe('formatarCusto', () => {
  it('oculta quando ausente', () => {
    expect(formatarCusto(undefined)).toBeNull();
    expect(formatarCusto(null)).toBeNull();
    expect(formatarCusto(2.5)).toContain('2,50');
  });
});
