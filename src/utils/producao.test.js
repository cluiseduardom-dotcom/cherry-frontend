import { describe, it, expect } from 'vitest';
import {
  acoesDaOrdem,
  formatarPrazo,
  montarConclusao,
  montarConclusaoPorPeso,
  montarFichaTecnica,
  produtosProduziveis,
  resumirNecessidade,
  resumirPendencias,
  rotuloStatus,
  temCustoNaOrdem,
  validarConclusao,
  validarFichaTecnica,
  validarMotivo,
  validarNovaOrdem,
} from './producao';

describe('acoesDaOrdem', () => {
  it('cada estado permite só o que faz sentido', () => {
    expect(acoesDaOrdem({ status: 'planejada' })).toEqual(['iniciar', 'cancelar']);
    expect(acoesDaOrdem({ status: 'em_producao' })).toEqual(['concluir', 'cancelar']);
    expect(acoesDaOrdem({ status: 'cancelada' })).toEqual([]);
    expect(acoesDaOrdem(null)).toEqual([]);
  });

  it('concluída só oferece regularizar quando há pendência de insumo', () => {
    expect(acoesDaOrdem({ status: 'concluida', tem_pendencia: false })).toEqual([]);
    expect(acoesDaOrdem({ status: 'concluida', tem_pendencia: true })).toEqual(['regularizar']);
  });
});

describe('validarNovaOrdem', () => {
  it('aceita ordem válida', () => {
    expect(validarNovaOrdem({ produto_id: '3', quantidade_planejada: '10', prazo: '2026-12-01' })).toBe('');
    expect(validarNovaOrdem({ produto_id: '3', quantidade_planejada: 10, prazo: '' })).toBe('');
  });

  it('recusa produto ausente, quantidade inválida e prazo mal formado', () => {
    expect(validarNovaOrdem({ produto_id: '', quantidade_planejada: '1' })).toMatch(/produto/i);
    for (const q of ['', '0', '-1', '1.5', 'abc']) {
      expect(validarNovaOrdem({ produto_id: '3', quantidade_planejada: q })).toMatch(/quantidade/i);
    }
    expect(validarNovaOrdem({ produto_id: '3', quantidade_planejada: '2000000' })).toMatch(/máxima/);
    expect(validarNovaOrdem({ produto_id: '3', quantidade_planejada: '1', prazo: '01/12/2026' })).toMatch(/prazo/i);
  });
});

describe('conclusão', () => {
  it('aceita produzida e/ou perdida; perda vazia vale zero', () => {
    expect(validarConclusao({ quantidade_produzida: '8', quantidade_perdida: '2' })).toBe('');
    expect(validarConclusao({ quantidade_produzida: '8', quantidade_perdida: '' })).toBe('');
    expect(validarConclusao({ quantidade_produzida: '0', quantidade_perdida: '3' })).toBe('');
    expect(montarConclusao({ quantidade_produzida: '8', quantidade_perdida: '' })).toEqual({ quantidade_produzida: 8, quantidade_perdida: 0 });
  });

  it('recusa nada informado, negativo e decimal', () => {
    expect(validarConclusao({ quantidade_produzida: '0', quantidade_perdida: '0' })).toMatch(/ao menos uma/);
    expect(validarConclusao({ quantidade_produzida: '', quantidade_perdida: '' })).toMatch(/ao menos uma/);
    expect(validarConclusao({ quantidade_produzida: '-1', quantidade_perdida: '0' })).toMatch(/produzida/);
    expect(validarConclusao({ quantidade_produzida: '1', quantidade_perdida: '1.5' })).toMatch(/perdida/);
  });
});

describe('validarMotivo', () => {
  it('3 a 200 caracteres, ignorando espaços nas pontas', () => {
    expect(validarMotivo('  ab  ')).toMatch(/mínimo/);
    expect(validarMotivo('abc')).toBe('');
    expect(validarMotivo('x'.repeat(201))).toMatch(/200/);
    expect(validarMotivo(undefined)).toMatch(/mínimo/);
  });
});

describe('ficha técnica', () => {
  it('valida linhas e monta o corpo no contrato do backend (quantidade_necessaria)', () => {
    expect(validarFichaTecnica([])).toMatch(/ao menos um/);
    expect(validarFichaTecnica([{ insumo_produto_id: '', quantidade: '1' }])).toMatch(/insumo/i);
    expect(validarFichaTecnica([{ insumo_produto_id: '1', quantidade: '1' }, { insumo_produto_id: '1', quantidade: '2' }])).toMatch(/repetido/);
    expect(validarFichaTecnica([{ insumo_produto_id: '1', quantidade: '0' }])).toMatch(/inteiro/);
    expect(validarFichaTecnica([{ insumo_produto_id: '1', quantidade: '1.5' }])).toMatch(/inteiro/);
    const ok = [{ insumo_produto_id: '1', quantidade: '2' }, { insumo_produto_id: '5', quantidade: '1' }];

    expect(validarFichaTecnica(ok)).toBe('');
    expect(montarFichaTecnica(ok)).toEqual([
      { insumo_produto_id: 1, quantidade_necessaria: 2 },
      { insumo_produto_id: 5, quantidade_necessaria: 1 },
    ]);
  });
});

describe('resumirNecessidade', () => {
  it('suficiente: tom ok, sem aviso', () => {
    const r = resumirNecessidade({ insumos: [{ suficiente: true }, { suficiente: true }] });
    expect(r.tom).toBe('ok');
    expect(r.faltantes).toEqual([]);
  });

  it('faltou insumo: só avisa, deixando claro que dá para produzir mesmo assim', () => {
    const r = resumirNecessidade({ insumos: [{ nome: 'Ovo', suficiente: false }, { nome: 'Farinha', suficiente: true }] });
    expect(r.tom).toBe('aviso');
    expect(r.faltantes.map(i => i.nome)).toEqual(['Ovo']);
    expect(r.detalhe).toMatch(/produzir mesmo assim/);
  });

  it('sem dados devolve vazio', () => {
    expect(resumirNecessidade(null).tom).toBe('neutro');
  });
});

describe('pendências e custo', () => {
  it('soma o que ainda falta baixar', () => {
    const r = resumirPendencias({ pendencias: [{ quantidade_pendente: 7 }, { quantidade_pendente: 3 }] });
    expect(r).toMatchObject({ tem: true, total: 10 });
    expect(resumirPendencias({ pendencias: [] }).tem).toBe(false);
    expect(resumirPendencias(null).tem).toBe(false);
  });

  it('custo só existe quando o backend envia (mesmo zero)', () => {
    expect(temCustoNaOrdem({ custo_insumos: 0 })).toBe(true);
    expect(temCustoNaOrdem({ status: 'concluida' })).toBe(false);
  });
});

describe('formatadores e filtros', () => {
  it('rótulo de status e prazo', () => {
    expect(rotuloStatus('em_producao')).toBe('Em produção');
    expect(rotuloStatus('x')).toBe('x');
    expect(formatarPrazo('2026-12-01')).toBe('01/12/2026');
    expect(formatarPrazo(null)).toBe('—');
  });

  it('só produto acabado e ativo pode ser produzido', () => {
    const lista = [
      { id: 1, tipo: 'acabado', ativo: true },
      { id: 2, tipo: 'insumo', ativo: true },
      { id: 3, tipo: 'acabado', ativo: false },
    ];
    expect(produtosProduziveis(lista).map(p => p.id)).toEqual([1]);
    expect(produtosProduziveis(null)).toEqual([]);
  });
});

describe('montarConclusaoPorPeso (produto vendido por peso)', () => {
  const base = { quantidade_perdida: '', escolha_produzida: 'base', escolha_perdida: 'base' };

  it('converte g e kg para a unidade-base inteira', () => {
    expect(montarConclusaoPorPeso({ ...base, quantidade_produzida: '600' }, 'G').conclusao).toEqual({ quantidade_produzida: 600, quantidade_perdida: 0 });
    expect(montarConclusaoPorPeso({ ...base, quantidade_produzida: '1,2', escolha_produzida: 'grande' }, 'G').conclusao).toEqual({ quantidade_produzida: 1200, quantidade_perdida: 0 });
    expect(montarConclusaoPorPeso({ ...base, quantidade_produzida: '700', quantidade_perdida: '50' }, 'G').conclusao).toEqual({ quantidade_produzida: 700, quantidade_perdida: 50 });
    expect(montarConclusaoPorPeso({ ...base, quantidade_produzida: '2', escolha_produzida: 'grande' }, 'ML').conclusao.quantidade_produzida).toBe(2000);
  });

  it('aceita rendimento zero se algo se perdeu; recusa tudo zerado, vazio e inválido', () => {
    expect(montarConclusaoPorPeso({ ...base, quantidade_produzida: '0', quantidade_perdida: '300' }, 'G').conclusao).toEqual({ quantidade_produzida: 0, quantidade_perdida: 300 });
    expect(montarConclusaoPorPeso({ ...base, quantidade_produzida: '0' }, 'G').erro).toMatch(/ao menos 1 g/);
    expect(montarConclusaoPorPeso({ ...base, quantidade_produzida: '' }, 'G').erro).toMatch(/Informe quanto rendeu/);
    expect(montarConclusaoPorPeso({ ...base, quantidade_produzida: 'abc' }, 'G').erro).not.toBe('');
    expect(montarConclusaoPorPeso({ ...base, quantidade_produzida: '1,2345', escolha_produzida: 'grande' }, 'G').erro).toMatch(/3 casas/);
    expect(montarConclusaoPorPeso({ ...base, quantidade_produzida: '10', quantidade_perdida: 'x' }, 'G').erro).not.toBe('');
  });
});
