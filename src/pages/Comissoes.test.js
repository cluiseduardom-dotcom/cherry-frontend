import { describe, it, expect } from 'vitest';
import {
  obterAbasPermitidas,
  inicioMesISO,
  fimMesISO,
  validarPercentualInput,
} from '../utils/formatarComissao';

describe('Comissoes helpers', () => {
  describe('obterAbasPermitidas', () => {
    it('vendedor comum vê apenas "Minhas comissões" e "Repasses"', () => {
      const abas = obterAbasPermitidas({
        user: { role: 'vendedor' },
        temCapacidade: () => false,
      });

      expect(abas.map(a => a.key)).toEqual(['minhas', 'repasses']);
    });

    it('vendedor com ver_vendas_de_todos (gerente) vê "Minhas comissões", "Equipe" e "Repasses"', () => {
      const abas = obterAbasPermitidas({
        user: { role: 'vendedor' },
        temCapacidade: cap => cap === 'ver_vendas_de_todos',
      });

      expect(abas.map(a => a.key)).toEqual(['minhas', 'equipe', 'repasses']);
    });

    it('administrador vê todas as 4 abas: Minhas, Equipe, Repasses e Percentuais', () => {
      const abas = obterAbasPermitidas({
        user: { role: 'admin' },
        temCapacidade: () => true,
      });

      expect(abas.map(a => a.key)).toEqual(['minhas', 'equipe', 'repasses', 'percentuais']);
    });
  });

  describe('datas de filtro', () => {
    it('inicioMesISO retorna formato YYYY-MM-01', () => {
      const inicio = inicioMesISO();
      expect(inicio).toMatch(/^\d{4}-\d{2}-01$/);
    });

    it('fimMesISO retorna formato YYYY-MM-DD válido', () => {
      const fim = fimMesISO();
      expect(fim).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const dia = Number(fim.slice(8, 10));
      expect(dia).toBeGreaterThanOrEqual(28);
      expect(dia).toBeLessThanOrEqual(31);
    });
  });

  describe('validarPercentualInput', () => {
    it('aceita números válidos de 0 a 100', () => {
      expect(validarPercentualInput(0)).toEqual({ valido: true, valor: 0 });
      expect(validarPercentualInput('0')).toEqual({ valido: true, valor: 0 });
      expect(validarPercentualInput(5)).toEqual({ valido: true, valor: 5 });
      expect(validarPercentualInput('7.5')).toEqual({ valido: true, valor: 7.5 });
      expect(validarPercentualInput('7,5')).toEqual({ valido: true, valor: 7.5 });
      expect(validarPercentualInput('3.1234')).toEqual({ valido: true, valor: 3.1234 });
      expect(validarPercentualInput(100)).toEqual({ valido: true, valor: 100 });
    });

    it('rejeita vazio ou nulo', () => {
      expect(validarPercentualInput('')).toEqual({
        valido: false,
        erro: 'Informe um percentual válido entre 0 e 100.',
      });
      expect(validarPercentualInput(null)).toEqual({
        valido: false,
        erro: 'Informe um percentual válido entre 0 e 100.',
      });
    });

    it('rejeita valores negativos ou maiores que 100', () => {
      expect(validarPercentualInput(-1).valido).toBe(false);
      expect(validarPercentualInput(100.0001).valido).toBe(false);
      expect(validarPercentualInput(150).valido).toBe(false);
    });

    it('rejeita mais de 4 casas decimais', () => {
      expect(validarPercentualInput('5.12345')).toEqual({
        valido: false,
        erro: 'O percentual pode ter no máximo 4 casas decimais.',
      });
    });

    it('rejeita texto não numérico', () => {
      expect(validarPercentualInput('abc').valido).toBe(false);
    });
  });
});
