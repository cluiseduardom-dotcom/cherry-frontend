import { describe, expect, it } from 'vitest';
import { checarCapacidade } from './AuthContext';

describe('checarCapacidade', () => {
  it('retorna true quando o usuário possui a capacidade diretamente', () => {
    const user = {
      role: 'vendedor',
      capacidades: ['cancelar_venda', 'ver_cancelamentos'],
    };

    expect(checarCapacidade(user, 'cancelar_venda')).toBe(true);
    expect(checarCapacidade(user, 'ver_cancelamentos')).toBe(true);
  });

  it('retorna true para qualquer capacidade se o usuário tem a capacidade administrador', () => {
    const user = {
      role: 'vendedor',
      capacidades: ['administrador'],
    };

    expect(checarCapacidade(user, 'cancelar_venda')).toBe(true);
    expect(checarCapacidade(user, 'ver_custos')).toBe(true);
    expect(checarCapacidade(user, 'gerir_cargos')).toBe(true);
  });

  it('retorna true se o role ou perfil for admin', () => {
    expect(checarCapacidade({ role: 'admin' }, 'cancelar_venda')).toBe(true);
    expect(checarCapacidade({ perfil: 'admin' }, 'ver_custos')).toBe(true);
  });

  it('retorna false quando o usuário não possui a capacidade e não é admin', () => {
    const user = {
      role: 'vendedor',
      perfil: 'vendedor',
      capacidades: ['ver_cancelamentos'],
    };

    expect(checarCapacidade(user, 'cancelar_venda')).toBe(false);
    expect(checarCapacidade(user, 'ver_custos')).toBe(false);
    expect(checarCapacidade(user, 'gerir_cargos')).toBe(false);
  });

  it('retorna false quando usuário ou nome da capacidade forem nulos ou inválidos', () => {
    expect(checarCapacidade(null, 'cancelar_venda')).toBe(false);
    expect(checarCapacidade(undefined, 'cancelar_venda')).toBe(false);
    expect(checarCapacidade({ capacidades: ['cancelar_venda'] }, null)).toBe(false);
    expect(checarCapacidade({ capacidades: ['cancelar_venda'] }, '')).toBe(false);
  });
});
