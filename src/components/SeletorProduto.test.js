import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SeletorProduto from './SeletorProduto.jsx';

const produtos = [{ id: 7, nome: 'Anel de teste', sku: 'ANE-007', estoque_atual: 3 }];
const render = (props) => renderToStaticMarkup(createElement(SeletorProduto, { id: 'campo', produtos, value: '', onChange: () => {}, ...props }));

describe('SeletorProduto', () => {
  it('é um campo de digitação acessível (combobox), fechado e com dica de busca por nome ou código', () => {
    const html = render({});

    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('id="campo"');
    expect(html).toContain('Digite o nome ou o código do produto');
    expect(html).not.toContain('role="listbox"');
  });

  it('com produto escolhido mostra nome e SKU no campo e o botão para trocar', () => {
    const html = render({ value: '7' });

    expect(html).toContain('value="Anel de teste (ANE-007)"');
    expect(html).toContain('aria-label="Trocar produto"');
  });

  it('desabilitado não oferece o botão de trocar', () => {
    expect(render({ value: '7', disabled: true })).not.toContain('Trocar produto');
  });
});
