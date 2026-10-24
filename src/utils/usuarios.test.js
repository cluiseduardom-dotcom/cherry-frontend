import { describe, it, expect } from 'vitest';
import {
  formatarCargo,
  nivelDoAtor,
  cargosPermitidosParaCriacao,
  formatarDataHora,
  formatarAcaoEvento,
  validarCriarUsuario,
  validarBloqueioUsuario,
  validarDadosCadastrais,
  dadosAlterados,
  dadosParaFormulario,
  dadosParaCriacao,
  DADOS_VAZIOS,
} from './usuarios';

describe('utils/usuarios', () => {
  describe('formatarCargo', () => {
    it('formata cargos conhecidos com rótulo amigável', () => {
      expect(formatarCargo('admin')).toBe('Admin');
      expect(formatarCargo('gerente')).toBe('Gerente');
      expect(formatarCargo('coordenador')).toBe('Coordenador');
      expect(formatarCargo('supervisor')).toBe('Supervisor');
      expect(formatarCargo('vendedor')).toBe('Vendedor');
      expect(formatarCargo('estoquista')).toBe('Estoquista');
      expect(formatarCargo('faturista')).toBe('Faturista');
    });

    it('trata valores nulos ou desconhecidos com elegância', () => {
      expect(formatarCargo(null)).toBe('Não informado');
      expect(formatarCargo('')).toBe('Não informado');
      expect(formatarCargo('cargo_customizado')).toBe('cargo_customizado');
    });
  });

  describe('nivelDoAtor e cargosPermitidosParaCriacao', () => {
    it('ator admin (role ou capacidade) tem nível 90 e pode criar qualquer cargo não-admin', () => {
      const adminPorRole = { role: 'admin' };
      expect(nivelDoAtor(adminPorRole)).toBe(90);
      const cargosAdmin = cargosPermitidosParaCriacao(adminPorRole);
      const nomes = cargosAdmin.map(c => c.cargo);
      expect(nomes).not.toContain('admin');
      expect(nomes).toContain('diretor');
      expect(nomes).toContain('gerente');
      expect(nomes).toContain('vendedor');
      expect(nomes).toContain('estoquista');
    });

    it('ator gerente (nível 70) só pode criar cargos de nível < 70', () => {
      const gerente = { role: 'vendedor', cargo: 'gerente', nivel: 70, capacidades: ['gerir_usuarios'] };
      expect(nivelDoAtor(gerente)).toBe(70);
      const cargosGerente = cargosPermitidosParaCriacao(gerente);
      const nomes = cargosGerente.map(c => c.cargo);
      expect(nomes).not.toContain('admin');
      expect(nomes).not.toContain('diretor');
      expect(nomes).not.toContain('gerente');
      expect(nomes).toContain('coordenador');
      expect(nomes).toContain('supervisor');
      expect(nomes).toContain('vendedor');
      expect(nomes).toContain('estoquista');
      expect(nomes).toContain('faturista');
    });

    it('ator supervisor (nível 50) não pode criar coordenador nem gerente', () => {
      const supervisor = { role: 'vendedor', cargo: 'supervisor', nivel: 50, capacidades: ['gerir_usuarios'] };
      const cargosSupervisor = cargosPermitidosParaCriacao(supervisor);
      const nomes = cargosSupervisor.map(c => c.cargo);
      expect(nomes).not.toContain('coordenador');
      expect(nomes).not.toContain('supervisor');
      expect(nomes).toContain('analista');
      expect(nomes).toContain('vendedor');
      expect(nomes).toContain('operador');
      expect(nomes).toContain('auxiliar');
      expect(nomes).toContain('estoquista');
    });
  });

  describe('formatarDataHora', () => {
    it('formata ISO string para DD/MM/YYYY HH:mm', () => {
      const formatted = formatarDataHora('2026-10-23T15:30:00.000Z');
      expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
    });

    it('retorna "Não informada" se data inválida', () => {
      expect(formatarDataHora(null)).toBe('Não informada');
      expect(formatarDataHora('invalido')).toBe('Não informada');
    });
  });

  describe('formatarAcaoEvento', () => {
    it('retorna meta de apresentação correta', () => {
      expect(formatarAcaoEvento('criar').label).toBe('Criação');
      expect(formatarAcaoEvento('bloquear').badgeClass).toBe('badge-danger');
      expect(formatarAcaoEvento('desbloquear').badgeClass).toBe('badge-success');
    });
  });

  describe('validarCriarUsuario', () => {
    const admin = { role: 'admin' };

    it('valida dados corretos e devolve payload pronto', () => {
      const res = validarCriarUsuario({
        nome: '  Carlos Silva  ',
        email: ' Carlos@Empresa.com ',
        senha: 'senha123',
        confirmacaoSenha: 'senha123',
        papel: 'vendedor',
        telefone: '(11) 91234-5678',
      }, admin);

      expect(res.valido).toBe(true);
      expect(res.dados).toEqual({
        nome: 'Carlos Silva',
        email: 'carlos@empresa.com',
        senha: 'senha123',
        papel: 'vendedor',
        telefone: '11912345678',
      });
      expect(res.dados.confirmacaoSenha).toBeUndefined();
    });

    it('recusa nome, email ou senha vazios', () => {
      const res = validarCriarUsuario({ nome: '', email: '', senha: '', papel: '' }, admin);
      expect(res.valido).toBe(false);
      expect(res.erros.nome).toBeDefined();
      expect(res.erros.email).toBeDefined();
      expect(res.erros.senha).toBeDefined();
      expect(res.erros.papel).toBeDefined();
    });

    it('recusa senha curta (< 6 caracteres) ou divergente da confirmação', () => {
      const res = validarCriarUsuario({
        nome: 'Carlos',
        email: 'carlos@x.com',
        senha: '123',
        confirmacaoSenha: '456',
        papel: 'vendedor',
      }, admin);

      expect(res.valido).toBe(false);
      expect(res.erros.senha).toBe('Senha deve ter no mínimo 6 caracteres');
      expect(res.erros.confirmacaoSenha).toBe('Confirmação de senha não confere');
    });

    it('recusa criação de admin e escalada de privilégio', () => {
      const resAdmin = validarCriarUsuario({
        nome: 'Carlos',
        email: 'carlos@x.com',
        senha: '123456',
        confirmacaoSenha: '123456',
        papel: 'admin',
      }, admin);
      expect(resAdmin.valido).toBe(false);
      expect(resAdmin.erros.papel).toBe('Usuários Admin não podem ser criados por aqui');

      const supervisor = { role: 'vendedor', cargo: 'supervisor', nivel: 50 };
      const resEscalada = validarCriarUsuario({
        nome: 'Carlos',
        email: 'carlos@x.com',
        senha: '123456',
        confirmacaoSenha: '123456',
        papel: 'gerente',
      }, supervisor);
      expect(resEscalada.valido).toBe(false);
      expect(resEscalada.erros.papel).toBe('Você só pode gerenciar usuários de cargo abaixo do seu nível');
    });
  });

  describe('validarBloqueioUsuario', () => {
    it('valida motivo com 3 a 300 caracteres', () => {
      const valido = validarBloqueioUsuario('  Usuário solicitou desligamento  ');
      expect(valido.valido).toBe(true);
      expect(valido.motivo).toBe('Usuário solicitou desligamento');

      const curto = validarBloqueioUsuario('ab');
      expect(curto.valido).toBe(false);
      expect(curto.erro).toBe('Motivo deve ter ao menos 3 caracteres');

      const vazio = validarBloqueioUsuario('   ');
      expect(vazio.valido).toBe(false);
      expect(vazio.erro).toBe('Motivo é obrigatório');

      const longo = validarBloqueioUsuario('a'.repeat(301));
      expect(longo.valido).toBe(false);
      expect(longo.erro).toBe('Motivo muito longo');
    });
  });

  describe('dados cadastrais', () => {
    const base = { ...DADOS_VAZIOS, telefone: '(11) 91234-5678' };

    it('exige telefone e aceita o restante vazio', () => {
      expect(validarDadosCadastrais(DADOS_VAZIOS).erros.telefone).toBeDefined();
      expect(validarDadosCadastrais({ ...DADOS_VAZIOS, telefone: '123' }).erros.telefone).toBeDefined();
      const ok = validarDadosCadastrais(base);
      expect(ok.valido).toBe(true);
      expect(dadosParaCriacao(ok.dados)).toEqual({ telefone: '11912345678' });
    });

    it('normaliza máscaras para dígitos e UF para maiúscula', () => {
      const res = validarDadosCadastrais({ ...base, cpf: '529.982.247-25', cep: '01001-000', uf: 'sp' });
      expect(res.valido).toBe(true);
      expect(res.dados).toMatchObject({ cpf: '52998224725', cep: '01001000', uf: 'SP' });
    });

    it('recusa CPF inválido, CEP curto, UF fora da lista e datas fora do intervalo', () => {
      const res = validarDadosCadastrais({
        ...base, cpf: '111.111.111-11', cep: '123', uf: 'XX',
        data_nascimento: '2999-01-01', data_admissao: '1900-01-01',
      });
      expect(Object.keys(res.erros).sort()).toEqual(['cep', 'cpf', 'data_admissao', 'data_nascimento', 'uf']);
    });

    it('recusa textos acima do limite', () => {
      expect(validarDadosCadastrais({ ...base, observacoes: 'x'.repeat(1001) }).erros.observacoes).toBeDefined();
      expect(validarDadosCadastrais({ ...base, numero: 'x'.repeat(21) }).erros.numero).toBeDefined();
    });

    it('dadosParaFormulario converte null em vazio', () => {
      const form = dadosParaFormulario({ telefone: '11912345678', cpf: null, uf: 'SP' });
      expect(form).toMatchObject({ telefone: '11912345678', cpf: '', uf: 'SP', observacoes: '' });
    });

    it('dadosAlterados manda só o que mudou e limpa com null', () => {
      const inicial = dadosParaFormulario({ telefone: '11912345678', cpf: '52998224725', cidade: 'Santos' });
      const atual = validarDadosCadastrais({ ...inicial, telefone: '(11) 91234-5678', cidade: '', observacoes: ' Tarde ' });

      expect(dadosAlterados(atual.dados, inicial)).toEqual({ cidade: null, observacoes: 'Tarde' });
    });

    it('dadosAlterados vazio quando nada mudou (inclusive só a máscara)', () => {
      const inicial = dadosParaFormulario({ telefone: '11912345678', cpf: '52998224725' });
      const atual = validarDadosCadastrais({ ...inicial, cpf: '529.982.247-25' });
      expect(dadosAlterados(atual.dados, inicial)).toEqual({});
    });

    it('formata a ação editar na trilha', () => {
      expect(formatarAcaoEvento('editar').label).toBe('Edição de dados');
    });
  });
});
