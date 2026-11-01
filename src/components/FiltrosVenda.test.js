import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import FiltrosVenda from './FiltrosVenda.jsx';
import { FILTROS_PADRAO } from '../utils/filtrosVitrine';

const noop = () => {};
const render = (filtros, ativos = 0) => renderToStaticMarkup(
  createElement(FiltrosVenda, { filtros: { ...FILTROS_PADRAO, ...filtros }, onChange: noop, onLimpar: noop, ativos })
);

describe('FiltrosVenda', () => {
  it('mostra ordenação, estoque e faixa de preço; Limpar desabilitado sem filtros', () => {
    const html = render({});
    expect(html).toContain('Ordenar por');
    expect(html).toContain('Menor preço');
    expect(html).toContain('Somente com estoque');
    expect(html).toContain('Preço mínimo (R$)');
    expect(html).toContain('Preço máximo (R$)');
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Limpar filtros/);
  });

  it('com filtro ativo, Limpar fica habilitado e valores aparecem', () => {
    const html = render({ somenteComEstoque: true, ordenar: 'nome', precoMin: '10' }, 3);
    expect(html).not.toMatch(/<button[^>]*disabled[^>]*>Limpar filtros/);
    expect(html).toContain('checked');
    expect(html).toContain('value="10"');
    expect(html).toMatch(/<option value="nome" selected/);
  });

  it('faixa invertida mostra o erro', () => {
    const html = render({ precoMin: '50', precoMax: '10' });
    expect(html).toContain('O preço mínimo é maior que o máximo.');
    expect(html).toContain('role="alert"');
  });
});
