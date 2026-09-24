import { describe, it, expect } from 'vitest';
import { ROTA_CONFIGURACOES, rotuloNivel } from './CategoriasProduto.jsx';

describe('CategoriasProduto — Navegação e rotulagem', () => {
  it('define a rota de retorno correta para a tela principal de configurações', () => {
    expect(ROTA_CONFIGURACOES).toBe('/configuracoes');
  });

  describe('rotuloNivel', () => {
    it('retorna o nome cadastrado do nível quando existe', () => {
      const niveis = [
        { id: 1, nivel: 1, nome: 'Família' },
        { id: 2, nivel: 2, nome: 'Material' },
      ];
      expect(rotuloNivel(1, niveis)).toBe('Família');
      expect(rotuloNivel(2, niveis)).toBe('Material');
    });

    it('retorna "Nível N" quando o nível não possui nome cadastrado', () => {
      expect(rotuloNivel(3, [])).toBe('Nível 3');
      expect(rotuloNivel(4, [{ id: 1, nivel: 1, nome: 'Família' }])).toBe('Nível 4');
    });
  });
});
