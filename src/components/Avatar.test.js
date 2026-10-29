import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Avatar from './Avatar';
import { iniciaisDoNome } from '../utils/iniciais';

describe('iniciaisDoNome', () => {
  it('usa as duas primeiras iniciais em maiúsculas', () => {
    expect(iniciaisDoNome('ana souza')).toBe('AS');
    expect(iniciaisDoNome('Eduardo')).toBe('E');
    expect(iniciaisDoNome('a b c')).toBe('AB');
  });

  it('sem nome devolve o valor de vazio', () => {
    expect(iniciaisDoNome('')).toBe('');
    expect(iniciaisDoNome(undefined, 'U')).toBe('U');
  });
});

describe('Avatar', () => {
  it('com foto mostra a imagem, com alt acessível', () => {
    const html = renderToStaticMarkup(createElement(Avatar, { nome: 'Ana Souza', fotoUrl: 'https://fotos.exemplo.test/1.webp', className: 'x' }));
    expect(html).toContain('src="https://fotos.exemplo.test/1.webp"');
    expect(html).toContain('alt="Foto de Ana Souza"');
    expect(html).not.toContain('>AS<');
  });

  it('sem foto mostra as iniciais e nenhuma imagem', () => {
    const html = renderToStaticMarkup(createElement(Avatar, { nome: 'Ana Souza', fotoUrl: null }));
    expect(html).toContain('AS');
    expect(html).not.toContain('<img');
  });
});
