import { describe, expect, it } from 'vitest';
import { rotuloDoUsuario } from './papeis';

describe('rotuloDoUsuario', () => {
  it('mostra o cargo, não só o perfil de acesso', () => {
    expect(rotuloDoUsuario({ role: 'vendedor', cargo: 'financeiro' })).toBe('Analista financeiro');
    expect(rotuloDoUsuario({ role: 'vendedor', cargo: 'gerente' })).toBe('Gerente');
    expect(rotuloDoUsuario({ role: 'vendedor', cargo: 'vendedor' })).toBe('Vendedor(a)');
    expect(rotuloDoUsuario({ role: 'estoquista', cargo: 'estoquista' })).toBe('Estoquista');
  });

  it('admin (por cargo ou concessão) aparece como Administrador(a)', () => {
    expect(rotuloDoUsuario({ role: 'admin', cargo: 'admin' })).toBe('Administrador(a)');
    expect(rotuloDoUsuario({ role: 'admin', cargo: 'gerente' })).toBe('Administrador(a)');
  });

  it('sem cargo conhecido cai no perfil; sem usuário devolve vazio', () => {
    expect(rotuloDoUsuario({ role: 'vendedor' })).toBe('Vendedor(a)');
    expect(rotuloDoUsuario({ role: 'vendedor', cargo: 'novo_cargo' })).toBe('Vendedor(a)');
    expect(rotuloDoUsuario(null)).toBe('');
  });
});
