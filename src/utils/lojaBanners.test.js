import { describe, it, expect } from 'vitest';
import { campoParaIso, formDoBanner, isoParaCampo, linkValido, montarCorpoBanner, situacaoDoBanner, temConteudo, validarBanner } from './lojaBanners';

describe('linkValido', () => {
  it('aceita caminho da loja, https e vazio', () => {
    expect(linkValido('/produtos?novidades=true')).toBe(true);
    expect(linkValido('https://www.instagram.com/x')).toBe(true);
    expect(linkValido('')).toBe(true);
  });
  it('recusa //host, javascript:, http, usuário e senha e texto solto', () => {
    for (const l of ['//evil.com', 'javascript:alert(1)', 'data:text/html,x', 'http://x.com', 'https://u:s@x.com', 'produtos']) expect(linkValido(l)).toBe(false);
  });
});

describe('datas do formulário', () => {
  it('vai e volta (hora local) e vazio vira null', () => {
    const iso = campoParaIso('2026-11-20T09:30');
    expect(isoParaCampo(iso)).toBe('2026-11-20T09:30');
    expect(campoParaIso('')).toBeNull();
    expect(isoParaCampo(null)).toBe('');
  });
});

describe('formDoBanner / montarCorpoBanner', () => {
  it('nulos viram campo vazio e vazio vira null no corpo, com texto aparado', () => {
    const form = formDoBanner({ titulo: null, fundo: 'ouro' });
    expect(form).toMatchObject({ titulo: '', fundo: 'ouro', usa_retrato: false, inicio_em: '' });

    const corpo = montarCorpoBanner({ ...form, destaque: '  até 50% off  ', link: '  ' });
    expect(corpo).toMatchObject({ destaque: 'até 50% off', link: null, titulo: null, fundo: 'ouro' });
  });
  it('o corpo não leva ativo, ordem nem imagens (isso tem rotas e botões próprios)', () => {
    expect(Object.keys(montarCorpoBanner({})).sort()).toEqual(['botao_texto', 'destaque', 'fim_em', 'fundo', 'inicio_em', 'link', 'rodape_texto', 'rotulo', 'subtitulo', 'titulo', 'usa_retrato']);
  });
});

describe('temConteudo', () => {
  it('texto, imagem ou o retrato do dia contam', () => {
    expect(temConteudo(formDoBanner({}), null)).toBe(false);
    expect(temConteudo({ ...formDoBanner({}), titulo: 'x' }, null)).toBe(true);
    expect(temConteudo(formDoBanner({}), { imagem_direita: 'https://f/1.webp' })).toBe(true);
    expect(temConteudo({ ...formDoBanner({}), usa_retrato: true }, null)).toBe(true);
  });
});

describe('validarBanner', () => {
  it('formulário vazio é válido', () => {
    expect(validarBanner(formDoBanner({}))).toBe('');
  });
  it('aponta o primeiro problema', () => {
    expect(validarBanner({ ...formDoBanner({}), titulo: 'x'.repeat(101) })).toMatch(/100/);
    expect(validarBanner({ ...formDoBanner({}), link: 'javascript:x' })).toMatch(/Link inválido/);
    expect(validarBanner({ ...formDoBanner({}), botao_texto: 'comprar' })).toMatch(/precisa de um link/);
    expect(validarBanner({ ...formDoBanner({}), inicio_em: '2030-02-01T10:00', fim_em: '2030-01-01T10:00' })).toMatch(/depois da de início/);
  });
  it('botão com link é válido', () => {
    expect(validarBanner({ ...formDoBanner({}), botao_texto: 'comprar', link: '/produtos' })).toBe('');
  });
});

describe('situacaoDoBanner', () => {
  const agora = new Date('2026-11-15T12:00:00Z');
  it('desligada, agendada, encerrada e no ar', () => {
    expect(situacaoDoBanner({ ativo: false }, agora).rotulo).toBe('Desligada');
    expect(situacaoDoBanner({ ativo: true, inicio_em: '2026-11-20T00:00:00Z' }, agora).rotulo).toBe('Agendada');
    expect(situacaoDoBanner({ ativo: true, fim_em: '2026-11-10T00:00:00Z' }, agora).rotulo).toBe('Encerrada');
    expect(situacaoDoBanner({ ativo: true }, agora)).toEqual({ rotulo: 'Aparece na Home', tom: 'ok' });
  });
});
