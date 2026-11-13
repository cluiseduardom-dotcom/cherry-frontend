import { describe, expect, it } from 'vitest';
import { decidirRenovacao, lerTempos, MARGEM_RENOVACAO_S, JANELA_ATIVIDADE_S, TETO_SESSAO_S, ESPERA_APOS_FALHA_S } from './sessaoRenovavel';

const b64 = (o) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const token = (payload) => `${b64({ alg: 'HS256' })}.${b64(payload)}.assinatura`;
const AGORA = 1_800_000_000;

describe('lerTempos', () => {
  it('lê exp e sa do payload', () => {
    expect(lerTempos(token({ exp: 123, sa: 100 }))).toEqual({ exp: 123, sa: 100 });
  });

  it('token antigo sem sa usa a emissão (iat) como início; sem nenhum dos dois, sa null; lixo ou sem exp: null', () => {
    expect(lerTempos(token({ exp: 123, iat: 50 }))).toEqual({ exp: 123, sa: 50 });
    expect(lerTempos(token({ exp: 123 }))).toEqual({ exp: 123, sa: null });
    expect(lerTempos('nao-e-token')).toBeNull();
    expect(lerTempos(token({ id: 1 }))).toBeNull();
    expect(lerTempos(null)).toBeNull();
  });
});

describe('decidirRenovacao', () => {
  const base = { agora: AGORA, ultimaAtividade: AGORA - 60 };
  const tempos = (restante, sa = AGORA - 3600) => ({ exp: AGORA + restante, sa });

  it('renova quando vai vencer em breve e a pessoa está usando', () => {
    expect(decidirRenovacao({ ...base, tempos: tempos(10 * 60) })).toBe(true);
  });

  it('não renova com folga (mais de 20 min) nem com token já vencido', () => {
    expect(decidirRenovacao({ ...base, tempos: tempos(MARGEM_RENOVACAO_S + 60) })).toBe(false);
    expect(decidirRenovacao({ ...base, tempos: tempos(-5) })).toBe(false);
  });

  it('sem uso recente a sessão não é renovada (vence sozinha)', () => {
    expect(decidirRenovacao({ ...base, ultimaAtividade: AGORA - JANELA_ATIVIDADE_S - 1, tempos: tempos(10 * 60) })).toBe(false);
  });

  it('depois de uma falha espera antes de tentar de novo', () => {
    expect(decidirRenovacao({ ...base, ultimaFalha: AGORA - 60, tempos: tempos(10 * 60) })).toBe(false);
    expect(decidirRenovacao({ ...base, ultimaFalha: AGORA - ESPERA_APOS_FALHA_S - 1, tempos: tempos(10 * 60) })).toBe(true);
  });

  it('token já no teto de 8 h da sessão não é renovado (não ganharia tempo)', () => {
    const sa = AGORA - TETO_SESSAO_S + 10 * 60; // faltam 10 min para o teto
    expect(decidirRenovacao({ ...base, tempos: { exp: sa + TETO_SESSAO_S, sa } })).toBe(false);
  });

  it('token antigo de 8 h (sem sa, início = iat) perto do fim: não renova (não ganharia tempo)', () => {
    const iat = AGORA - TETO_SESSAO_S + 10 * 60;
    expect(decidirRenovacao({ ...base, tempos: lerTempos(token({ iat, exp: iat + TETO_SESSAO_S })) })).toBe(false);
  });

  it('sem informação do token: não renova', () => {
    expect(decidirRenovacao({ ...base, tempos: null })).toBe(false);
  });
});
