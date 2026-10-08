import { describe, it, expect } from 'vitest';
import { adicionarToast, removerToast, duracaoPorTipo } from './ToastContext';

describe('adicionarToast', () => {
  it('adiciona um toast ao final da lista, preservando os existentes', () => {
    const lista = [{ id: 1, tipo: 'success', mensagem: 'A' }];
    const resultado = adicionarToast(lista, { id: 2, tipo: 'error', mensagem: 'B' });
    expect(resultado).toEqual([
      { id: 1, tipo: 'success', mensagem: 'A' },
      { id: 2, tipo: 'error', mensagem: 'B' },
    ]);
  });

  it('permite mais de um toast simultâneo', () => {
    let lista = [];
    lista = adicionarToast(lista, { id: 1, tipo: 'success', mensagem: 'A' });
    lista = adicionarToast(lista, { id: 2, tipo: 'warning', mensagem: 'B' });
    lista = adicionarToast(lista, { id: 3, tipo: 'info', mensagem: 'C' });
    expect(lista).toHaveLength(3);
  });
});

describe('removerToast', () => {
  it('remove somente o toast com o id indicado (fechamento manual)', () => {
    const lista = [
      { id: 1, tipo: 'success', mensagem: 'A' },
      { id: 2, tipo: 'error', mensagem: 'B' },
    ];
    expect(removerToast(lista, 1)).toEqual([{ id: 2, tipo: 'error', mensagem: 'B' }]);
  });

  it('não quebra ao remover um id que não existe', () => {
    const lista = [{ id: 1, tipo: 'success', mensagem: 'A' }];
    expect(removerToast(lista, 999)).toEqual(lista);
  });
});

describe('duracaoPorTipo', () => {
  it('erro dura mais que sucesso/info, para dar tempo de leitura', () => {
    expect(duracaoPorTipo('error')).toBeGreaterThan(duracaoPorTipo('success'));
    expect(duracaoPorTipo('error')).toBeGreaterThan(duracaoPorTipo('info'));
  });

  it('warning dura mais que sucesso/info, mas menos que erro', () => {
    expect(duracaoPorTipo('warning')).toBeGreaterThan(duracaoPorTipo('success'));
    expect(duracaoPorTipo('warning')).toBeLessThan(duracaoPorTipo('error'));
  });

  it('tipo desconhecido cai no mesmo tempo de info (fallback seguro)', () => {
    expect(duracaoPorTipo('qualquer-coisa')).toBe(duracaoPorTipo('info'));
  });
});
