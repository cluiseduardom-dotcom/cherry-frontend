import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ProductRow from './ProductRow.jsx';

const render = product => renderToStaticMarkup(createElement(ProductRow, { product }));
const base = { id: 1, name: 'Colar Lua', price: 49.9, stock: 10 };

describe('ProductRow — indicador "Sem SKU"', () => {
  it('produto SEM SKU mostra o badge "Sem SKU" (SKU aparece como —)', () => {
    const html = render({ ...base, sku: null, semSku: true });
    expect(html).toContain('Sem SKU');
    expect(html).toContain('product-row-pill');
    expect(html).toContain('—');
  });

  it('produto COM SKU mostra o SKU e não mostra o badge', () => {
    const html = render({ ...base, sku: 'BR01007', semSku: false });
    expect(html).toContain('BR01007');
    expect(html).not.toContain('Sem SKU');
  });

  it('sem a flag semSku (ex.: PDV, que usa — como placeholder) não mostra o badge', () => {
    expect(render({ ...base, sku: '—' })).not.toContain('Sem SKU');
  });

  it('o badge não altera preço nem estoque exibidos', () => {
    const html = render({ ...base, sku: null, semSku: true });
    expect(html).toContain('49,90');
    expect(html).toContain('10 un');
  });
});
