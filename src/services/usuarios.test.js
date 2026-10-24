import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from './api';
import {
  listarUsuarios,
  criarUsuario,
  alterarBloqueioUsuario,
  listarEventosUsuarios,
} from './usuarios';

vi.mock('./api', () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(message, status) {
      super(message);
      this.status = status;
    }
  },
}));

describe('services/usuarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listarUsuarios', () => {
    it('chama GET /usuarios e retorna body.data', async () => {
      const mockUsers = [
        { id: 1, nome: 'Admin', email: 'admin@x.com', cargo: 'admin', pode_gerenciar: false },
        { id: 2, nome: 'Vendedor', email: 'vend@x.com', cargo: 'vendedor', pode_gerenciar: true },
      ];
      api.apiFetch.mockResolvedValueOnce({ success: true, data: mockUsers });

      const res = await listarUsuarios();

      expect(api.apiFetch).toHaveBeenCalledWith('/usuarios');
      expect(res).toEqual(mockUsers);
    });
  });

  describe('criarUsuario', () => {
    it('chama POST /usuarios com os 4 campos estritos no body', async () => {
      const mockCreated = {
        usuario: { id: 3, nome: 'Ana', email: 'ana@x.com', papel: 'vendedor', ativo: true },
      };
      api.apiFetch.mockResolvedValueOnce({ success: true, data: mockCreated });

      const res = await criarUsuario({
        nome: '  Ana Pereira  ',
        email: '  ana@x.com  ',
        senha: 'senhaSecreta123',
        papel: 'vendedor',
        campoInvalido: 'rejeitado',
      });

      expect(api.apiFetch).toHaveBeenCalledWith('/usuarios', {
        method: 'POST',
        body: JSON.stringify({
          nome: 'Ana Pereira',
          email: 'ana@x.com',
          senha: 'senhaSecreta123',
          papel: 'vendedor',
        }),
      });
      expect(res).toEqual(mockCreated);
    });

    it('propaga erro da API se email já estiver cadastrado (409)', async () => {
      api.apiFetch.mockRejectedValueOnce(new api.ApiError('Email já cadastrado', 409));

      await expect(
        criarUsuario({ nome: 'Ana', email: 'ana@x.com', senha: '123456', papel: 'vendedor' })
      ).rejects.toThrow('Email já cadastrado');
    });
  });

  describe('alterarBloqueioUsuario', () => {
    it('chama PATCH /usuarios/:id/bloqueio com bloqueado e motivo', async () => {
      const mockResult = { id: 5, nome: 'Bruno', papel: 'vendedor', ativo: false, alterado: true };
      api.apiFetch.mockResolvedValueOnce({ success: true, data: mockResult });

      const res = await alterarBloqueioUsuario(5, {
        bloqueado: true,
        motivo: '  Desligamento de colaborador  ',
      });

      expect(api.apiFetch).toHaveBeenCalledWith('/usuarios/5/bloqueio', {
        method: 'PATCH',
        body: JSON.stringify({
          bloqueado: true,
          motivo: 'Desligamento de colaborador',
        }),
      });
      expect(res).toEqual(mockResult);
    });
  });

  describe('listarEventosUsuarios', () => {
    it('monta query string com page e pageSize', async () => {
      const mockEventos = {
        items: [{ id: 1, acao: 'criar', alvo_nome: 'Ana' }],
        page: 2,
        pageSize: 15,
        total: 25,
        totalPages: 2,
      };
      api.apiFetch.mockResolvedValueOnce({ success: true, data: mockEventos });

      const res = await listarEventosUsuarios({ page: 2, pageSize: 15 });

      expect(api.apiFetch).toHaveBeenCalledWith('/usuarios/eventos?page=2&pageSize=15');
      expect(res).toEqual(mockEventos);
    });

    it('usa valores padrão page=1 e pageSize=20', async () => {
      api.apiFetch.mockResolvedValueOnce({ success: true, data: { items: [], page: 1, pageSize: 20 } });

      await listarEventosUsuarios();

      expect(api.apiFetch).toHaveBeenCalledWith('/usuarios/eventos?page=1&pageSize=20');
    });
  });
});
