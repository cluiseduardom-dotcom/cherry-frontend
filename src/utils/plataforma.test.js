import { describe, it, expect } from 'vitest';
import {
  mesValido, mesAtualBrasilia, deslocarMes, rotuloMes, formatarPercentuais,
  hojeBrasilia, formatarData, formatarPercentual, interpretarPercentual, rotuloOrigem,
  validarTrocaPlano, validarCondicao, validarEncerrarCondicao, descreverEfeito,
} from './plataforma';

describe('mesValido', () => {
  it('aceita AAAA-MM e recusa o resto', () => {
    expect(mesValido('2026-10')).toBe(true);
    expect(mesValido('2026-13')).toBe(false);
    expect(mesValido('2026-1')).toBe(false);
    expect(mesValido('')).toBe(false);
    expect(mesValido(undefined)).toBe(false);
  });
});

describe('mesAtualBrasilia', () => {
  it('usa o fuso de Brasília na virada do mês', () => {
    // 01/11 02:00 UTC ainda é 31/10 23:00 em Brasília
    expect(mesAtualBrasilia(new Date('2026-11-01T02:00:00Z'))).toBe('2026-10');
    expect(mesAtualBrasilia(new Date('2026-11-01T03:00:00Z'))).toBe('2026-11');
  });
});

describe('deslocarMes', () => {
  it('anda para frente e para trás atravessando o ano', () => {
    expect(deslocarMes('2026-10', -1)).toBe('2026-09');
    expect(deslocarMes('2026-01', -1)).toBe('2025-12');
    expect(deslocarMes('2026-12', 1)).toBe('2027-01');
    expect(deslocarMes('2026-10', 0)).toBe('2026-10');
  });
  it('devolve a entrada se ela for inválida', () => {
    expect(deslocarMes('xx', 1)).toBe('xx');
  });
});

describe('rotuloMes', () => {
  it('escreve o mês por extenso', () => {
    expect(rotuloMes('2026-03')).toBe('Março de 2026');
    expect(rotuloMes('2026-10')).toBe('Outubro de 2026');
    expect(rotuloMes('lixo')).toBe('');
  });
});

describe('formatarPercentuais', () => {
  it('formata um, vários e nenhum', () => {
    expect(formatarPercentuais([0.15])).toBe('0,15%');
    expect(formatarPercentuais([0.1, 0.15])).toBe('0,10% e 0,15%');
    expect(formatarPercentuais([0.05, 0.1, 0.15])).toBe('0,05%, 0,10% e 0,15%');
    expect(formatarPercentuais([])).toBe('—');
    expect(formatarPercentuais(undefined)).toBe('—');
  });
});

describe('hojeBrasilia', () => {
  it('usa o dia de Brasília, não o do aparelho (02:30Z ainda é o dia anterior em Brasília)', () => {
    expect(hojeBrasilia(new Date('2026-10-31T02:30:00Z'))).toBe('2026-10-30');
    expect(hojeBrasilia(new Date('2026-10-31T03:00:00Z'))).toBe('2026-10-31');
  });
});

describe('formatarData', () => {
  it('converte AAAA-MM-DD para DD/MM/AAAA e usa traço para ausente ou inválido', () => {
    expect(formatarData('2026-10-30')).toBe('30/10/2026');
    expect(formatarData('2026-10-30T00:00:00.000Z')).toBe('30/10/2026');
    expect(formatarData(null)).toBe('—');
    expect(formatarData('30/10/2026')).toBe('—');
  });
});

describe('formatarPercentual', () => {
  it('mostra 2 a 4 casas em pt-BR e traço para ausente', () => {
    expect(formatarPercentual(0.5)).toBe('0,50%');
    expect(formatarPercentual('0.3000')).toBe('0,30%');
    expect(formatarPercentual(0.1234)).toBe('0,1234%');
    expect(formatarPercentual(0)).toBe('0,00%');
    expect(formatarPercentual(null)).toBe('—');
    expect(formatarPercentual('abc')).toBe('—');
  });
});

describe('interpretarPercentual', () => {
  it('aceita vírgula ou ponto, até 4 casas, de 0 a 100', () => {
    expect(interpretarPercentual('0,5')).toBe(0.5);
    expect(interpretarPercentual(' 0.25 ')).toBe(0.25);
    expect(interpretarPercentual('0')).toBe(0);
    expect(interpretarPercentual('100')).toBe(100);
    expect(interpretarPercentual('12,3456')).toBe(12.3456);
  });

  it('recusa vazio, texto, negativo, acima de 100 e mais de 4 casas', () => {
    for (const texto of ['', '  ', 'abc', '-1', '100,01', '0,12345', '1,2,3', '1e2', null, undefined]) {
      expect(interpretarPercentual(texto)).toBeNaN();
    }
  });
});

describe('rotuloOrigem', () => {
  it('traduz as origens da regra e usa traço para desconhecida', () => {
    expect(rotuloOrigem('excecao_empresa')).toBe('Exceção da empresa');
    expect(rotuloOrigem('plano_padrao')).toBe('Plano');
    expect(rotuloOrigem('padrao_sem_plano')).toBe('Padrão (sem plano)');
    expect(rotuloOrigem('x')).toBe('—');
  });
});

describe('validarTrocaPlano', () => {
  const hoje = '2026-10-30';

  it('plano e justificativa válidos: corpo só com os campos do endpoint; sem data não envia vigencia_inicio', () => {
    const r = validarTrocaPlano({ plano: 'pro', vigencia_inicio: '', justificativa: '  Upgrade  ' }, hoje);
    expect(r.valido).toBe(true);
    expect(r.corpo).toEqual({ plano: 'pro', justificativa: 'Upgrade' });
  });

  it('com data futura envia vigencia_inicio; data passada é recusada', () => {
    expect(validarTrocaPlano({ plano: 'pro', vigencia_inicio: '2026-11-01', justificativa: 'ok!' }, hoje).corpo.vigencia_inicio).toBe('2026-11-01');
    const passado = validarTrocaPlano({ plano: 'pro', vigencia_inicio: '2026-10-29', justificativa: 'ok!' }, hoje);
    expect(passado.valido).toBe(false);
    expect(passado.erros.vigencia_inicio).toMatch(/anterior a hoje/);
  });

  it('exige plano e justificativa', () => {
    const r = validarTrocaPlano({ plano: '', vigencia_inicio: '', justificativa: ' ' }, hoje);
    expect(r.valido).toBe(false);
    expect(Object.keys(r.erros).sort()).toEqual(['justificativa', 'plano']);
  });
});

describe('validarCondicao', () => {
  const hoje = '2026-10-30';

  it('percentual em texto vira número; 0 (isenção) é válido', () => {
    const r = validarCondicao({ percentual: '0,5', vigencia_inicio: '', vigencia_fim: '', justificativa: 'Fundadora' }, hoje);
    expect(r.valido).toBe(true);
    expect(r.corpo).toEqual({ percentual: 0.5, justificativa: 'Fundadora' });
    expect(validarCondicao({ percentual: '0', justificativa: 'Isenção' }, hoje).corpo.percentual).toBe(0);
  });

  it('recusa percentual inválido e fim anterior ao início', () => {
    expect(validarCondicao({ percentual: '', justificativa: 'abc' }, hoje).erros.percentual).toBeDefined();
    expect(validarCondicao({ percentual: '101', justificativa: 'abc' }, hoje).valido).toBe(false);
    const r = validarCondicao({ percentual: '1', vigencia_inicio: '2026-11-10', vigencia_fim: '2026-11-05', justificativa: 'abc' }, hoje);
    expect(r.erros.vigencia_fim).toMatch(/anterior ao início/);
  });

  it('fim sem início é comparado com hoje', () => {
    const r = validarCondicao({ percentual: '1', vigencia_fim: '2026-10-29', justificativa: 'abc' }, hoje);
    expect(r.valido).toBe(false);
  });
});

describe('validarEncerrarCondicao', () => {
  it('justificativa obrigatória; data opcional e nunca no passado', () => {
    expect(validarEncerrarCondicao({ a_partir_de: '', justificativa: 'Fim do piloto' }, '2026-10-30').corpo).toEqual({ justificativa: 'Fim do piloto' });
    expect(validarEncerrarCondicao({ a_partir_de: '2026-10-01', justificativa: 'Fim' }, '2026-10-30').valido).toBe(false);
    expect(validarEncerrarCondicao({ a_partir_de: '', justificativa: '' }, '2026-10-30').erros.justificativa).toBeDefined();
  });
});

describe('descreverEfeito', () => {
  const base = { empresa: 'Cherry', hoje: '2026-10-30' };

  it('descreve o efeito de cada ação e sempre avisa que vendas já feitas não mudam', () => {
    const plano = descreverEfeito({ ...base, acao: 'plano', planoNome: 'Plano Pro' });
    expect(plano).toContain('Cherry passa para o plano Plano Pro a partir de hoje.');
    expect(plano).toContain('Vendas já feitas não são recalculadas.');

    const cond = descreverEfeito({ ...base, acao: 'condicao', percentual: 0.5, inicio: '2026-11-01' });
    expect(cond).toContain('0,50% sobre o Pix a partir de 01/11/2026');

    const enc = descreverEfeito({ ...base, acao: 'encerrar', inicio: '2026-10-30' });
    expect(enc).toContain('A exceção de Cherry termina a partir de hoje');
  });
});
