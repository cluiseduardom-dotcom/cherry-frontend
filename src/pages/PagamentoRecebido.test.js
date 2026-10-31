import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PagamentoRecebidoView } from './PagamentoRecebido.jsx';
import { textoDoResultado } from '../utils/pagamentoRecebido.js';

const render = (resultado, onVoltar) => renderToStaticMarkup(createElement(PagamentoRecebidoView, { resultado, onVoltar }));

describe('PagamentoRecebido', () => {
  it('sucesso: agradece e diz que a loja confirma, sem afirmar que está confirmado', () => {
    const html = render('sucesso');
    expect(html).toContain('Pagamento enviado');
    expect(html).toContain('A loja confirma em instantes');
    expect(html).not.toMatch(/pagamento confirmado|aprovado/i);
  });

  it('pendente e falha têm textos próprios', () => {
    expect(render('pendente')).toContain('em análise');
    expect(render('falha')).toContain('não foi concluído');
    expect(render('falha')).not.toContain('nada foi cobrado');
  });

  it('resultado ausente ou inventado cai no texto neutro, sem repetir o valor da URL', () => {
    for (const r of [null, '', 'qualquer', '<script>alert(1)</script>']) {
      const html = render(r);
      expect(html).toContain('Você pode fechar esta página');
      expect(html).not.toContain('script');
    }
    expect(textoDoResultado(undefined).titulo).toBe('Você pode fechar esta página');
  });

  it('mostra o botão "Voltar ao pagamento" só quando há como voltar e o pagamento não foi enviado', () => {
    const voltar = () => {};
    expect(render('falha', voltar)).toContain('<button');
    expect(render('pendente', voltar)).toContain('<button');
    expect(render(null, voltar)).toContain('<button');
    expect(render('sucesso', voltar)).not.toContain('<button');
    expect(render('falha')).not.toContain('<button');
  });
});
