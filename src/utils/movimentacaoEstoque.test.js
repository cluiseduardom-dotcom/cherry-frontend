import { describe, it, expect } from 'vitest';
import { motivosDoTipo, montarPayloadMovimentacao, podeAjustarParaMais, tiposDisponiveis, validarMovimentacao } from './movimentacaoEstoque';

const estoquista = { role: 'estoquista', capacidades: [] };
const admin = { role: 'admin', capacidades: [] };
const produto = { id: 1, estoque_atual: 5 };
const form = (extra = {}) => ({ produtoId: '1', tipo: 'saida', quantidade: '2', motivoCodigo: 'perda', observacao: '', ...extra });
const codigos = (tipo, user) => motivosDoTipo(tipo, user).map(m => m.codigo);

describe('motivosDoTipo / tiposDisponiveis', () => {
  it('saída e ajuste: lista completa para qualquer usuário', () => {
    expect(codigos('saida', estoquista)).toEqual(['perda', 'avaria', 'brinde', 'uso_interno', 'outro']);
    expect(codigos('ajuste', estoquista)).toEqual(['contagem', 'correcao']);
  });

  it('entrada: estoquista comum não tem nenhum motivo; o tipo nem aparece', () => {
    expect(codigos('entrada', estoquista)).toEqual([]);
    expect(tiposDisponiveis(estoquista)).toEqual(['saida', 'ajuste']);
  });

  it('entrada: receber_sem_compra libera só o recebimento sem compra (estoque inicial não é delegável)', () => {
    const comprador = { role: 'estoquista', capacidades: ['receber_sem_compra', 'ajustar_estoque'] };
    expect(codigos('entrada', comprador)).toEqual(['recebimento_sem_compra']);
  });

  it('entrada: admin tem estoque inicial e recebimento sem compra', () => {
    expect(codigos('entrada', admin)).toEqual(['estoque_inicial', 'recebimento_sem_compra']);
  });

  it('perfil vindo de /auth/me (perfil) também vale como admin', () => {
    expect(codigos('entrada', { perfil: 'admin', capacidades: [] })).toContain('estoque_inicial');
  });
});

describe('podeAjustarParaMais', () => {
  it('só com a capacidade (ou admin)', () => {
    expect(podeAjustarParaMais(estoquista)).toBe(false);
    expect(podeAjustarParaMais({ role: 'estoquista', capacidades: ['ajustar_estoque'] })).toBe(true);
    expect(podeAjustarParaMais(admin)).toBe(true);
    expect(podeAjustarParaMais(undefined)).toBe(false);
  });
});

describe('validarMovimentacao', () => {
  it('aceita saída válida', () => {
    expect(validarMovimentacao(form(), produto)).toBe('');
  });

  it('exige produto, quantidade inteira e motivo', () => {
    expect(validarMovimentacao(form({ produtoId: '' }), null)).toBe('Selecione um produto');
    expect(validarMovimentacao(form({ quantidade: '' }), produto)).toBe('Quantidade inválida');
    expect(validarMovimentacao(form({ quantidade: '1.5' }), produto)).toBe('Quantidade inválida');
    expect(validarMovimentacao(form({ motivoCodigo: '' }), produto)).toBe('Selecione o motivo');
  });

  it('motivo de outro tipo é recusado', () => {
    expect(validarMovimentacao(form({ tipo: 'entrada', motivoCodigo: 'perda' }), produto)).toBe('Selecione o motivo');
  });

  it('saída acima do estoque é recusada; ajuste aceita 0', () => {
    expect(validarMovimentacao(form({ quantidade: '9' }), produto)).toBe('Estoque insuficiente (disponível: 5)');
    expect(validarMovimentacao(form({ tipo: 'ajuste', quantidade: '0', motivoCodigo: 'contagem' }), produto)).toBe('');
  });

  it('observação é obrigatória (mín. 3) em outro, correção e recebimento sem compra', () => {
    for (const extra of [
      { tipo: 'saida', motivoCodigo: 'outro' },
      { tipo: 'ajuste', motivoCodigo: 'correcao' },
      { tipo: 'entrada', motivoCodigo: 'recebimento_sem_compra' },
    ]) {
      expect(validarMovimentacao(form(extra), produto)).toBe('Informe a observação para este motivo');
      expect(validarMovimentacao(form({ ...extra, observacao: ' ab ' }), produto)).toBe('Informe a observação para este motivo');
      expect(validarMovimentacao(form({ ...extra, observacao: 'Bonificação' }), produto)).toBe('');
    }
  });

  it('não bloqueia ajuste para mais no cliente: quem decide é o backend (o saldo é por local)', () => {
    expect(validarMovimentacao(form({ tipo: 'ajuste', quantidade: '50', motivoCodigo: 'contagem' }), produto)).toBe('');
  });
});

describe('montarPayloadMovimentacao', () => {
  it('envia só os campos do contrato, sem o antigo "motivo" livre', () => {
    expect(montarPayloadMovimentacao(form({ observacao: '  Caiu  ' }))).toEqual({
      tipo: 'saida', quantidade: 2, motivo_codigo: 'perda', observacao: 'Caiu',
    });
    expect(montarPayloadMovimentacao(form())).toEqual({ tipo: 'saida', quantidade: 2, motivo_codigo: 'perda', observacao: undefined });
    expect(Object.keys(montarPayloadMovimentacao(form()))).not.toContain('motivo');
  });
});
