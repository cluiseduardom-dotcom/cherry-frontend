import { describe, expect, it } from 'vitest';
import {
  formatarDataHora,
  formatarPercentual,
  formatarDescricaoEvento,
  getComissaoStatusMeta,
  getRepasseStatusMeta,
} from './formatarComissao';

describe('formatarComissao utils', () => {
  describe('formatarDataHora', () => {
    it('formata ISO timestamp para pt-BR com data e hora', () => {
      const res = formatarDataHora('2026-10-23T14:02:11.000Z');
      expect(res).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
    });

    it('retorna "Não informada" se data for nula ou inválida', () => {
      expect(formatarDataHora(null)).toBe('Não informada');
      expect(formatarDataHora(undefined)).toBe('Não informada');
      expect(formatarDataHora('invalido')).toBe('Não informada');
    });
  });

  describe('formatarPercentual', () => {
    it('formata valor numérico ou string com símbolo de %', () => {
      expect(formatarPercentual('5.0000')).toBe('5%');
      expect(formatarPercentual('5.5000')).toBe('5,5%');
      expect(formatarPercentual(3.25)).toBe('3,25%');
    });

    it('retorna "-" para valores nulos, vazios ou indefinidos', () => {
      expect(formatarPercentual(null)).toBe('-');
      expect(formatarPercentual(undefined)).toBe('-');
      expect(formatarPercentual('')).toBe('-');
      expect(formatarPercentual('abc')).toBe('-');
    });
  });

  describe('formatarDescricaoEvento', () => {
    it('descreve apurada', () => {
      expect(formatarDescricaoEvento('apurada', 'venda')).toBe('Comissão apurada (venda finalizada)');
    });

    it('descreve liberações por tipo de origem', () => {
      expect(formatarDescricaoEvento('liberacao', 'venda')).toBe('Liberação imediata (à vista / pix / débito)');
      expect(formatarDescricaoEvento('liberacao', 'pagamento')).toBe('Liberação por pagamento de parcela');
      expect(formatarDescricaoEvento('liberacao', 'repasse')).toBe('Liberação por confirmação de repasse em dinheiro');
      expect(formatarDescricaoEvento('liberacao', 'conta_receber')).toBe('Liberação por recebimento de conta a receber');
    });

    it('descreve reduções e estornos', () => {
      expect(formatarDescricaoEvento('reducao', 'estorno_pagamento')).toBe('Redução por estorno de pagamento');
      expect(formatarDescricaoEvento('estorno', 'cancelamento_venda')).toBe('Estorno total por cancelamento da venda');
    });
  });

  describe('getComissaoStatusMeta', () => {
    it('retorna metadados para cada status de comissao com texto e icone', () => {
      expect(getComissaoStatusMeta('liberada').label).toBe('Liberada');
      expect(getComissaoStatusMeta('parcial').label).toBe('Parcial');
      expect(getComissaoStatusMeta('pendente').label).toBe('Pendente');
      expect(getComissaoStatusMeta('estornada').label).toBe('Estornada');
      expect(getComissaoStatusMeta('estornada').badgeClass).toBe('badge-danger');
      expect(getComissaoStatusMeta('liberada').icon).toBeDefined();
    });
  });

  describe('getRepasseStatusMeta', () => {
    it('retorna metadados para cada status de repasse com texto e icone', () => {
      expect(getRepasseStatusMeta('a_repassar').label).toBe('A repassar');
      expect(getRepasseStatusMeta('confirmado').label).toBe('Confirmado');
      expect(getRepasseStatusMeta('cancelado').label).toBe('Cancelado');
    });
  });
});
