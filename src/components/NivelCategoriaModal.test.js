import { describe, it, expect } from 'vitest';
import { montarPayload } from './NivelCategoriaModal.jsx';

describe('NivelCategoriaModal.montarPayload', () => {
  const form = { nivel: '2', nome: ' Tamanho ' };

  it('produto: payload antigo, sem escopo', () => {
    expect(montarPayload(form, 'create')).toEqual({ nivel: 2, nome: 'Tamanho' });
  });

  it('insumo: envia o escopo na criação', () => {
    expect(montarPayload(form, 'create', 'insumo')).toEqual({ nivel: 2, nome: 'Tamanho', escopo: 'insumo' });
  });

  it('edição só envia o nome', () => {
    expect(montarPayload(form, 'edit', 'insumo')).toEqual({ nome: 'Tamanho' });
  });
});
