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
    expect(Object.keys(TEMAS).sort()).toEqual(['cherry', 'vertumno']);
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

  it('não há seleção por empresa nem por id fixo no registro de temas', () => {
    const fonte = readFileSync(join(SRC, 'theme', 'themes.js'), 'utf8');
    expect(fonte).not.toMatch(/empresa_id|empresaId/);
  });
});

describe('limpeza de nomes e cores legadas', () => {
  it('o código usa --brand-N: o alias legado --cherry-N só existe em index.css e themes.css', () => {
    for (const arquivo of arquivosCss(SRC)) {
      if (/index\.css$|themes\.css$/.test(arquivo)) continue;
      expect(readFileSync(arquivo, 'utf8'), arquivo).not.toMatch(/--cherry-/);
    }
  });

  it('o gráfico de ponto de equilíbrio usa o dourado do tema, não um hex fixo', () => {
    const grafico = readFileSync(join(SRC, 'components', 'GraficoPontoEquilibrio.jsx'), 'utf8');
    expect(grafico).not.toMatch(/COR_OURO|#C9A24B/i);
    expect(grafico).toContain("'var(--color-accent)'");
  });
});
