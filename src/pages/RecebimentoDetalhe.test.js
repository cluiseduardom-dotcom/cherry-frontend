import { describe, it, expect } from 'vitest';
import { calcularDivergenciaItensRecebimento, badgeClassePorStatus } from './RecebimentoDetalhe.jsx';

describe('calcularDivergenciaItensRecebimento', () => {
  it('usa quantidade_pedida/quantidade_recebida reais do backend, sem calcular nada novo', () => {
    const itens = [
      { id: 1, quantidade_pedida: 50, quantidade_recebida: 50 },
      { id: 2, quantidade_pedida: 30, quantidade_recebida: 28 },
      { id: 3, quantidade_pedida: 20, quantidade_recebida: 20 },
    ];
    expect(calcularDivergenciaItensRecebimento(itens)).toEqual({
      totalItens: 3,
      itensDivergentes: 1,
      temDivergencia: true,
    });
  });

  it('sem divergência quando tudo bate', () => {
    const itens = [{ id: 1, quantidade_pedida: 10, quantidade_recebida: 10 }];
    expect(calcularDivergenciaItensRecebimento(itens)).toEqual({
      totalItens: 1,
      itensDivergentes: 0,
      temDivergencia: false,
    });
  });

  it('não quebra com lista vazia ou inválida', () => {
    expect(calcularDivergenciaItensRecebimento([])).toEqual({ totalItens: 0, itensDivergentes: 0, temDivergencia: false });
    expect(calcularDivergenciaItensRecebimento(undefined)).toEqual({ totalItens: 0, itensDivergentes: 0, temDivergencia: false });
  });
});

describe('badgeClassePorStatus', () => {
  it('mapeia cada status real do backend (migration 030_recebimentos.sql) para uma classe de badge', () => {
    expect(badgeClassePorStatus('APROVADO')).toBe('badge badge-success');
    expect(badgeClassePorStatus('CANCELADO')).toBe('badge badge-danger');
    expect(badgeClassePorStatus('DIVERGENCIA')).toBe('badge badge-warning');
    expect(badgeClassePorStatus('CONFERIDO')).toBe('badge badge-info');
    expect(badgeClassePorStatus('RASCUNHO')).toBe('badge badge-warning');
    expect(badgeClassePorStatus('EM_CONFERENCIA')).toBe('badge badge-warning');
  });
});
