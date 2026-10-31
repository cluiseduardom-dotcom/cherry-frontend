import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import MovimentacaoEstoqueModal from './MovimentacaoEstoqueModal.jsx';

const noop = () => {};
const render = () => renderToStaticMarkup(createElement(MovimentacaoEstoqueModal, { open: true, produtos: [], onClose: noop, onSaved: noop }));

describe('MovimentacaoEstoqueModal', () => {
  it('na entrada (tipo padrão) oferece imprimir etiquetas da entrada, marcado por padrão', () => {
    const html = render();

    expect(html).toContain('Imprimir etiquetas desta entrada');
    expect(html).toMatch(/type="checkbox"[^>]*checked/);
  });
});
