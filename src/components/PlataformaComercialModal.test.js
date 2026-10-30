import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PlataformaComercialModal from './PlataformaComercialModal.jsx';

const noop = () => {};
const empresa = { empresa_id: 1, empresa_nome: 'Cherry Semijoias' };
const planos = [
  { codigo: 'cortesia', nome: 'Plano cortesia', tem_mensalidade: false, ativo: true, percentual: 0.5 },
  { codigo: 'pro', nome: 'Plano Pro', tem_mensalidade: true, ativo: true, percentual: 0.3 },
  { codigo: 'sem_politica', nome: 'Sem política', tem_mensalidade: true, ativo: true, percentual: null },
  { codigo: 'antigo', nome: 'Antigo', tem_mensalidade: true, ativo: false, percentual: 0.4 },
];

const render = modo => renderToStaticMarkup(
  createElement(PlataformaComercialModal, { modo, empresa, planos, onClose: noop, onSaved: noop })
);

describe('PlataformaComercialModal', () => {
  it('alterar plano: lista só planos ativos com política vigente, mostrando o percentual sobre o Pix', () => {
    const html = render('plano');
    expect(html).toContain('Alterar plano · Cherry Semijoias');
    expect(html).toContain('Plano cortesia — 0,50% sobre o Pix (sem mensalidade)');
    expect(html).toContain('Plano Pro — 0,30% sobre o Pix');
    expect(html).not.toContain('Sem política');
    expect(html).not.toContain('Antigo');
    expect(html).toContain('Justificativa *');
  });

  it('definir exceção: pede percentual, vigência e justificativa', () => {
    const html = render('condicao');
    expect(html).toContain('Definir exceção de taxa');
    expect(html).toContain('Percentual sobre o Pix (%) *');
    expect(html).toContain('Fim da vigência (opcional)');
    expect(html).not.toContain('Plano *');
  });

  it('encerrar exceção: pede a data de encerramento e a justificativa, sem percentual', () => {
    const html = render('encerrar');
    expect(html).toContain('Encerrar a partir de');
    expect(html).toContain('Justificativa *');
    expect(html).not.toContain('Percentual sobre o Pix');
  });

  it('o diálogo de confirmação começa fechado (nada é enviado sem confirmar)', () => {
    expect(render('plano')).not.toContain('Confirmar alteração');
  });
});
