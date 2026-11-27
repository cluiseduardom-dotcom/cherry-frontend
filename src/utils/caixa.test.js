import { describe, it, expect } from 'vitest';
import {
  caixaLigado, corpoFechamento, estadoDoCaixaNoPdv, formasParaConferir, montarConferencia, podeGerirCaixas, podeOperarCaixa, rotuloForma, temDiferenca,
  validarAbertura, validarFechamento, validarMovimento,
} from './caixa';

describe('utils/caixa', () => {
  it('caixaLigado: só com a funcionalidade na lista; lista ausente = não ligado (o PDV não exige caixa)', () => {
    expect(caixaLigado({ funcionalidades: ['fiado', 'caixa'] })).toBe(true);
    expect(caixaLigado({ funcionalidades: ['fiado'] })).toBe(false);
    expect(caixaLigado({})).toBe(false);
    expect(caixaLigado(null)).toBe(false);
  });

  it('capacidades: admin tem tudo; cargo precisa da capacidade; sem ela não', () => {
    expect(podeOperarCaixa({ role: 'admin' })).toBe(true);
    expect(podeOperarCaixa({ role: 'vendedor', capacidades: ['operar_caixa'] })).toBe(true);
    expect(podeOperarCaixa({ role: 'vendedor', capacidades: ['cancelar_venda'] })).toBe(false);
    expect(podeGerirCaixas({ role: 'vendedor', capacidades: ['operar_caixa'] })).toBe(false);
    expect(podeGerirCaixas({ role: 'vendedor', capacidades: ['gerir_caixas'] })).toBe(true);
  });

  it('abertura: caixa obrigatório; saldo pode ser zero mas não negativo nem lixo', () => {
    expect(validarAbertura({ caixaId: '', saldo: '0' })).toMatch(/caixa/i);
    expect(validarAbertura({ caixaId: 1, saldo: '0' })).toBeNull();
    expect(validarAbertura({ caixaId: 1, saldo: '150,50' })).toBeNull();
    expect(validarAbertura({ caixaId: 1, saldo: '' })).toMatch(/valor/i);
    expect(validarAbertura({ caixaId: 1, saldo: 'abc' })).toMatch(/valor/i);
    expect(validarAbertura({ caixaId: 1, saldo: '-5' })).toMatch(/valor/i);
    expect(validarAbertura({ caixaId: 1, saldo: '1000000' })).toMatch(/máximo/i);
  });

  it('movimento: tipo, valor > 0, motivo >= 3; sangria não passa do dinheiro em caixa', () => {
    expect(validarMovimento({ tipo: 'troca', valor: '5', motivo: 'abc' })).toMatch(/suprimento ou sangria/);
    expect(validarMovimento({ tipo: 'sangria', valor: '0', motivo: 'abc' })).toMatch(/maior que zero/);
    expect(validarMovimento({ tipo: 'sangria', valor: '5', motivo: 'ab' })).toMatch(/motivo/i);
    expect(validarMovimento({ tipo: 'suprimento', valor: '5', motivo: 'Troco' })).toBeNull();
    expect(validarMovimento({ tipo: 'sangria', valor: '50', motivo: 'Cofre' }, 40)).toMatch(/maior que o dinheiro/);
    expect(validarMovimento({ tipo: 'sangria', valor: '40', motivo: 'Cofre' }, 40)).toBeNull();
    expect(validarMovimento({ tipo: 'suprimento', valor: '500', motivo: 'Reforço' }, 40)).toBeNull();
  });

  it('formas a conferir: dinheiro sempre, mais as que o servidor informa, em ordem fixa', () => {
    expect(formasParaConferir({})).toEqual(['dinheiro']);
    expect(formasParaConferir({ dinheiro: 90, debito: 100, pix: 80 })).toEqual(['dinheiro', 'pix', 'debito']);
    expect(formasParaConferir({ crediario: 200 })).toEqual(['dinheiro', 'crediario']);
    expect(formasParaConferir(undefined)).toEqual(['dinheiro']);
  });

  it('conferência: diferença = contado - esperado; campo vazio ou ilegível é inválido', () => {
    const linhas = montarConferencia({ dinheiro: 90, pix: 80 }, { dinheiro: '85,5', pix: '' });

    expect(linhas[0]).toMatchObject({ forma: 'dinheiro', esperado: 90, informado: 85.5, diferenca: -4.5, invalido: false });
    expect(linhas[1]).toMatchObject({ forma: 'pix', esperado: 80, informado: null, diferenca: null, invalido: true });
    expect(montarConferencia({ dinheiro: 0.3 }, { dinheiro: '0,1' })[0].diferenca).toBe(-0.2);
  });

  it('fechamento: sem diferença não pede justificativa; com diferença exige; campo inválido barra', () => {
    const certo = montarConferencia({ dinheiro: 90 }, { dinheiro: '90' });
    const errado = montarConferencia({ dinheiro: 90 }, { dinheiro: '80' });
    const vazio = montarConferencia({ dinheiro: 90 }, { dinheiro: '' });

    expect(temDiferenca(certo)).toBe(false);
    expect(validarFechamento(certo, '')).toBeNull();
    expect(temDiferenca(errado)).toBe(true);
    expect(validarFechamento(errado, '')).toMatch(/diferença/i);
    expect(validarFechamento(errado, 'ab')).toMatch(/diferença/i);
    expect(validarFechamento(errado, 'Troco dado a menos')).toBeNull();
    expect(validarFechamento(vazio, '')).toMatch(/valor contado/i);
  });

  it('corpo do fechamento: só forma e contado; justificativa só quando há diferença; o esperado nunca vai', () => {
    const certo = montarConferencia({ dinheiro: 90 }, { dinheiro: '90' });
    const errado = montarConferencia({ dinheiro: 90, pix: 80 }, { dinheiro: '85', pix: '80' });

    expect(corpoFechamento(certo, 'texto solto')).toEqual({ conferencia: [{ forma: 'dinheiro', informado: 90 }] });
    expect(corpoFechamento(errado, '  Troco  ')).toEqual({
      conferencia: [{ forma: 'dinheiro', informado: 85 }, { forma: 'pix', informado: 80 }],
      justificativa: 'Troco',
    });
  });

  it('PDV: sem a funcionalidade nada aparece nem bloqueia; ligado e sem caixa aberto bloqueia; erro de consulta não trava', () => {
    expect(estadoDoCaixaNoPdv({ ligado: false, carregando: false, erro: '', sessao: null })).toEqual({ visivel: false, bloqueia: false, mensagem: '' });
    expect(estadoDoCaixaNoPdv({ ligado: true, carregando: true, erro: '', sessao: null })).toMatchObject({ visivel: true, bloqueia: false });
    expect(estadoDoCaixaNoPdv({ ligado: true, carregando: false, erro: 'x', sessao: null })).toMatchObject({ visivel: true, bloqueia: false });
    expect(estadoDoCaixaNoPdv({ ligado: true, carregando: false, erro: '', sessao: null })).toMatchObject({ visivel: true, bloqueia: true, mensagem: expect.stringMatching(/abra o caixa/i) });
    expect(estadoDoCaixaNoPdv({ ligado: true, carregando: false, erro: '', sessao: { sessao: { caixa_nome: 'Balcão 1' } } }))
      .toEqual({ visivel: true, bloqueia: false, mensagem: 'Caixa aberto: Balcão 1' });
  });

  it('rótulos', () => {
    expect(rotuloForma('debito')).toBe('Débito');
    expect(rotuloForma('outra')).toBe('outra');
  });
});
