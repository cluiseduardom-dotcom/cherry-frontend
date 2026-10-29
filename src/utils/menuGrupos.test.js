import { describe, it, expect } from 'vitest';
import { ESTRUTURA_MENU, montarMenu, grupoContemRota, rotaPertence, lerGruposAbertos, salvarGruposAbertos } from './menuGrupos';

const TODAS = ESTRUTURA_MENU.flatMap(e => (e.tipo === 'item' ? [e.path] : e.itens));
const todas = () => true;

describe('montarMenu', () => {
  it('admin vê os 8 blocos, com os grupos esperados', () => {
    const menu = montarMenu(TODAS, todas);
    expect(menu).toHaveLength(8);
    const financeiro = menu.find(e => e.id === 'financeiro');
    expect(financeiro.itens).toEqual(['/contas-pagar', '/contas-receber', '/despesas-fixas', '/ponto-equilibrio', '/comissoes']);
    expect(menu[0]).toEqual({ tipo: 'item', path: '/' });
    expect(menu[1]).toEqual({ tipo: 'item', path: '/venda' });
  });

  it('cada rota aparece exatamente uma vez', () => {
    const menu = montarMenu(TODAS, todas);
    const paths = menu.flatMap(e => (e.tipo === 'item' ? [e.path] : e.itens));
    expect(paths.sort()).toEqual([...TODAS].sort());
  });

  it('grupo sem item visível some', () => {
    const menu = montarMenu(TODAS, p => p !== '/compras' && p !== '/fornecedores');
    expect(menu.find(e => e.id === 'compras')).toBeUndefined();
  });

  it('grupo com um único item visível vira item simples', () => {
    const menu = montarMenu(TODAS, p => !['/contas-pagar', '/contas-receber', '/despesas-fixas', '/ponto-equilibrio'].includes(p));
    expect(menu.find(e => e.id === 'financeiro')).toBeUndefined();
    expect(menu).toContainEqual({ tipo: 'item', path: '/comissoes' });
  });

  it('nunca mostra o que podeVer nega', () => {
    const menu = montarMenu(TODAS, p => p !== '/usuarios');
    const paths = menu.flatMap(e => (e.tipo === 'item' ? [e.path] : e.itens));
    expect(paths).not.toContain('/usuarios');
  });

  it('rota nova fora da estrutura não some: entra no fim como item', () => {
    const menu = montarMenu([...TODAS, '/nova'], todas);
    expect(menu[menu.length - 1]).toEqual({ tipo: 'item', path: '/nova' });
  });

  it('rota da estrutura que não existe como item de menu é ignorada', () => {
    const menu = montarMenu(TODAS.filter(p => p !== '/relatorios'), todas);
    expect(menu.some(e => e.path === '/relatorios')).toBe(false);
  });
});

describe('rotaPertence / grupoContemRota', () => {
  it('casa rota exata e subrotas, sem confundir prefixos parecidos', () => {
    expect(rotaPertence('/compras/recebimentos', '/compras')).toBe(true);
    expect(rotaPertence('/produtos/12/precos', '/produtos')).toBe(true);
    expect(rotaPertence('/produtos-x', '/produtos')).toBe(false);
    expect(rotaPertence('/venda', '/')).toBe(false);
    expect(rotaPertence('/', '/')).toBe(true);
  });

  it('grupo contém a rota atual', () => {
    expect(grupoContemRota(['/estoque', '/produtos'], '/produtos/3/precos')).toBe(true);
    expect(grupoContemRota(['/estoque', '/produtos'], '/clientes')).toBe(false);
  });
});

describe('persistência dos grupos abertos', () => {
  const memoria = () => {
    const dados = {};
    return { getItem: k => (k in dados ? dados[k] : null), setItem: (k, v) => { dados[k] = v; } };
  };

  it('salva e lê de volta', () => {
    const st = memoria();
    salvarGruposAbertos({ estoque: true }, st);
    expect(lerGruposAbertos(st)).toEqual({ estoque: true });
  });

  it('storage ausente, quebrado ou com lixo não derruba o menu', () => {
    expect(lerGruposAbertos(undefined)).toEqual({});
    expect(lerGruposAbertos({ getItem: () => { throw new Error('bloqueado'); } })).toEqual({});
    expect(lerGruposAbertos({ getItem: () => '[1,2]' })).toEqual({});
    expect(lerGruposAbertos({ getItem: () => '{quebrado' })).toEqual({});
    expect(() => salvarGruposAbertos({}, { setItem: () => { throw new Error('cheio'); } })).not.toThrow();
  });
});
