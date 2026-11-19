import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AvisoCobranca from './AvisoCobranca';

const HOJE = '2026-11-19';
const render = (cobranca) => renderToStaticMarkup(createElement(AvisoCobranca, { cobranca, hoje: HOJE }));

describe('AvisoCobranca', () => {
  it('sem aviso não renderiza nada (sem regra, isenta, longe do prazo)', () => {
    expect(render(null)).toBe('');
    expect(render({ situacao: 'isenta', ate: null })).toBe('');
    expect(render({ situacao: 'em_teste', ate: '2026-12-18' })).toBe('');
  });

  it('somente leitura: faixa de erro anunciada como alerta', () => {
    const html = render({ situacao: 'somente_leitura', ate: null });
    expect(html).toContain('role="alert"');
    expect(html).toContain('aviso-cobranca--erro');
    expect(html).toContain('Período de uso encerrado');
    expect(html).toContain('somente para consulta');
  });

  it('fim do teste chegando: faixa de aviso anunciada como status, com a data', () => {
    const html = render({ situacao: 'em_teste', ate: '2026-11-21' });
    expect(html).toContain('role="status"');
    expect(html).toContain('aviso-cobranca--aviso');
    expect(html).toContain('Seu teste grátis termina em 2 dias');
    expect(html).toContain('21/11/2026');
  });
});
