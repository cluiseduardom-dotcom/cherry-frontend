import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import MovimentacaoEstoqueModal from './MovimentacaoEstoqueModal.jsx';

const noop = () => {};
const render = user => renderToStaticMarkup(
  createElement(MemoryRouter, null, createElement(MovimentacaoEstoqueModal, { open: true, produtos: [], user, onClose: noop, onSaved: noop })),
);

const tiposDoSelect = html => [...html.matchAll(/<option value="(entrada|saida|ajuste)"/g)].map(m => m[1]);

describe('MovimentacaoEstoqueModal', () => {
  it('estoquista comum: só saída e ajuste; entrada de mercadoria é pela Compra, com link para ela', () => {
    const html = render({ role: 'estoquista', capacidades: [] });

    expect(tiposDoSelect(html)).toEqual(['saida', 'ajuste']);
    expect(html).toContain('href="/compras"');
  });

  it('abre em Saída, com o motivo obrigatório vazio e a lista de motivos de saída', () => {
    const html = render({ role: 'estoquista', capacidades: [] });

    expect(html).toContain('Motivo *');
    expect(html).toContain('Selecione o motivo');
    for (const rotulo of ['Perda', 'Avaria', 'Brinde', 'Uso interno', 'Outro']) expect(html).toContain(`>${rotulo}</option>`);
    expect(html).not.toContain('Imprimir etiquetas');
  });

  it('cargo com receber_sem_compra vê a entrada sem compra', () => {
    expect(tiposDoSelect(render({ role: 'estoquista', capacidades: ['receber_sem_compra'] }))).toEqual(['entrada', 'saida', 'ajuste']);
  });

  it('admin vê todos os tipos', () => {
    expect(tiposDoSelect(render({ role: 'admin', capacidades: [] }))).toEqual(['entrada', 'saida', 'ajuste']);
  });

  it('sem usuário nada que exija permissão é oferecido', () => {
    expect(tiposDoSelect(render(undefined))).toEqual(['saida', 'ajuste']);
  });
});
