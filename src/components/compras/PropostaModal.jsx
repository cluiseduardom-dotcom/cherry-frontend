import { useState } from 'react';
import { X } from 'lucide-react';
import { registrarProposta } from '../../services/cotacoes';
import { linhasDaProposta, montarItensProposta, validarProposta } from '../../utils/cotacao';
import '../../pages/Compras.css';

// Proposta de UM fornecedor: preço, desconto e quantidade de cada item que ele cotou; prazo e condição valem para a proposta toda.
// Item sem preço = o fornecedor não cotou. Registrar de novo troca a proposta anterior.
export default function PropostaModal({ cotacao, fornecedor, onClose, onSalva }) {
  const [linhas, setLinhas] = useState(() => linhasDaProposta(cotacao, fornecedor.fornecedor_id));
  const jaTinha = (cotacao.ofertas || []).find(o => o.fornecedor_id === fornecedor.fornecedor_id);
  const [prazo, setPrazo] = useState(jaTinha?.prazo_entrega_dias != null ? String(jaTinha.prazo_entrega_dias) : '');
  const [condicao, setCondicao] = useState(jaTinha?.condicao_pagamento || '');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const alterar = (indice, campo, valor) => setLinhas(prev => prev.map((l, i) => (i === indice ? { ...l, [campo]: valor } : l)));

  async function salvar(e) {
    e.preventDefault();
    const comum = { prazo_entrega_dias: prazo, condicao_pagamento: condicao };
    const problema = validarProposta(linhas, comum);
    if (problema) { setErro(problema); return; }
    setSalvando(true);
    setErro('');
    try {
      onSalva(await registrarProposta(cotacao.id, fornecedor.fornecedor_id, montarItensProposta(linhas, comum)));
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  }

  return (
    <div className="compra-modal-backdrop" onMouseDown={e => e.target === e.currentTarget && !salvando && onClose()}>
      <form className="compra-modal" onSubmit={salvar}>
        <div className="compra-modal-header">
          <h2>Proposta de {fornecedor.fornecedor_nome}</h2>
          <button type="button" className="produto-action-btn" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
        </div>
        <p className="text-sm text-secondary" style={{ marginTop: -8, marginBottom: 14 }}>
          Preencha o preço de cada item que ele cotou. Deixe em branco o que ele não tem.
        </p>

        {erro && <div className="compra-alert error">{erro}</div>}

        <div className="compra-items">
          {linhas.map((l, indice) => (
            <div className="compra-item-row cotacao-proposta-linha" key={l.cotacao_item_id}>
              <div className="compra-field compra-item-product">
                <label>Item (pedido: {l.solicitada})</label>
                <div className="input-field">{l.rotulo}</div>
              </div>
              <div className="compra-field">
                <label>Preço unit.</label>
                <input type="number" min="0" step="0.01" className="input-field" value={l.preco_unitario} onChange={e => alterar(indice, 'preco_unitario', e.target.value)} />
              </div>
              <div className="compra-field">
                <label>Desconto</label>
                <input type="number" min="0" step="0.01" className="input-field" value={l.desconto} onChange={e => alterar(indice, 'desconto', e.target.value)} />
              </div>
              <div className="compra-field">
                <label>Quantidade</label>
                <input type="number" min="1" step="1" className="input-field" value={l.quantidade_ofertada} onChange={e => alterar(indice, 'quantidade_ofertada', e.target.value)} />
              </div>
            </div>
          ))}
        </div>

        <div className="compra-form-grid">
          <div className="compra-field">
            <label>Prazo de entrega (dias) <span className="compra-field-optional">(opcional)</span></label>
            <input type="number" min="0" max="365" step="1" className="input-field" value={prazo} onChange={e => setPrazo(e.target.value)} />
          </div>
          <div className="compra-field">
            <label>Condição de pagamento <span className="compra-field-optional">(opcional)</span></label>
            <input className="input-field" maxLength={255} placeholder="Ex.: 30 dias, boleto" value={condicao} onChange={e => setCondicao(e.target.value)} />
          </div>
        </div>

        <div className="compra-modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={salvando}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar proposta'}</button>
        </div>
      </form>
    </div>
  );
}
