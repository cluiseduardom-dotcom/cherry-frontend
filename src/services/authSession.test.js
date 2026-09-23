import { beforeEach, describe, expect, it } from 'vitest';
import { carregarSessao, limparSessao, salvarSessao } from './authSession';

const sessionStorageMock = {
  store: {},
  clear() {
    this.store = {};
  },
  getItem(key) {
    return this.store[key] ?? null;
  },
  setItem(key, value) {
    this.store[key] = String(value);
  },
  removeItem(key) {
    delete this.store[key];
  },
};

describe('authSession', () => {
  beforeEach(() => {
    sessionStorageMock.clear();
    globalThis.sessionStorage = sessionStorageMock;
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
    sessionStorageMock.setItem('cherry.auth.session', JSON.stringify({ token: 'jwt' }));

    expect(carregarSessao()).toBeNull();
    expect(sessionStorageMock.getItem('cherry.auth.session')).toBeNull();
  });
});
