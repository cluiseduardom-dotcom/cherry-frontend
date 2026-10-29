import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FotoPerfilPainel } from './FotoPerfilEditor';

const noop = () => {};
const render = (props) => renderToStaticMarkup(createElement(FotoPerfilPainel, {
  nome: 'Ana Souza', fotoUrl: null, ocupado: false, erro: '', onEscolher: noop, onRemover: noop, onArquivo: noop, ...props,
}));

describe('FotoPerfilPainel', () => {
  it('sem foto: mostra as iniciais e só oferece adicionar', () => {
    const html = render({});
    expect(html).toContain('AS');
    expect(html).toContain('Adicionar foto');
    expect(html).not.toContain('Remover foto');
    expect(html).not.toContain('<img');
  });

  it('com foto: mostra a imagem e oferece trocar e remover', () => {
    const html = render({ fotoUrl: 'https://fotos.exemplo.test/1.webp' });
    expect(html).toContain('src="https://fotos.exemplo.test/1.webp"');
    expect(html).toContain('Trocar foto');
    expect(html).toContain('Remover foto');
  });

  it('o seletor aceita só JPEG, PNG e WebP', () => {
    expect(render({})).toContain('accept="image/jpeg,image/png,image/webp"');
  });

  it('ocupado desabilita as ações; erro aparece como alerta', () => {
    const html = render({ fotoUrl: 'https://x/1.webp', ocupado: true, erro: 'A foto deve ter no máximo 2 MB' });
    expect(html).toContain('disabled=""');
    expect(html).toContain('role="alert"');
    expect(html).toContain('A foto deve ter no máximo 2 MB');
  });
});
