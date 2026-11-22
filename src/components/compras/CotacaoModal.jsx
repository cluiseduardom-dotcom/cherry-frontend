import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import SeletorProduto from '../SeletorProduto';
import { criarCotacao } from '../../services/cotacoes';
import { formVazio, itemVazio, montarCorpoCotacao, validarCotacaoForm } from '../../utils/cotacao';
import '../../pages/Compras.css';

// Nova cotação: o que preciso (produtos e quantidades) e de quais fornecedores quero preço. Nasce aberta.
export default function CotacaoModal({ fornecedores, produtos, onClose, onCriada }) {
  const [form, setForm] = useState(formVazio);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const alterarItem = (indice, nome, valor) => setForm(prev => ({ ...prev, itens: prev.itens.map((it, i) => (i === indice ? { ...it, [nome]: valor } : it)) }));
  const alternarFornecedor = id => setForm(prev => ({
    ...prev,
    fornecedor_ids: prev.fornecedor_ids.includes(id) ? prev.fornecedor_ids.filter(f => f !== id) : [...prev.fornecedor_ids, id],
  }));

  async function salvar(e) {
    e.preventDefault();
    const problema = validarCotacaoForm(form);
    if (problema) { setErro(problema); return; }
    setSalvando(true);
    setErro('');
    try {
      onCriada(await criarCotacao(montarCorpoCotacao(form)));
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  }

  return (
    <div className="compra-modal-backdrop" onMouseDown={e => e.target === e.currentTarget && !salvando && onClose()}>
      <form className="compra-modal" onSubmit={salvar}>
        <div className="compra-modal-header">
          <h2>Nova cotação</h2>
          <button type="button" className="produto-action-btn" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
        </div>
        <p className="text-sm text-secondary" style={{ marginTop: -8, marginBottom: 14 }}>
          Diga o que você precisa e de quais fornecedores quer preço. Depois registre a proposta de cada um e compare.
        </p>

        {erro && <div className="compra-alert error">{erro}</div>}

        <div className="compra-items">
          <div className="compra-items-header">
            <h3 className="compra-form-section-title" style={{ margin: 0 }}>O que você precisa</h3>
            <button type="button" className="btn btn-secondary" onClick={() => setForm(prev => ({ ...prev, itens: [...prev.itens, itemVazio()] }))}><Plus size={14} /> Item</button>
          </div>
          {form.itens.map((item, indice) => (
            <div className="compra-item-row compra-item-row--receber" key={indice}>
              <div className="compra-field compra-item-product">
                <label>Produto *</label>
                <div className="compra-item-product-row">
                  <SeletorProduto produtos={produtos} value={String(item.produto_id ?? '')} onChange={id => alterarItem(indice, 'produto_id', id)} mostrarEstoque={false} />
                </div>
              </div>
              <div className="compra-field">
                <label>Quantidade *</label>
                <input type="number" min="1" step="1" className="input-field" value={item.quantidade} onChange={e => alterarItem(indice, 'quantidade', e.target.value)} />
              </div>
              <button type="button" className="produto-action-btn produto-action-btn--danger" aria-label="Remover item" disabled={form.itens.length === 1} onClick={() => setForm(prev => ({ ...prev, itens: prev.itens.filter((_, i) => i !== indice) }))}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>

        <div className="compra-form-section">
          <h3 className="compra-form-section-title">Fornecedores para cotar *</h3>
          {fornecedores.length === 0 ? (
            <p className="text-sm text-secondary">Nenhum fornecedor cadastrado. Cadastre em Fornecedores primeiro.</p>
          ) : (
            <div className="cotacao-fornecedores-lista">
              {fornecedores.map(f => (
                <label key={f.id} className="cotacao-fornecedor-opcao">
                  <input type="checkbox" checked={form.fornecedor_ids.includes(f.id)} onChange={() => alternarFornecedor(f.id)} />
                  {f.nome}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="compra-form-grid">
          <div className="compra-field">
            <label>Responder até <span className="compra-field-optional">(opcional)</span></label>
            <input type="date" className="input-field" value={form.data_limite} onChange={e => setForm(prev => ({ ...prev, data_limite: e.target.value }))} />
          </div>
          <div className="compra-field">
            <label>Observações <span className="compra-field-optional">(opcional)</span></label>
            <input className="input-field" maxLength={1000} value={form.observacoes} onChange={e => setForm(prev => ({ ...prev, observacoes: e.target.value }))} />
          </div>
        </div>

        <div className="compra-modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={salvando}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? 'Criando...' : 'Criar cotação'}</button>
        </div>
      </form>
    </div>
  );
}
