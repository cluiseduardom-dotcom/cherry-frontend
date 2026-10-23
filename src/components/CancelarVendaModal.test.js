import { describe, it, expect } from 'vitest';
import {
  formInicial,
  validarCancelamento,
  montarPayloadCancelamento,
  formatarErroCancelamento,
} from '../utils/cancelamentoVenda';

describe('cancelamentoVenda helpers', () => {
  describe('formInicial', () => {
    it('retorna estado inicial limpo para motivo e autorizacao', () => {
      expect(formInicial()).toEqual({
        motivo: '',
        email: '',
        senha: '',
      });
    });
  });

  describe('validarCancelamento', () => {
    describe('motivo ausente ou invalido', () => {
      it('rejeita motivo vazio', () => {
        const form = { motivo: '', email: '', senha: '' };
        expect(validarCancelamento(form, { exige_autorizacao: false })).toBe(
          'Informe o motivo do cancelamento'
        );
      });

      it('rejeita motivo contendo apenas espacos', () => {
        const form = { motivo: '    ', email: '', senha: '' };
        expect(validarCancelamento(form, { exige_autorizacao: false })).toBe(
          'Informe o motivo do cancelamento'
        );
      });

      it('rejeita motivo com menos de 5 caracteres', () => {
        const form = { motivo: 'Erro', email: '', senha: '' };
        expect(validarCancelamento(form, { exige_autorizacao: false })).toBe(
          'O motivo deve ter no mínimo 5 caracteres'
        );
      });

      it('rejeita motivo com mais de 500 caracteres', () => {
        const form = { motivo: 'A'.repeat(501), email: '', senha: '' };
        expect(validarCancelamento(form, { exige_autorizacao: false })).toBe(
          'O motivo deve ter no máximo 500 caracteres'
        );
      });
    });

    describe('fluxo normal (sem autorizacao necessaria)', () => {
      it('aceita motivo valido com pelo menos 5 caracteres sem exigir email/senha', () => {
        const form = { motivo: 'Cliente desistiu do pedido', email: '', senha: '' };
        expect(validarCancelamento(form, { exige_autorizacao: false })).toBe('');
      });
    });

    describe('autorizacao necessaria (venda que exige supervisor/gerente)', () => {
      const previaComAutorizacao = {
        exige_autorizacao: true,
        autorizador_minimo: { cargo: 'supervisor', rotulo: 'Supervisor', nivel: 2 },
      };

      it('rejeita se email do autorizador nao for preenchido', () => {
        const form = { motivo: 'Cancelamento tardio solicitado', email: '', senha: '' };
        expect(validarCancelamento(form, previaComAutorizacao)).toBe(
          'Informe o e-mail do autorizador'
        );
      });

      it('rejeita se senha do autorizador nao for preenchida', () => {
        const form = {
          motivo: 'Cancelamento tardio solicitado',
          email: 'supervisor@loja.com',
          senha: '',
        };
        expect(validarCancelamento(form, previaComAutorizacao)).toBe(
          'Informe a senha do autorizador'
        );
      });

      it('aceita formulario completo com motivo valido e credenciais do autorizador', () => {
        const form = {
          motivo: 'Cancelamento tardio solicitado',
          email: 'supervisor@loja.com',
          senha: 'senha-do-supervisor',
        };
        expect(validarCancelamento(form, previaComAutorizacao)).toBe('');
      });
    });
  });

  describe('montarPayloadCancelamento', () => {
    it('no fluxo normal monta payload apenas com motivo sem a chave autorizacao', () => {
      const form = {
        motivo: '  Cliente solicitou troca por outro modelo  ',
        email: '',
        senha: '',
      };
      const previa = { exige_autorizacao: false };

      expect(montarPayloadCancelamento(form, previa)).toEqual({
        motivo: 'Cliente solicitou troca por outro modelo',
      });
    });

    it('quando autorizacao for necessaria inclui objeto autorizacao com email e senha', () => {
      const form = {
        motivo: '  Cancelamento após 15 dias  ',
        email: '  gerente@comercio.com  ',
        senha: 'segredo-forte',
      };
      const previa = { exige_autorizacao: true };

      expect(montarPayloadCancelamento(form, previa)).toEqual({
        motivo: 'Cancelamento após 15 dias',
        autorizacao: {
          email: 'gerente@comercio.com',
          senha: 'segredo-forte',
        },
      });
    });
  });

  describe('formatarErroCancelamento', () => {
    it('trata erro 400 (dados invalidos / motivo invalido)', () => {
      const err = { status: 400, message: 'Motivo deve ter no mínimo 5 caracteres' };
      expect(formatarErroCancelamento(err)).toBe('Motivo deve ter no mínimo 5 caracteres');
    });

    it('trata erro 403 de autorizacao necessaria', () => {
      const err = { status: 403, message: 'Esta venda exige autorização de Supervisor ou superior' };
      expect(formatarErroCancelamento(err)).toBe(
        'Esta venda exige autorização de Supervisor ou superior'
      );
    });

    it('trata erro 403 de credenciais de autorizacao invalidas', () => {
      const err = { status: 403, message: 'Autorização inválida' };
      expect(formatarErroCancelamento(err)).toBe(
        'Autorização recusada: e-mail ou senha incorretos, ou cargo insuficiente.'
      );
    });

    it('trata erro 404 (venda nao encontrada)', () => {
      const err = { status: 404, message: 'Venda não encontrada' };
      expect(formatarErroCancelamento(err)).toBe(
        'Venda não encontrada ou não disponível para cancelamento.'
      );
    });

    it('trata erro 409 de conflito quando venda ja foi cancelada', () => {
      const err = { status: 409, message: 'Somente vendas finalizadas podem ser canceladas' };
      expect(formatarErroCancelamento(err)).toBe(
        'Esta venda já foi cancelada ou não está finalizada.'
      );
    });

    it('trata erro 409 de conflito quando conta a receber ja foi recebida', () => {
      const err = { status: 409, message: 'Não é possível cancelar venda com conta a receber já recebida' };
      expect(formatarErroCancelamento(err)).toBe(
        'Não é possível cancelar venda com conta a receber já recebida.'
      );
    });

    it('trata erro 409 de conflito quando venda mudou de faixa durante autorizacao', () => {
      const err = {
        status: 409,
        message: 'A idade da venda mudou de faixa durante a autorização. Tente novamente.',
      };
      expect(formatarErroCancelamento(err)).toBe(
        'A idade da venda mudou de faixa durante a autorização. Tente novamente.'
      );
    });

    it('trata erro 429 de limite de tentativas de autorizacao', () => {
      const err = { status: 429, message: 'Muitas tentativas' };
      expect(formatarErroCancelamento(err)).toBe(
        'Limite de tentativas de autorização atingido. Aguarde alguns minutos antes de tentar novamente.'
      );
    });

    it('trata erro generico sem status especifico', () => {
      const err = { message: 'Erro de conexao com banco' };
      expect(formatarErroCancelamento(err)).toBe('Erro de conexao com banco');
    });
  });
});