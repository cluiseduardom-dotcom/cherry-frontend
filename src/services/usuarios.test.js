import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from './api';
import {
  listarUsuarios,
  criarUsuario,
  alterarBloqueioUsuario,
  listarEventosUsuarios,
  listarCargosAtribuiveis,
  obterUsuario,
  editarDadosUsuario,
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

  describe('listarCargosAtribuiveis', () => {
    it('busca GET /usuarios/cargos e devolve data', async () => {
      api.apiFetch.mockResolvedValue({ data: [{ cargo: 'vendedor', rotulo: 'Vendedor', nivel: 30, em_escada: true }] });

      const r = await listarCargosAtribuiveis();

      expect(api.apiFetch).toHaveBeenCalledWith('/usuarios/cargos');
      expect(r).toEqual([{ cargo: 'vendedor', rotulo: 'Vendedor', nivel: 30, em_escada: true }]);
    });
  });

  describe('dados cadastrais', () => {
    it('criarUsuario envia os dados cadastrais conhecidos e descarta o resto', async () => {
      api.apiFetch.mockResolvedValueOnce({ success: true, data: {} });

      await criarUsuario({
        nome: ' Ana ', email: 'a@x.com', senha: 'segredo', papel: 'vendedor',
        telefone: '11912345678', cpf: '52998224725', empresa_id: 9, ativo: true,
      });

      const [url, opts] = api.apiFetch.mock.calls[0];
      expect(url).toBe('/usuarios');
      expect(JSON.parse(opts.body)).toEqual({
        nome: 'Ana', email: 'a@x.com', senha: 'segredo', papel: 'vendedor',
        telefone: '11912345678', cpf: '52998224725',
      });
    });

    it('obterUsuario busca GET /usuarios/:id', async () => {
      api.apiFetch.mockResolvedValueOnce({ success: true, data: { id: 7 } });
      expect(await obterUsuario(7)).toEqual({ id: 7 });
      expect(api.apiFetch).toHaveBeenCalledWith('/usuarios/7');
    });

    it('editarDadosUsuario usa PATCH /dados, preserva null e descarta campos estranhos', async () => {
      api.apiFetch.mockResolvedValueOnce({ success: true, data: { alterado: true, campos: ['cidade'] } });

      const res = await editarDadosUsuario(7, { cidade: null, telefone: '11999998888', papel: 'admin' });

      const [url, opts] = api.apiFetch.mock.calls[0];
      expect(url).toBe('/usuarios/7/dados');
      expect(opts.method).toBe('PATCH');
      expect(JSON.parse(opts.body)).toEqual({ cidade: null, telefone: '11999998888' });
      expect(res.alterado).toBe(true);
    });
  });
});
