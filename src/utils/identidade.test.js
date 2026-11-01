import { describe, it, expect } from 'vitest';
import {
  descreverMudancaIdentidade, formatarDataHora, linkDaMarca, normalizarSlug, rotuloTema, validarIdentidade,
} from './identidade';

const atual = { tema_visual: 'cherry', slug: 'cherry' };

describe('validarIdentidade', () => {
  it('nada alterado: válido, mas sem corpo', () => {
    expect(validarIdentidade({ tema_visual: 'cherry', slug: 'cherry' }, atual)).toEqual({ valido: true, erros: {}, corpo: null });
  });

  it('envia só o que mudou', () => {
    expect(validarIdentidade({ tema_visual: 'valvazori', slug: 'cherry' }, atual).corpo).toEqual({ tema_visual: 'valvazori' });
    expect(validarIdentidade({ tema_visual: 'cherry', slug: 'loja-cherry' }, atual).corpo).toEqual({ slug: 'loja-cherry' });
  });

  it('normaliza o slug (espaços e maiúsculas)', () => {
    expect(validarIdentidade({ tema_visual: 'cherry', slug: '  Loja-Cherry ' }, atual).corpo).toEqual({ slug: 'loja-cherry' });
  });

  it('slug em branco remove o endereço (null); sem endereço atual e em branco não muda nada', () => {
    expect(validarIdentidade({ tema_visual: 'cherry', slug: '' }, atual).corpo).toEqual({ slug: null });
    expect(validarIdentidade({ tema_visual: 'cherry', slug: '' }, { tema_visual: 'cherry', slug: null }).corpo).toBeNull();
  });

  it('recusa slug malformado e reservado', () => {
    expect(validarIdentidade({ tema_visual: 'cherry', slug: 'a b' }, atual).erros.slug).toMatch(/minúsculas/);
    expect(validarIdentidade({ tema_visual: 'cherry', slug: '-x' }, atual).valido).toBe(false);
    for (const reservado of ['app', 'admin', 'vertumno', 'gironex', 'login']) {
      const r = validarIdentidade({ tema_visual: 'cherry', slug: reservado }, atual);
      expect(r.valido, reservado).toBe(false);
      expect(r.erros.slug).toMatch(/reservado/);
    }
  });
});

describe('textos e links', () => {
  it('linkDaMarca monta /c/<slug> e some sem slug', () => {
    expect(linkDaMarca('https://app.vertumno.com.br/', 'cherry')).toBe('https://app.vertumno.com.br/c/cherry');
    expect(linkDaMarca('https://x.com', '')).toBe('');
    expect(linkDaMarca('https://x.com', null)).toBe('');
  });

  it('rotuloTema conhece os temas e não quebra com desconhecido', () => {
    expect(rotuloTema('valvazori')).toBe('Valvazori Imports');
    expect(rotuloTema('novo')).toBe('novo');
    expect(rotuloTema(null)).toBe('—');
  });

  it('normalizarSlug', () => {
    expect(normalizarSlug('  AbC ')).toBe('abc');
    expect(normalizarSlug(null)).toBe('');
  });

  it('a confirmação avisa que o link antigo deixa de funcionar', () => {
    const msg = descreverMudancaIdentidade('Cherry', { tema_visual: 'valvazori', slug: 'nova' }, 'https://x.com');
    expect(msg).toContain('Valvazori Imports');
    expect(msg).toContain('https://x.com/c/nova');
    expect(msg).toContain('deixa de funcionar');
    expect(descreverMudancaIdentidade('Cherry', { slug: null }, 'https://x.com')).toContain('removido');
  });

  it('formatarDataHora usa Brasília e tolera lixo', () => {
    expect(formatarDataHora('2026-11-01T15:30:00.000Z')).toMatch(/01\/11\/2026/);
    expect(formatarDataHora('2026-11-01T15:30:00.000Z')).toMatch(/12:30/);
    expect(formatarDataHora('x')).toBe('—');
  });
});
