import { describe, it, expect } from 'vitest';
import { montarTimelineCompra } from './ComprasTimeline.jsx';

describe('montarTimelineCompra', () => {
  it('retorna lista vazia quando não há compra', () => {
    expect(montarTimelineCompra(null)).toEqual([]);
    expect(montarTimelineCompra(undefined)).toEqual([]);
  });

  it('monta registro + estoque + financeiro para compra à vista recebida — sem etapas fabricadas (OC/Cotação/PC/NF-e)', () => {
    const compra = {
      status: 'recebido',
      forma_pagamento: 'a_vista',
      data_compra: '2026-09-25',
      criado_em: '2026-09-25T10:00:00.000Z',
      itens: [{ quantidade: 3 }, { quantidade: 2 }],
    };

    const passos = montarTimelineCompra(compra);

    expect(passos.map(p => p.key)).toEqual(['registro', 'estoque', 'financeiro']);
    expect(passos[1].titulo).toBe('Entrada no estoque registrada');
    expect(passos[1].detalhe).toBe('5 unidade(s)');
    // Nunca "Pago à vista": isso implicaria liquidação financeira que o
    // backend não confirma — só a forma de pagamento registrada.
    expect(passos[2].titulo).toBe('Forma de pagamento: à vista');
    expect(passos[2].estado).toBe('concluido');
  });

  it('sinaliza conta a pagar gerada (estado "atencao") quando a compra é a prazo, sem inventar status de pagamento', () => {
    const compra = {
      status: 'recebido',
      forma_pagamento: 'prazo',
      dias_prazo: 30,
      data_compra: '2026-09-25',
    };

    const [, , financeiro] = montarTimelineCompra(compra);

    expect(financeiro.titulo).toBe('Conta a pagar gerada');
    expect(financeiro.estado).toBe('atencao');
    expect(financeiro.detalhe).toContain('30 dia(s)');
  });

  it('adiciona etapa de cancelamento e ajusta o rótulo do estoque quando a compra foi cancelada', () => {
    const compra = {
      status: 'cancelado',
      forma_pagamento: 'a_vista',
      data_compra: '2026-09-20',
      atualizado_em: '2026-09-26T15:00:00.000Z',
    };

    const passos = montarTimelineCompra(compra);

    expect(passos.map(p => p.key)).toEqual(['registro', 'estoque', 'financeiro', 'cancelamento']);
    expect(passos[1].titulo).toBe('Estoque estornado');
    expect(passos[3].estado).toBe('divergencia');
  });

  it('não usa quantidade fabricada quando a compra não tem itens carregados', () => {
    const compra = { status: 'recebido', forma_pagamento: 'a_vista', data_compra: '2026-09-25' };
    const [, estoque] = montarTimelineCompra(compra);
    expect(estoque.detalhe).toBeNull();
  });
});
