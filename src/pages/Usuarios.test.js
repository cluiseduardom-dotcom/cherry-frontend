import { describe, it, expect } from 'vitest';
import {
  formatarCargo,
  formatarDataHora,
  formatarAcaoEvento,
  cargosPermitidosParaCriacao,
  validarCriarUsuario,
  validarBloqueioUsuario,
} from '../utils/usuarios';

describe('Usuarios page logic and validation', () => {
  describe('Filtros de usuários', () => {
    const listaUsuarios = [
      { id: 1, nome: 'Ana Souza', email: 'ana@loja.com', cargo: 'admin', ativo: true, pode_gerenciar: false, motivo_bloqueio_gestao: 'Usuários Admin não são gerenciados por aqui' },
      { id: 2, nome: 'Bruno Lima', email: 'bruno@loja.com', cargo: 'gerente', ativo: true, pode_gerenciar: false, motivo_bloqueio_gestao: 'Você só pode gerenciar usuários de cargo abaixo do seu nível' },
      { id: 3, nome: 'Carla Dias', email: 'carla@loja.com', cargo: 'vendedor', ativo: true, pode_gerenciar: true, motivo_bloqueio_gestao: null },
      { id: 4, nome: 'Daniel Dias', email: 'daniel@loja.com', cargo: 'vendedor', ativo: false, pode_gerenciar: true, motivo_bloqueio_gestao: null },
    ];

    it('filtra por termo de busca em nome, e-mail e cargo', () => {
      const filtrar = (termo) => listaUsuarios.filter(u => {
        const t = termo.toLowerCase();
        return u.nome.toLowerCase().includes(t) ||
               u.email.toLowerCase().includes(t) ||
               formatarCargo(u.cargo).toLowerCase().includes(t);
      });

      expect(filtrar('bruno')).toHaveLength(1);
      expect(filtrar('loja.com')).toHaveLength(4);
      expect(filtrar('vendedor')).toHaveLength(2);
      expect(filtrar('gerente')).toHaveLength(1);
    });

    it('filtra por status ativo vs bloqueado', () => {
      const ativos = listaUsuarios.filter(u => u.ativo);
      const bloqueados = listaUsuarios.filter(u => !u.ativo);

      expect(ativos).toHaveLength(3);
      expect(bloqueados).toHaveLength(1);
      expect(bloqueados[0].nome).toBe('Daniel Dias');
    });

    it('respeita pode_gerenciar e expõe motivo_bloqueio_gestao', () => {
      const admin = listaUsuarios.find(u => u.cargo === 'admin');
      expect(admin.pode_gerenciar).toBe(false);
      expect(admin.motivo_bloqueio_gestao).toBe('Usuários Admin não são gerenciados por aqui');

      const vendedor = listaUsuarios.find(u => u.id === 3);
      expect(vendedor.pode_gerenciar).toBe(true);
      expect(vendedor.motivo_bloqueio_gestao).toBeNull();
    });
  });

  describe('Cargos permitidos para criação por perfil do ator', () => {
    it('admin pode criar qualquer cargo não-admin', () => {
      const permitidos = cargosPermitidosParaCriacao({ role: 'admin' });
      expect(permitidos.find(c => c.cargo === 'admin')).toBeUndefined();
      expect(permitidos.map(c => c.cargo)).toContain('diretor');
      expect(permitidos.map(c => c.cargo)).toContain('gerente');
      expect(permitidos.map(c => c.cargo)).toContain('vendedor');
      expect(permitidos.map(c => c.cargo)).toContain('estoquista');
    });

    it('gerente (nível 70) só pode criar cargos estritamente abaixo do seu nível', () => {
      const permitidos = cargosPermitidosParaCriacao({ role: 'vendedor', cargo: 'gerente', nivel: 70 });
      const nomes = permitidos.map(c => c.cargo);
      expect(nomes).not.toContain('admin');
      expect(nomes).not.toContain('diretor');
      expect(nomes).not.toContain('gerente');
      expect(nomes).toContain('coordenador');
      expect(nomes).toContain('supervisor');
      expect(nomes).toContain('vendedor');
      expect(nomes).toContain('estoquista');
    });
  });

  describe('Validação de formulário de criação de usuário', () => {
    const atorAdmin = { role: 'admin' };

    it('não permite campos adicionais além de nome, email, senha, papel', () => {
      const res = validarCriarUsuario({
        nome: 'Mariana',
        email: 'mariana@x.com',
        senha: 'segredoForte',
        confirmacaoSenha: 'segredoForte',
        papel: 'vendedor',
        empresa_id: 123,
        ativo: true,
      }, atorAdmin);

      expect(res.valido).toBe(true);
      expect(res.dados).toEqual({
        nome: 'Mariana',
        email: 'mariana@x.com',
        senha: 'segredoForte',
        papel: 'vendedor',
      });
      expect(res.dados.empresa_id).toBeUndefined();
      expect(res.dados.ativo).toBeUndefined();
    });
  });

  describe('Validação de bloqueio de usuário', () => {
    it('rejeita motivo vazio ou com menos de 3 caracteres', () => {
      expect(validarBloqueioUsuario('').valido).toBe(false);
      expect(validarBloqueioUsuario('oi').valido).toBe(false);
    });

    it('aceita motivo válido de 3 a 300 caracteres', () => {
      const res = validarBloqueioUsuario('Desligamento por acordo mútuo');
      expect(res.valido).toBe(true);
      expect(res.motivo).toBe('Desligamento por acordo mútuo');
    });
  });
});
