import { describe, it, expect } from 'vitest';
import { calcularProgressoConferencia } from './CompraRecebimento.jsx';

const itens = [
  { id: 10, quantidade: 50 },
  { id: 11, quantidade: 30 },
  { id: 12, quantidade: 20 },
];

describe('calcularProgressoConferencia', () => {
  it('calcula 0% quando nada foi conferido — sem inventar progresso', () => {
    expect(calcularProgressoConferencia(itens, {})).toEqual({ totalPedido: 100, totalConferido: 0, percentual: 0 });
  });

  it('soma apenas o conferido localmente, a partir dos itens reais da compra', () => {
    const conferidos = { 10: 50, 11: 15 };
    expect(calcularProgressoConferencia(itens, conferidos)).toEqual({ totalPedido: 100, totalConferido: 65, percentual: 65 });
  });

  it('não ultrapassa 100% mesmo com valores inconsistentes', () => {
    const conferidos = { 10: 999 };
    expect(calcularProgressoConferencia(itens, conferidos).percentual).toBe(100);
  });

  it('não quebra com itens/conferidos vazios ou inválidos', () => {
    expect(calcularProgressoConferencia([], {})).toEqual({ totalPedido: 0, totalConferido: 0, percentual: 0 });
    expect(calcularProgressoConferencia(undefined, undefined)).toEqual({ totalPedido: 0, totalConferido: 0, percentual: 0 });
  });
});
