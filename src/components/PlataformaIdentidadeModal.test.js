import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PlataformaIdentidadeModal from './PlataformaIdentidadeModal.jsx';

const noop = () => {};
const temas = ['vertumno', 'cherry', 'valvazori'];

const render = empresa => renderToStaticMarkup(
  createElement(PlataformaIdentidadeModal, { empresa, temas, onClose: noop, onSaved: noop })
);

describe('PlataformaIdentidadeModal', () => {
  const html = render({ empresa_id: 3, empresa_nome: 'Valvazori Imports', tema_visual: 'valvazori', slug: 'valvazori' });

  it('mostra o nome da empresa, todos os temas com rótulo legível e o atual selecionado', () => {
    expect(html).toContain('Identidade visual · Valvazori Imports');
    expect(html).toContain('VERTUMNO (padrão da plataforma)');
    expect(html).toContain('Cherry Semijoias');
    expect(html).toMatch(/<option value="valvazori" selected[^>]*>Valvazori Imports<\/option>|<option value="valvazori"[^>]*selected[^>]*>Valvazori Imports<\/option>/);
  });

  it('mostra o link da marca a partir do endereço atual', () => {
    expect(html).toContain('/c/valvazori');
  });

  it('empresa sem endereço: explica que usa o login padrão', () => {
    const semSlug = render({ empresa_id: 1, empresa_nome: 'Cherry', tema_visual: 'cherry', slug: null });
    expect(semSlug).toContain('usa o login padrão');
  });

  it('o histórico aparece como carregando até a API responder, e só o botão Salvar envia', () => {
    expect(html).toContain('Carregando...');
    expect(html).toContain('type="submit"');
  });
});
