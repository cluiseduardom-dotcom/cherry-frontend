import { beforeEach, describe, expect, it } from 'vitest';
import { carregarSessao, limparSessao, salvarSessao } from './authSession';

describe('authSession', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('salva e restaura a sessão', () => {
    const sessao = { token: 'jwt', user: { id: 1, nome: 'Teste', role: 'admin' } };

    salvarSessao(sessao);

    expect(carregarSessao()).toEqual(sessao);
  });

  it('remove a sessão no logout', () => {
    salvarSessao({ token: 'jwt', user: { id: 1 } });

    limparSessao();

    expect(carregarSessao()).toBeNull();
  });

  it('descarta dados inválidos', () => {
    window.sessionStorage.setItem('cherry.auth.session', JSON.stringify({ token: 'jwt' }));

    expect(carregarSessao()).toBeNull();
    expect(window.sessionStorage.getItem('cherry.auth.session')).toBeNull();
  });
});
