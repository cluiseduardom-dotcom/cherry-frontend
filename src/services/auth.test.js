import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock, ApiErrorMock } = vi.hoisted(() => {
  class ApiError extends Error {
    constructor(message, status) {
      super(message);
      this.status = status;
    }
  }
  return {
    apiFetchMock: vi.fn(),
    ApiErrorMock: ApiError,
  };
});

vi.mock('./api', () => ({
  apiFetch: apiFetchMock,
  ApiError: ApiErrorMock,
}));

import { buscarMe, formatarUsuario, loginRequest } from './auth';

describe('formatarUsuario', () => {
  it('combina dados básicos com os dados complementares de /auth/me', () => {
    const baseUser = {
      id: 1,
      nome: 'Carlos',
      email: 'carlos@cherry.com',
      role: 'gerente',
      perfil: 'gerente',
      cargo: 'gerente',
      nivel: null,
      capacidades: [],
      tema: 'cherry',
    };

    const me = {
      id: 1,
      empresa_id: 42,
      perfil: 'vendedor',
      cargo: 'gerente',
      nivel: 2,
      capacidades: ['cancelar_venda', 'ver_cancelamentos'],
    };

    const formatted = formatarUsuario(me, baseUser);

    expect(formatted).toEqual({
      id: 1,
      nome: 'Carlos',
      email: 'carlos@cherry.com',
      empresa_id: 42,
      perfil: 'vendedor',
      cargo: 'gerente',
      nivel: 2,
      capacidades: ['cancelar_venda', 'ver_cancelamentos'],
      role: 'vendedor', // user.role passa a ser o perfil
      tema: 'cherry',
      senha_temporaria: false,
    });
  });

  it('marca senha_temporaria quando /auth/me avisa', () => {
    expect(formatarUsuario({ perfil: 'vendedor', senha_temporaria: true }, {}).senha_temporaria).toBe(true);
    expect(formatarUsuario({ perfil: 'vendedor' }, {}).senha_temporaria).toBe(false);
  });

  it('configura perfil e role para faturista', () => {
    const baseUser = {
      id: 2,
      nome: 'Faturista Teste',
      email: 'fat@cherry.com',
      role: 'faturista',
    };

    const me = {
      id: 2,
      empresa_id: 10,
      perfil: 'faturista',
      cargo: 'faturista',
      nivel: 1,
      capacidades: [],
    };

    const formatted = formatarUsuario(me, baseUser);

    expect(formatted.role).toBe('faturista');
    expect(formatted.perfil).toBe('faturista');
    expect(formatted.cargo).toBe('faturista');
  });

  it('suporta objeto me ausente ou parcial sem quebrar', () => {
    const baseUser = {
      id: 3,
      nome: 'Usuario Base',
      email: 'base@cherry.com',
      role: 'estoquista',
      perfil: 'estoquista',
      cargo: 'estoquista',
      tema: 'vertumno',
    };

    const formatted = formatarUsuario(null, baseUser);

    expect(formatted.id).toBe(3);
    expect(formatted.role).toBe('estoquista');
    expect(formatted.perfil).toBe('estoquista');
    expect(formatted.cargo).toBe('estoquista');
    expect(formatted.capacidades).toEqual([]);
    expect(formatted.nivel).toBeNull();
  });
});

describe('buscarMe', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it('chama /auth/me com cabeçalho Authorization quando token é passado', async () => {
    apiFetchMock.mockResolvedValue({
      data: {
        id: 1,
        perfil: 'admin',
        cargo: 'administrador',
        capacidades: ['administrador'],
      },
    });

    const resultado = await buscarMe('token-123');

    expect(apiFetchMock).toHaveBeenCalledWith('/auth/me', {
      headers: { Authorization: 'Bearer token-123' },
    });
    expect(resultado).toEqual({
      id: 1,
      perfil: 'admin',
      cargo: 'administrador',
      capacidades: ['administrador'],
    });
  });
});

describe('loginRequest', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it('faz login, busca /auth/me e devolve token e user formatado com perfil', async () => {
    apiFetchMock.mockImplementation((path) => {
      if (path === '/auth/login') {
        return Promise.resolve({
          data: {
            token: 'jwt-token-xyz',
            usuario: {
              id: 5,
              nome: 'Ana Gerente',
              email: 'ana@cherry.com',
              papel: 'gerente',
              empresa: { tema: 'cherry' },
            },
          },
        });
      }
      if (path === '/auth/me') {
        return Promise.resolve({
          data: {
            id: 5,
            empresa_id: 100,
            perfil: 'vendedor',
            cargo: 'gerente',
            nivel: 3,
            capacidades: ['cancelar_venda'],
          },
        });
      }
      return Promise.reject(new Error('URL inesperada'));
    });

    const res = await loginRequest('ana@cherry.com', 'senha123');

    expect(res.token).toBe('jwt-token-xyz');
    expect(res.user.role).toBe('vendedor'); // perfil mapeado para role
    expect(res.user.perfil).toBe('vendedor');
    expect(res.user.cargo).toBe('gerente');
    expect(res.user.capacidades).toEqual(['cancelar_venda']);
  });

  it('lança erro descritivo do backend caso /auth/me falhe', async () => {
    apiFetchMock.mockImplementation((path) => {
      if (path === '/auth/login') {
        return Promise.resolve({
          data: {
            token: 'jwt-token-xyz',
            usuario: {
              id: 5,
              nome: 'Ana Gerente',
              email: 'ana@cherry.com',
              papel: 'gerente',
            },
          },
        });
      }
      if (path === '/auth/me') {
        return Promise.reject(new ApiErrorMock('Sessão expirada ou inválida no me', 401));
      }
      return Promise.reject(new Error('URL inesperada'));
    });

    await expect(loginRequest('ana@cherry.com', 'senha123')).rejects.toThrow(
      'Sessão expirada ou inválida no me'
    );
  });
});
