import { describe, it, expect } from 'vitest';
import { TUTORIAIS, ID_TUTORIAL_PRINCIPAL } from '../data/tutoriais';
import { ALLOWED_ROLES_BY_PATH, canAccessRoute } from '../config/access';
import {
  buscarTutorial,
  caminhoDoTutorial,
  checklistOculto,
  lerTutoriaisLidos,
  marcarTutorialLido,
  ocultarChecklist,
  passosParaUsuario,
  passosPrimeirosPassos,
  resumoChecklist,
} from './tutoriais';

function storageFalso(inicial = {}) {
  const dados = { ...inicial };
  return {
    getItem: chave => (chave in dados ? dados[chave] : null),
    setItem: (chave, valor) => {
      dados[chave] = String(valor);
    },
  };
}

const storageQuebrado = {
  getItem() {
    throw new Error('bloqueado');
  },
  setItem() {
    throw new Error('bloqueado');
  },
};

describe('catálogo de tutoriais', () => {
  it('ids únicos, com passos, título e texto', () => {
    const ids = TUTORIAIS.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const tutorial of TUTORIAIS) {
      expect(tutorial.titulo).toBeTruthy();
      expect(tutorial.passos.length).toBeGreaterThan(0);
      for (const passo of tutorial.passos) {
        expect(passo.titulo).toBeTruthy();
        expect(passo.texto).toBeTruthy();
      }
    }
  });

  it('toda rota citada em um passo existe em access.js (não aponta para tela inexistente)', () => {
    for (const tutorial of TUTORIAIS) {
      for (const passo of tutorial.passos) {
        if (passo.rota) expect(ALLOWED_ROLES_BY_PATH[passo.rota], `${tutorial.id}: ${passo.rota}`).toBeDefined();
      }
    }
  });

  it('o tutorial principal existe', () => {
    expect(buscarTutorial(ID_TUTORIAL_PRINCIPAL)).not.toBeNull();
  });
});

describe('buscarTutorial e caminhoDoTutorial', () => {
  it('acha por id e devolve null para id desconhecido', () => {
    expect(buscarTutorial('sku').id).toBe('sku');
    expect(buscarTutorial('nao-existe')).toBeNull();
  });

  it('monta o caminho', () => {
    expect(caminhoDoTutorial('sku')).toBe('/tutoriais/sku');
    expect(caminhoDoTutorial()).toBe('/tutoriais');
  });
});

describe('acesso às rotas de tutorial', () => {
  it('todos os papéis acessam a lista e o detalhe', () => {
    for (const role of ['admin', 'vendedor', 'estoquista', 'faturista']) {
      expect(canAccessRoute('/tutoriais', role)).toBe(true);
      expect(canAccessRoute('/tutoriais/:id', role)).toBe(true);
    }
  });
});

describe('passosParaUsuario', () => {
  const tutorial = buscarTutorial('sku');

  it('admin mantém os botões que abrem telas', () => {
    const passos = passosParaUsuario(tutorial, { role: 'admin' });
    expect(passos.some(p => p.rota === '/configuracoes/sku')).toBe(true);
  });

  it('vendedor não recebe botão para tela que não pode abrir, mas lê o texto', () => {
    const passos = passosParaUsuario(tutorial, { role: 'vendedor' });
    expect(passos).toHaveLength(tutorial.passos.length);
    expect(passos.some(p => p.rota === '/configuracoes/sku')).toBe(false);
    expect(passos.every(p => p.texto)).toBe(true);
  });

  it('tutorial inexistente devolve lista vazia', () => {
    expect(passosParaUsuario(null, { role: 'admin' })).toEqual([]);
  });
});

describe('progresso de leitura (localStorage)', () => {
  it('marca e relê sem duplicar', () => {
    const storage = storageFalso();
    expect(lerTutoriaisLidos(storage)).toEqual([]);
    marcarTutorialLido('sku', storage);
    marcarTutorialLido('sku', storage);
    marcarTutorialLido('primeira-venda', storage);
    expect(lerTutoriaisLidos(storage)).toEqual(['sku', 'primeira-venda']);
  });

  it('valor corrompido vira lista vazia', () => {
    expect(lerTutoriaisLidos(storageFalso({ 'tutoriais:lidos': '{nao json' }))).toEqual([]);
    expect(lerTutoriaisLidos(storageFalso({ 'tutoriais:lidos': '{"a":1}' }))).toEqual([]);
  });

  it('storage bloqueado não quebra', () => {
    expect(lerTutoriaisLidos(storageQuebrado)).toEqual([]);
    expect(() => marcarTutorialLido('sku', storageQuebrado)).not.toThrow();
    expect(checklistOculto(storageQuebrado)).toBe(false);
    expect(() => ocultarChecklist(storageQuebrado)).not.toThrow();
  });

  it('checklist oculto persiste', () => {
    const storage = storageFalso();
    expect(checklistOculto(storage)).toBe(false);
    ocultarChecklist(storage);
    expect(checklistOculto(storage)).toBe(true);
  });
});

describe('checklist de primeiros passos', () => {
  it('empresa nova: nada concluído', () => {
    const passos = passosPrimeirosPassos({ categorias: 0, produtos: 0, produtosComSku: 0, vendas: 0 });
    expect(passos.map(p => p.concluido)).toEqual([false, false, false, false]);
    expect(resumoChecklist(passos)).toEqual({ feitos: 0, total: 4, completo: false });
  });

  it('conclui cada passo pelo sinal correspondente', () => {
    const passos = passosPrimeirosPassos({ categorias: 3, produtos: 10, produtosComSku: 0, vendas: 0 });
    expect(passos.find(p => p.id === 'categorias').concluido).toBe(true);
    expect(passos.find(p => p.id === 'produtos').concluido).toBe(true);
    expect(passos.find(p => p.id === 'sku').concluido).toBe(false);
    expect(resumoChecklist(passos).feitos).toBe(2);
  });

  it('tudo feito = completo', () => {
    const passos = passosPrimeirosPassos({ categorias: 1, produtos: 1, produtosComSku: 1, vendas: 1 });
    expect(resumoChecklist(passos).completo).toBe(true);
  });

  it('sinal desconhecido (null/ausente) nunca marca como concluído', () => {
    const passos = passosPrimeirosPassos({ categorias: null, produtos: null });
    expect(passos.every(p => p.concluido === false)).toBe(true);
  });

  it('cada passo aponta para um tutorial e uma rota que existem', () => {
    for (const passo of passosPrimeirosPassos({})) {
      expect(buscarTutorial(passo.tutorial), passo.id).not.toBeNull();
      expect(ALLOWED_ROLES_BY_PATH[passo.rota], passo.id).toBeDefined();
    }
  });
});
