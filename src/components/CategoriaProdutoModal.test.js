import { describe, it, expect } from 'vitest';
import {
   formVazio,
   formFromCategoria,
   validar,
   montarPayload,
 } from './CategoriaProdutoModal.jsx';

describe('CategoriaProdutoModal helpers', () => {
  describe('formVazio', () => {
    it('retorna estado inicial com configuracao_sku_id vazio', () => {
      expect(formVazio()).toEqual({
        nivel: '',
        codigo: '',
        nome: '',
        configuracao_sku_id: '',
      });
    });
  });

  describe('formFromCategoria', () => {
    it('preenche campos a partir da categoria fornecida com padrão de SKU', () => {
      const categoria = {
        id: 1,
        nivel: 1,
        codigo: 'BR',
        nome: 'Brinco',
        configuracao_sku_id: 10,
      };
      expect(formFromCategoria(categoria)).toEqual({
        nivel: '1',
        codigo: 'BR',
        nome: 'Brinco',
        configuracao_sku_id: '10',
      });
    });

    it('preenche configuracao_sku_id vazio quando categoria não tem padrão vinculado (fallback)', () => {
      const categoria = {
        id: 2,
        nivel: 2,
        codigo: 'OURO',
        nome: 'Ouro',
        configuracao_sku_id: null,
      };
      expect(formFromCategoria(categoria)).toEqual({
        nivel: '2',
        codigo: 'OURO',
        nome: 'Ouro',
        configuracao_sku_id: '',
      });
    });
  });

  describe('validar', () => {
    it('valida campos obrigatórios no modo create', () => {
      expect(validar({ nivel: '', codigo: 'BR', nome: 'Brinco' }, 'create')).toBe(
        'Nível deve ser um número inteiro positivo'
      );
      expect(validar({ nivel: '0', codigo: 'BR', nome: 'Brinco' }, 'create')).toBe(
        'Nível deve ser um número inteiro positivo'
      );
      expect(validar({ nivel: '1', codigo: '', nome: 'Brinco' }, 'create')).toBe(
        'Código deve ter de 1 a 50 letras e/ou números'
      );
      expect(validar({ nivel: '1', codigo: 'BR', nome: '' }, 'create')).toBe(
        'Nome é obrigatório'
      );
    });

    it('permite códigos de categoria de até 50 caracteres alfanuméricos', () => {
      const codigo50 = 'A'.repeat(50);
      expect(validar({ nivel: '1', codigo: codigo50, nome: 'Brinco' }, 'create')).toBe('');

      const codigo51 = 'A'.repeat(51);
      expect(validar({ nivel: '1', codigo: codigo51, nome: 'Brinco' }, 'create')).toBe(
        'Código deve ter de 1 a 50 letras e/ou números'
      );
    });

    it('no modo edit, apenas nome é obrigatório (código e nível são fixos)', () => {
      expect(validar({ nome: '' }, 'edit')).toBe('Nome é obrigatório');
      expect(validar({ nome: 'Brincos Dourados' }, 'edit')).toBe('');
    });
  });

  describe('montarPayload', () => {
    it('converte configuracao_sku_id numérico no modo create quando preenchido', () => {
      const form = {
        nivel: '1',
        codigo: 'BR',
        nome: 'Brinco',
        configuracao_sku_id: '5',
      };
      expect(montarPayload(form, 'create')).toEqual({
        nivel: 1,
        codigo: 'BR',
        nome: 'Brinco',
        configuracao_sku_id: 5,
      });
    });

    it('envia configuracao_sku_id null quando padrão for fallback (vazio)', () => {
      const form = {
        nivel: '1',
        codigo: 'BR',
        nome: 'Brinco',
        configuracao_sku_id: '',
      };
      expect(montarPayload(form, 'create')).toEqual({
        nivel: 1,
        codigo: 'BR',
        nome: 'Brinco',
        configuracao_sku_id: null,
      });
    });

    it('no modo edit envia apenas nome e configuracao_sku_id', () => {
      const form = {
        nome: 'Brinco Especial',
        configuracao_sku_id: '12',
      };
      expect(montarPayload(form, 'edit')).toEqual({
        nome: 'Brinco Especial',
        configuracao_sku_id: 12,
      });
    });
  });
});
