import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import DevolverPixModal from './DevolverPixModal.jsx';

const noop = () => {};
const render = (props) => renderToStaticMarkup(createElement(DevolverPixModal, { open: true, onClose: noop, onSuccess: noop, ...props }));

describe('DevolverPixModal', () => {
  it('não renderiza fechado nem sem item', () => {
    expect(render({ open: false, item: { codigo: 'a', valor: '90.00', situacao: 'sem_venda', criado_em: '2020-01-01T00:00:00Z' } })).toBe('');
    expect(render({ item: null })).toBe('');
  });

  it('mostra valor, origem, aviso de ação irreversível e exige o motivo', () => {
    const html = render({ item: { codigo: 'a', valor: '90.00', venda_id: 7, situacao: 'venda_cancelada', criado_em: '2020-01-01T00:00:00Z' } });

    expect(html).toContain('Devolver Pix ao pagador');
    expect(html).toContain('Venda #7 cancelada');
    expect(html).toContain('não pode ser desfeita');
    expect(html).toContain('Motivo da devolução');
    expect(html).toContain('Devolver R$');
    expect(html).not.toContain('menos de 30 minutos');
  });

  it('Pix sem venda recente avisa para conferir outro caixa', () => {
    const html = render({ item: { codigo: 'a', valor: '90.00', venda_id: null, situacao: 'sem_venda', criado_em: new Date().toISOString() } });

    expect(html).toContain('menos de 30 minutos');
  });
});
