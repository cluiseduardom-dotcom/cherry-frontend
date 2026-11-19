import { describe, expect, it } from 'vitest';
import { avisoCobranca, diasAte, formatarDataCurta, DIAS_AVISO_TESTE, DIAS_AVISO_PAGAMENTO } from './cobranca';

const HOJE = '2026-11-19';
const somar = (dias) => {
  const d = new Date(`${HOJE}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

describe('datas', () => {
  it('dias até o último dia coberto; datas inválidas = null', () => {
    expect(diasAte('2026-11-19', HOJE)).toBe(0);
    expect(diasAte('2026-11-26', HOJE)).toBe(7);
    expect(diasAte('2026-11-18', HOJE)).toBe(-1);
    expect(diasAte(null, HOJE)).toBeNull();
    expect(diasAte('abc', HOJE)).toBeNull();
  });

  it('formata dd/mm/aaaa sem depender do fuso', () => {
    expect(formatarDataCurta('2026-12-03')).toBe('03/12/2026');
    expect(formatarDataCurta('x')).toBe('');
  });
});

describe('avisoCobranca', () => {
  it('sem regra, isenta e situação desconhecida: nada a mostrar', () => {
    expect(avisoCobranca(null, HOJE)).toBeNull();
    expect(avisoCobranca(undefined, HOJE)).toBeNull();
    expect(avisoCobranca({ situacao: 'isenta', ate: null }, HOJE)).toBeNull();
    expect(avisoCobranca({ situacao: 'qualquer', ate: somar(1) }, HOJE)).toBeNull();
  });

  it('somente leitura: erro claro, explica o que acontece e o que fazer', () => {
    const a = avisoCobranca({ situacao: 'somente_leitura', ate: null }, HOJE);
    expect(a).toMatchObject({ tom: 'erro', titulo: 'Período de uso encerrado' });
    expect(a.texto).toMatch(/somente para consulta/);
    expect(a.texto).toMatch(/Fale com a GiroNex/);
  });

  it('teste grátis só avisa na reta final e conta os dias', () => {
    expect(avisoCobranca({ situacao: 'em_teste', ate: somar(DIAS_AVISO_TESTE + 1) }, HOJE)).toBeNull();
    expect(avisoCobranca({ situacao: 'em_teste', ate: somar(DIAS_AVISO_TESTE) }, HOJE)).toMatchObject({ tom: 'aviso', titulo: 'Seu teste grátis termina em 7 dias' });
    expect(avisoCobranca({ situacao: 'em_teste', ate: somar(1) }, HOJE).titulo).toBe('Seu teste grátis termina amanhã');
    const hoje = avisoCobranca({ situacao: 'em_teste', ate: HOJE }, HOJE);
    expect(hoje.titulo).toBe('Seu teste grátis termina hoje');
    expect(hoje.texto).toMatch(/cobrança do seu plano é ativada/);
    expect(hoje.texto).toMatch(/19\/11\/2026/);
  });

  it('plano pago avisa perto de vencer e promete renovação com a GiroNex', () => {
    expect(avisoCobranca({ situacao: 'ativa', ate: somar(DIAS_AVISO_PAGAMENTO + 1) }, HOJE)).toBeNull();
    const a = avisoCobranca({ situacao: 'ativa', ate: somar(DIAS_AVISO_PAGAMENTO) }, HOJE);
    expect(a).toMatchObject({ tom: 'aviso', titulo: 'Seu plano vence em 5 dias' });
    expect(a.texto).toMatch(/renovação com a GiroNex/);
    expect(avisoCobranca({ situacao: 'ativa', ate: HOJE }, HOJE).titulo).toBe('Seu plano vence hoje');
  });

  it('data vencida ou ausente em teste/ativa não mostra nada (o backend decide a situação)', () => {
    expect(avisoCobranca({ situacao: 'em_teste', ate: somar(-1) }, HOJE)).toBeNull();
    expect(avisoCobranca({ situacao: 'ativa', ate: null }, HOJE)).toBeNull();
  });
});
