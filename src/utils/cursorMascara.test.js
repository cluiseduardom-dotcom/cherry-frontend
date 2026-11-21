import { describe, it, expect } from 'vitest';
import { contarSignificativos, posicaoAposMascara } from './cursorMascara';
import { aplicarMascaraCNPJ, aplicarMascaraCPF } from './mascaras';

describe('cursor em campo com máscara', () => {
  it('conta números e letras, ignorando separadores', () => {
    expect(contarSignificativos('12.ABC.345/01')).toBe(10);
    expect(contarSignificativos('(11) 9')).toBe(3);
    expect(contarSignificativos('')).toBe(0);
  });

  it('digitando o CNPJ alfanumérico letra a letra o cursor acompanha e a ordem se mantém', () => {
    let valor = '';
    for (const c of '12ABC34501DE35') {
      const digitado = valor + c; // cursor no fim
      const mascarado = aplicarMascaraCNPJ(digitado);
      const pos = posicaoAposMascara(mascarado, contarSignificativos(digitado));
      expect(pos).toBe(mascarado.length);
      valor = mascarado;
    }
    expect(valor).toBe('12.ABC.345/01DE-35');
  });

  it('cursor no meio: depois de 3 caracteres significativos, mesmo com separador inserido', () => {
    expect(posicaoAposMascara('12.ABC.345/01DE-35', 3)).toBe(4);
    expect(posicaoAposMascara('12.ABC.345/01DE-35', 0)).toBe(0);
    expect(posicaoAposMascara('123.456', 6)).toBe(7);
  });

  it('numéricos seguem como antes', () => {
    expect(posicaoAposMascara(aplicarMascaraCPF('12345'), 4)).toBe(5);
  });
});
