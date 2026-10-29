import { describe, it, expect } from 'vitest';
import {
  MINUTOS_PIX_RECENTE, mensagemDevolucao, pixRecente, rotuloOrigemPix, rotuloStatusDevolucao, validarMotivoDevolucao,
} from './pixDevolucao';

describe('validarMotivoDevolucao', () => {
  it('exige motivo com pelo menos 3 caracteres e devolve o texto aparado', () => {
    expect(validarMotivoDevolucao('')).toMatchObject({ valido: false });
    expect(validarMotivoDevolucao('  ab  ')).toMatchObject({ valido: false });
    expect(validarMotivoDevolucao(undefined)).toMatchObject({ valido: false });
    expect(validarMotivoDevolucao('  Cliente desistiu  ')).toEqual({ valido: true, motivo: 'Cliente desistiu' });
  });

  it('recusa motivo acima de 200 caracteres', () => {
    expect(validarMotivoDevolucao('x'.repeat(200)).valido).toBe(true);
    expect(validarMotivoDevolucao('x'.repeat(201))).toMatchObject({ valido: false });
  });
});

describe('rotuloOrigemPix', () => {
  it('descreve de onde veio o Pix a devolver', () => {
    expect(rotuloOrigemPix({ situacao: 'sem_venda', venda_id: null })).toBe('Sem venda concluída');
    expect(rotuloOrigemPix({ situacao: 'venda_cancelada', venda_id: 42 })).toBe('Venda #42 cancelada');
  });
});

describe('pixRecente', () => {
  const agora = new Date('2026-10-29T15:00:00Z').getTime();

  it('Pix sem venda criado há menos de 30 minutos pede cuidado', () => {
    const recente = new Date(agora - (MINUTOS_PIX_RECENTE - 1) * 60 * 1000).toISOString();
    const antigo = new Date(agora - (MINUTOS_PIX_RECENTE + 1) * 60 * 1000).toISOString();

    expect(pixRecente({ situacao: 'sem_venda', criado_em: recente }, agora)).toBe(true);
    expect(pixRecente({ situacao: 'sem_venda', criado_em: antigo }, agora)).toBe(false);
  });

  it('venda cancelada nunca é "recente"; data inválida não quebra', () => {
    expect(pixRecente({ situacao: 'venda_cancelada', criado_em: new Date(agora).toISOString() }, agora)).toBe(false);
    expect(pixRecente({ situacao: 'sem_venda', criado_em: 'lixo' }, agora)).toBe(false);
    expect(pixRecente(null, agora)).toBe(false);
  });
});

describe('rotuloStatusDevolucao / mensagemDevolucao', () => {
  it('traduz os status do backend', () => {
    expect(rotuloStatusDevolucao('concluida')).toBe('Devolvido');
    expect(rotuloStatusDevolucao('solicitada')).toBe('Em processamento');
    expect(rotuloStatusDevolucao('falhou')).toBe('Falhou');
    expect(rotuloStatusDevolucao('outro')).toBe('outro');
  });

  it('não diz "devolvido" quando o provedor ainda está processando', () => {
    expect(mensagemDevolucao('concluida')).toBe('Pix devolvido ao pagador.');
    expect(mensagemDevolucao('solicitada')).toContain('Devolução solicitada');
    expect(mensagemDevolucao('solicitada')).not.toContain('devolvido ao pagador');
  });
});
