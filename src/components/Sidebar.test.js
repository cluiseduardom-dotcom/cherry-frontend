import { describe, it, expect } from 'vitest';
import { contarAlertasEstoque } from './Sidebar.jsx';

describe('contarAlertasEstoque', () => {
  it('separa produtos com estoque baixo (estoque_atual > 0) dos esgotados (estoque_atual === 0)', () => {
    const alertas = [
      { id: 1, estoque_atual: 2, estoque_minimo: 5 },
      { id: 2, estoque_atual: 0, estoque_minimo: 5 },
      { id: 3, estoque_atual: 1, estoque_minimo: 3 },
    ];
    expect(contarAlertasEstoque(alertas)).toEqual({ baixo: 2, esgotado: 1 });
  });

  it('retorna zero para os dois tipos quando não há alertas', () => {
    expect(contarAlertasEstoque([])).toEqual({ baixo: 0, esgotado: 0 });
  });

  it('não quebra com entrada inválida (undefined/null)', () => {
    expect(contarAlertasEstoque(undefined)).toEqual({ baixo: 0, esgotado: 0 });
    expect(contarAlertasEstoque(null)).toEqual({ baixo: 0, esgotado: 0 });
  });

  it('conta somente esgotados quando não há nenhum produto com estoque baixo', () => {
    const alertas = [
      { id: 1, estoque_atual: 0, estoque_minimo: 5 },
      { id: 2, estoque_atual: 0, estoque_minimo: 2 },
    ];
    expect(contarAlertasEstoque(alertas)).toEqual({ baixo: 0, esgotado: 2 });
  });

  it('conta somente estoque baixo quando não há nenhum produto esgotado', () => {
    const alertas = [
      { id: 1, estoque_atual: 3, estoque_minimo: 5 },
    ];
    expect(contarAlertasEstoque(alertas)).toEqual({ baixo: 1, esgotado: 0 });
  });
});
