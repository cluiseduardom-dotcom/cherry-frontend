import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  CHAVE_TEMA_DEV,
  TEMAS,
  TEMA_PADRAO,
  aplicarTema,
  lerTemaDev,
  resolverTema,
} from './themes';

const SRC = resolve(process.cwd(), 'src');
const css = readFileSync(join(SRC, 'theme', 'themes.css'), 'utf8');

// Extrai { token: valor } do bloco cujo seletor contém `seletor`.
function tokensDoBloco(seletor) {
  const regex = new RegExp(`${seletor}\\s*\\{([^}]*)\\}`);
  const bloco = css.match(regex);
  if (!bloco) throw new Error(`Bloco não encontrado: ${seletor}`);
  const tokens = {};
  for (const [, nome, valor] of bloco[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens[nome] = valor.trim().toUpperCase();
  }
  return tokens;
}

const padrao = tokensDoBloco(':root,\\s*html\\[data-theme="vertumno"\\]');
const cherry = tokensDoBloco('html\\[data-theme="cherry"\\]');
const valvazori = tokensDoBloco('html\\[data-theme="valvazori"\\]');
const emilly = tokensDoBloco('html\\[data-theme="emilly"\\]');

const HEX_CHERRY = ['#A70636', '#91052F', '#D33A63', '#F8DCE4', '#FCF2F4', '#5D031E', '#760426'];
const HEX_NAVY = ['#0B2545', '#091D38', '#1F5FBF', '#E8F0FB', '#13315C', '#F4F6F9'];

function arquivosCss(dir, acc = []) {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) arquivosCss(caminho, acc);
    else if (nome.endsWith('.css')) acc.push(caminho);
  }
  return acc;
}

describe('tokens dos temas', () => {
  it('os dois temas definem exatamente o mesmo conjunto de tokens', () => {
    expect(Object.keys(cherry).sort()).toEqual(Object.keys(padrao).sort());
  });

  it('o tema Valvazori define exatamente o mesmo conjunto de tokens dos demais', () => {
    expect(Object.keys(valvazori).sort()).toEqual(Object.keys(padrao).sort());
  });

  it('tema Valvazori: azul-marinho do logo do cliente, menu claro, sem cores Cherry nem o azul do padrão', () => {
    expect(valvazori['--color-primary']).toBe('#102961');
    expect(valvazori['--color-primary-rgb']).toBe('16, 41, 97');
    expect(valvazori['--sidebar-bg']).toBe('#FFFFFF');
    const valores = Object.values(valvazori).join(' ');
    for (const hex of HEX_CHERRY) expect(valores).not.toContain(hex);
    for (const hex of ['#0B2545', '#1F5FBF', '#B8922E']) expect(valores).not.toContain(hex);
    for (const token of ['--color-primary', '--color-bg', '--chart-a', '--sidebar-text-strong']) {
      expect(valvazori[token]).not.toBe(padrao[token]);
    }
  });

  it('tema padrão VERTUMNO: azul-marinho, azul e dourado, sem nenhuma cor Cherry', () => {
    expect(padrao['--color-primary']).toBe('#0B2545');
    expect(padrao['--color-secondary']).toBe('#1F5FBF');
    expect(padrao['--color-accent']).toBeTruthy();
    const valores = Object.values(padrao).join(' ');
    for (const hex of HEX_CHERRY) expect(valores).not.toContain(hex);
  });

  it('tema Cherry: vinho, bordô e rosa-claro, sem nenhuma cor do tema padrão', () => {
    expect(cherry['--color-primary']).toBe('#A70636');
    expect(cherry['--color-primary-ultra']).toBe('#F8DCE4');
    expect(cherry['--color-bg']).toBe('#FCF2F4');
    expect(cherry['--color-hero-from']).toBe('#5D031E');
    const valores = Object.values(cherry).join(' ');
    for (const hex of HEX_NAVY) expect(valores).not.toContain(hex);
  });

  it('o tema Cherry preserva os valores históricos do design system', () => {
    expect(cherry['--color-primary-dark']).toBe('#91052F');
    expect(cherry['--color-primary-light']).toBe('#D33A63');
    expect(cherry['--color-primary-rgb']).toBe('167, 6, 54');
    expect(cherry['--color-text-price']).toBe('#A70636');
    expect(cherry['--color-border']).toBe('#E5D7DB');
    expect(cherry['--brand-500']).toBe('#A70636');
  });

  it('cada tema tem tokens próprios para marca, fundo e gráficos', () => {
    for (const token of ['--color-primary', '--color-bg', '--color-hero-to', '--chart-a', '--chart-b', '--chart-c']) {
      expect(padrao[token]).not.toBe(cherry[token]);
    }
  });

  it('a paleta de marca não fica mais fixa no index.css', () => {
    const indexCss = readFileSync(join(SRC, 'index.css'), 'utf8');
    expect(indexCss).not.toMatch(/--color-primary:\s*#/);
    expect(indexCss).not.toMatch(/--color-bg:\s*#/);
  });

  it('nenhum CSS usa a cor Cherry fixa (rgba) fora dos tokens do tema', () => {
    for (const arquivo of arquivosCss(SRC)) {
      expect(readFileSync(arquivo, 'utf8'), arquivo).not.toMatch(/rgba\(167,\s*6,\s*54/);
    }
  });

  it('o dashboard usa só tokens semânticos (sem cores fixas nem tokens locais)', () => {
    const dashCss = readFileSync(join(SRC, 'pages', 'Dashboard.css'), 'utf8');
    const semBranco = dashCss.replace(/#fff\b/gi, '');
    expect(semBranco).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(dashCss).not.toMatch(/--dash-/);
    expect(dashCss).not.toMatch(/rgba\(\d/);

    const dashJsx = readFileSync(join(SRC, 'pages', 'Dashboard.jsx'), 'utf8');
    expect(dashJsx).not.toMatch(/#[0-9a-f]{6}\b/i);
  });
});

describe('tema Emilly (demonstração)', () => {
  const luminancia = (hex) => {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contraste = (a, b) => {
    const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
    return (x + 0.05) / (y + 0.05);
  };

  it('define exatamente o mesmo conjunto de tokens dos demais', () => {
    expect(Object.keys(emilly).sort()).toEqual(Object.keys(padrao).sort());
  });

  it('verde-menta e rosa pastel, menu claro, sem cores dos outros temas', () => {
    expect(emilly['--color-primary']).toBe('#1B7F6F');
    expect(emilly['--color-secondary']).toBe('#C2447A');
    expect(emilly['--color-bg']).toBe('#F3FBF9');
    const valores = Object.values(emilly).join(' ');
    for (const hex of [...HEX_CHERRY, ...HEX_NAVY, '#102961']) expect(valores).not.toContain(hex);
  });

  it('acessibilidade: texto de botão e de corpo ≥ 4,5:1 e borda de campo ≥ 3:1', () => {
    expect(contraste('#FFFFFF', emilly['--color-primary'])).toBeGreaterThanOrEqual(4.5);
    expect(contraste('#FFFFFF', emilly['--color-secondary'])).toBeGreaterThanOrEqual(4.5);
    expect(contraste(emilly['--color-text-primary'], emilly['--color-bg'])).toBeGreaterThanOrEqual(4.5);
    expect(contraste(emilly['--color-text-muted'], '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(contraste(emilly['--color-border-input'], '#FFFFFF')).toBeGreaterThanOrEqual(3);
    expect(contraste(emilly['--sidebar-text'], '#DFF5F0')).toBeGreaterThanOrEqual(4.5);
    expect(contraste(emilly['--sidebar-text-muted'], '#DFF5F0')).toBeGreaterThanOrEqual(4.5);
    expect(contraste('#FFFFFF', '#A93868')).toBeGreaterThanOrEqual(4.5); // item ativo do menu
  });

  it('o texto de autoria da faixa do Dashboard fica legível sobre o verde-escuro', () => {
    const regra = readFileSync(join(SRC, 'theme', 'themes.css'), 'utf8').match(/html\[data-theme="emilly"\] \.dashboard-hero-quote figcaption \{ color: (#[0-9A-F]{6}); \}/i);

    expect(regra).not.toBeNull();
    expect(contraste(regra[1].toUpperCase(), emilly['--color-hero-from'])).toBeGreaterThanOrEqual(4.5);
  });

  it('acentos em amarelo clarinho e lilás claro (tons pastel, claros)', () => {
    expect(emilly['--color-accent-soft']).toMatch(/^#FFF/);
    expect(emilly['--color-role-admin-bg']).toBe('#EEE6FB');
    expect(emilly['--chart-c']).toBe('#BBA4E6');
    expect(emilly['--section-accent']).toBe('#CDB8F0');
    expect(emilly['--nav-active-accent']).toBe('#FFE98A');
    // texto de ícone/alerta rosa-escuro continua legível sobre o amarelo clarinho
    expect(contraste(emilly['--color-accent'], emilly['--color-accent-soft'])).toBeGreaterThanOrEqual(4.5);
    // papel do usuário: verde-escuro sobre lilás claro
    expect(contraste(emilly['--color-role-admin'], emilly['--color-role-admin-bg'])).toBeGreaterThanOrEqual(4.5);
  });

  it('a marca tem nome, logo, símbolo e paleta de avatares', () => {
    expect(TEMAS.emilly.marca.nomeCompleto).toBe('Emilly Graziela');
    expect(TEMAS.emilly.marca.logo).toBeTruthy();
    expect(TEMAS.emilly.marca.simbolo).toBeTruthy();
    expect(TEMAS.emilly.marca.paleta.every(c => /^#[0-9A-F]{6}$/i.test(c))).toBe(true);
    expect(resolverTema('emilly')).toBe('emilly');
  });
});

describe('seleção de tema', () => {
  it('o padrão é o tema VERTUMNO', () => {
    expect(TEMA_PADRAO).toBe('vertumno');
    expect(resolverTema(undefined)).toBe('vertumno');
    expect(resolverTema(null)).toBe('vertumno');
    expect(resolverTema('')).toBe('vertumno');
  });

  it('tema desconhecido ou perigoso cai no padrão', () => {
    expect(resolverTema('outra-empresa')).toBe('vertumno');
    expect(resolverTema('__proto__')).toBe('vertumno');
    expect(resolverTema('constructor')).toBe('vertumno');
  });

  it('reconhece os temas registrados', () => {
    expect(resolverTema('cherry')).toBe('cherry');
    expect(resolverTema('vertumno')).toBe('vertumno');
    expect(resolverTema('valvazori')).toBe('valvazori');
    expect(Object.keys(TEMAS).sort()).toEqual(['cherry', 'emilly', 'valvazori', 'vertumno']);
  });

  it('aplicarTema grava data-theme e usa o padrão quando não há tema', () => {
    const el = { dataset: {} };
    aplicarTema(el, 'cherry');
    expect(el.dataset.theme).toBe('cherry');
    aplicarTema(el, undefined);
    expect(el.dataset.theme).toBe('vertumno');
  });
});

describe('pré-visualização em desenvolvimento', () => {
  function storageFalso(inicial = {}) {
    const dados = { ...inicial };
    return {
      dados,
      getItem: k => (k in dados ? dados[k] : null),
      setItem: (k, v) => { dados[k] = v; },
      removeItem: k => { delete dados[k]; },
    };
  }

  it('em produção é ignorada por completo, mesmo com parâmetro e storage', () => {
    const storage = storageFalso({ [CHAVE_TEMA_DEV]: 'cherry' });
    expect(lerTemaDev({ search: '?tema=cherry', storage, isDev: false })).toBeNull();
    expect(lerTemaDev({ search: '', storage, isDev: false })).toBeNull();
    expect(storage.dados[CHAVE_TEMA_DEV]).toBe('cherry');
  });

  it('sem parâmetro nem escolha guardada, nenhum tema personalizado é selecionado', () => {
    expect(lerTemaDev({ search: '', storage: storageFalso(), isDev: true })).toBeNull();
    expect(resolverTema(lerTemaDev({ search: '', storage: storageFalso(), isDev: true }))).toBe('vertumno');
  });

  it('?tema=cherry seleciona e guarda a escolha na sessão', () => {
    const storage = storageFalso();
    expect(lerTemaDev({ search: '?tema=cherry', storage, isDev: true })).toBe('cherry');
    expect(storage.dados[CHAVE_TEMA_DEV]).toBe('cherry');
    expect(lerTemaDev({ search: '', storage, isDev: true })).toBe('cherry');
  });

  it('?tema=padrao ou valor inválido limpa a escolha', () => {
    const storage = storageFalso({ [CHAVE_TEMA_DEV]: 'cherry' });
    expect(lerTemaDev({ search: '?tema=padrao', storage, isDev: true })).toBeNull();
    expect(storage.dados[CHAVE_TEMA_DEV]).toBeUndefined();
    storage.setItem(CHAVE_TEMA_DEV, 'cherry');
    expect(lerTemaDev({ search: '?tema=qualquer', storage, isDev: true })).toBeNull();
  });

  it('valor inválido guardado na sessão é descartado', () => {
    const storage = storageFalso({ [CHAVE_TEMA_DEV]: 'empresa-x' });
    expect(lerTemaDev({ search: '', storage, isDev: true })).toBeNull();
  });
});

describe('marca por tema', () => {
  it('o tema padrão usa o logo oficial do VERTUMNO, sem ícone gráfico inventado', () => {
    const { marca } = TEMAS.vertumno;
    expect(marca.nome).toBe('VERTUMNO');
    expect(marca.mostrarIcone).toBe(false);
    expect(marca.subtitulo).toBeNull();
    expect(marca.logo).toBeTruthy();
    expect(marca.simbolo).toBeTruthy();
    expect(marca.logoAlt).toMatch(/VERTUMNO/);
    expect(marca.slogan).toBeTruthy();
  });

  it('o tema Cherry tem logo, símbolo, slogan e ornamento próprios, sem reaproveitar os do VERTUMNO', () => {
    const v = TEMAS.vertumno.marca;
    const c = TEMAS.cherry.marca;
    expect(c.logo).toBeTruthy();
    expect(c.simbolo).toBeTruthy();
    expect(c.ornamento).toBeTruthy();
    expect(c.logoAlt).toMatch(/Cherry/);
    expect(c.slogan).not.toBe(v.slogan);
    for (const chave of ['logo', 'simbolo', 'ornamento', 'slogan', 'sloganAutor', 'logoAlt']) {
      expect(c[chave]).not.toBe(v[chave]);
    }
    expect(v.ornamento).toBeNull();
  });

  it('o arquivo original da cereja com folha verde (PDFs e favicon) permanece intacto', () => {
    const arquivo = readFileSync(join(process.cwd(), 'public', 'cherry-logo.jpg'));
    expect(createHash('md5').update(arquivo).digest('hex')).toBe('1312807fd86aa0902dae985cd1f744b2');
  });

  it('o logo do VERTUMNO (recorte da referência aprovada) existe em src/assets', () => {
    for (const arquivo of ['vertumno-logo.png', 'vertumno-simbolo.png']) {
      expect(statSync(join(SRC, 'assets', arquivo)).size).toBeGreaterThan(10_000);
    }
  });

  it('o tema Cherry mantém a marca textual provisória até a logo oficial ser confirmada', () => {
    expect(TEMAS.cherry.marca.nome).toBe('Cherry');
    expect(TEMAS.cherry.marca.subtitulo).toBe('SEMIJOIAS');
  });

  it('o menu lateral: cada tema tem o seu degradê escuro e o seu item ativo (azul no padrão, dourado no Cherry)', () => {
    expect(padrao['--sidebar-bg']).toContain('#0F2137');
    expect(padrao['--sidebar-active-bg']).toContain('#2466C9');
    expect(cherry['--sidebar-bg']).toContain('#5B0F21');
    expect(cherry['--sidebar-active-bg']).toContain('#DDB07E');
  });

  it('o logo e o símbolo do Cherry (cereja dourada) existem em src/assets', () => {
    for (const arquivo of ['cherry-logo.png', 'cherry-simbolo.png', 'cherry-ornamento.png']) {
      expect(statSync(join(SRC, 'assets', arquivo)).size).toBeGreaterThan(1_000);
    }
  });

  it('os acentos dourados pertencem só ao Cherry: no tema padrão ficam transparentes', () => {
    expect(padrao['--section-accent']).toBe('TRANSPARENT');
    expect(padrao['--nav-active-accent']).toBe('TRANSPARENT');
    expect(cherry['--section-accent']).toBe('VAR(--COLOR-ACCENT)');
    expect(cherry['--nav-active-accent']).toBe('VAR(--COLOR-ACCENT)');
  });

  it('o menu lateral acompanha a altura da janela e só o menu rola quando falta espaço', () => {
    const sidebarCss = readFileSync(join(SRC, 'components', 'Sidebar.css'), 'utf8');
    expect(sidebarCss).toMatch(/height:\s*100dvh/);
    expect(sidebarCss).toMatch(/\.sidebar \{[^}]*position:\s*fixed[^}]*bottom:\s*0/s);
    expect(sidebarCss).toMatch(/\.sidebar-nav \{[^}]*min-height:\s*0[^}]*overflow-y:\s*auto/s);
  });

  it('o tema Valvazori tem logo e símbolo próprios (fundo transparente) e sem frase de marca do VERTUMNO', () => {
    for (const arquivo of ['valvazori-logo.png', 'valvazori-simbolo.png']) {
      expect(statSync(join(SRC, 'assets', arquivo)).size).toBeGreaterThan(1_000);
    }
    expect(TEMAS.valvazori.marca.nomeCompleto).toBe('Valvazori Imports');
    expect(TEMAS.valvazori.marca.logo).not.toBe(TEMAS.vertumno.marca.logo);
    expect(TEMAS.valvazori.marca.simbolo).not.toBe(TEMAS.vertumno.marca.simbolo);
    expect(TEMAS.valvazori.marca.tagline).toBeNull();
    expect(TEMAS.cherry.marca.tagline).toBeNull();
    expect(TEMAS.vertumno.marca.tagline).toBe('GESTÃO QUE IMPULSIONA');
  });

  it('todo tema tem paleta de avatar em hex e textos de login', () => {
    for (const tema of Object.values(TEMAS)) {
      expect(tema.marca.paleta.length).toBeGreaterThan(0);
      for (const cor of tema.marca.paleta) expect(cor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(tema.marca.loginTitulo).toBeTruthy();
      expect(tema.marca.loginDescricao).toBeTruthy();
    }
  });

  it('não há seleção por empresa nem por id fixo no registro de temas', () => {
    const fonte = readFileSync(join(SRC, 'theme', 'themes.js'), 'utf8');
    expect(fonte).not.toMatch(/empresa_id|empresaId/);
  });
});
