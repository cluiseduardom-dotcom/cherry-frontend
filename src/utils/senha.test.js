import { describe, it, expect } from 'vitest';
import { validarTrocaSenha } from './senha';

const ok = { senha_atual: 'antiga-123', nova_senha: 'nova-senha-1', confirmacao: 'nova-senha-1' };

describe('validarTrocaSenha', () => {
  it('aceita dados válidos', () => expect(validarTrocaSenha(ok)).toBe(''));
  it('exige senha atual', () => expect(validarTrocaSenha({ ...ok, senha_atual: '' })).toMatch(/senha atual/));
  it('exige mínimo de 8 caracteres', () => expect(validarTrocaSenha({ ...ok, nova_senha: 'curta', confirmacao: 'curta' })).toMatch(/mínimo 8/));
  it('rejeita nova igual à atual', () => expect(validarTrocaSenha({ ...ok, nova_senha: 'antiga-123', confirmacao: 'antiga-123' })).toMatch(/diferente/));
  it('exige confirmação igual', () => expect(validarTrocaSenha({ ...ok, confirmacao: 'outra-coisa' })).toMatch(/confirmação/));
});
