import { useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import SeletorProduto from '../SeletorProduto';
import { criarPedidoCompra, atualizarPedidoCompra } from '../../services/pedidosCompra';
import { formVazio, itemVazio, formDoPedido, montarCorpoPedido, validarPedidoForm, totalDoItem, totalDoPedido } from '../../utils/pedidoCompra';
import { formatarMoeda as money } from '../../utils/mascaras';
import '../../pages/Compras.css';

// Criar (pedido ausente) ou editar o rascunho (pedido informado). Itens e cabeçalho vão juntos; o backend recalcula o total.
export default function PedidoCompraModal({ pedido = null, fornecedores, produtos, onClose, onSalvo }) {
  const [form, setForm] = useState(() => (pedido ? formDoPedido(pedido) : formVazio()));
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const total = useMemo(() => totalDoPedido(form), [form]);

  const campo = (nome) => (e) => setForm((prev) => ({ ...prev, [nome]: e.target.value }));
  const alterarItem = (indice, nome, valor) => setForm((prev) => ({
    ...prev,
    itens: prev.itens.map((item, i) => (i === indice ? { ...item, [nome]: valor } : item)),
  }));

  async function salvar(e) {
    e.preventDefault();
    const problema = validarPedidoForm(form);
    if (problema) { setErro(problema); return; }
    setSalvando(true);
    setErro('');
    try {
      const corpo = montarCorpoPedido(form);
      const salvo = pedido ? await atualizarPedidoCompra(pedido.id, corpo) : await criarPedidoCompra(corpo);
      onSalvo(salvo);
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  }

  return (
    <div className="compra-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !salvando && onClose()}>
      <form className="compra-modal" onSubmit={salvar}>
        <div className="compra-modal-header">
          <h2>{pedido ? `Editar pedido ${pedido.numero}` : 'Novo pedido de compra'}</h2>
          <button type="button" className="produto-action-btn" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
        </div>

        {erro && <div className="compra-alert error">{erro}</div>}

        <div className="compra-form-section">
          <h3 className="compra-form-section-title">Fornecedor e entrega</h3>
          <div className="compra-form-grid">
            <div className="compra-field">
              <label>Fornecedor *</label>
              <select className="input-field" value={form.fornecedor_id} onChange={campo('fornecedor_id')}>
                <option value="">Selecione...</option>
                {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
            <div className="compra-field">
              <label>Entrega prevista <span className="compra-field-optional">(opcional)</span></label>
              <input type="date" className="input-field" value={form.data_prevista_entrega} onChange={campo('data_prevista_entrega')} />
            </div>
            <div className="compra-field">
              <label>Prazo para pagar (dias) <span className="compra-field-optional">(opcional)</span></label>
              <input type="number" min="0" max="365" step="1" className="input-field" placeholder="Ex.: 30" value={form.prazo_pagamento_dias} onChange={campo('prazo_pagamento_dias')} />
            </div>
            <div className="compra-field">
              <label>Forma de pagamento <span className="compra-field-optional">(opcional)</span></label>
              <input className="input-field" maxLength={30} placeholder="Ex.: boleto, Pix" value={form.forma_pagamento} onChange={campo('forma_pagamento')} />
            </div>
          </div>
        </div>

        <div className="compra-items">
          <div className="compra-items-header">
            <h3 className="compra-form-section-title" style={{ margin: 0 }}>Itens</h3>
            <button type="button" className="btn btn-secondary" onClick={() => setForm((prev) => ({ ...prev, itens: [...prev.itens, itemVazio()] }))}><Plus size={14} /> Item</button>
          </div>
          {form.itens.map((item, indice) => (
            <div className="compra-item-row compra-item-row--pedido" key={indice}>
              <div className="compra-field compra-item-product">
                <label>Produto *</label>
                <div className="compra-item-product-row">
                  <SeletorProduto produtos={produtos} value={String(item.produto_id ?? '')} onChange={(id) => alterarItem(indice, 'produto_id', id)} mostrarEstoque={false} />
                </div>
              </div>
              <div className="compra-field">
                <label>Qtd. *</label>
                <input type="number" min="1" step="1" className="input-field" value={item.quantidade} onChange={(e) => alterarItem(indice, 'quantidade', e.target.value)} />
              </div>
              <div className="compra-field">
                <label>Preço unit. *</label>
                <input type="number" min="0" step="0.01" className="input-field" value={item.preco_unitario} onChange={(e) => alterarItem(indice, 'preco_unitario', e.target.value)} />
              </div>
              <div className="compra-field">
                <label>Desconto</label>
                <input type="number" min="0" step="0.01" className="input-field" value={item.desconto} onChange={(e) => alterarItem(indice, 'desconto', e.target.value)} />
              </div>
              <div className="compra-field">
                <label>Total</label>
                <div className="input-field">{money(totalDoItem(item))}</div>
              </div>
              <button type="button" className="produto-action-btn produto-action-btn--danger" aria-label="Remover item" disabled={form.itens.length === 1} onClick={() => setForm((prev) => ({ ...prev, itens: prev.itens.filter((_, i) => i !== indice) }))}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>

        <div className="compra-form-section">
          <h3 className="compra-form-section-title">Valores do pedido</h3>
          <div className="compra-form-grid">
            <div className="compra-field">
              <label>Frete</label>
              <input type="number" min="0" step="0.01" className="input-field" value={form.frete_valor} onChange={campo('frete_valor')} />
            </div>
            <div className="compra-field">
              <label>Desconto no pedido</label>
              <input type="number" min="0" step="0.01" className="input-field" value={form.desconto} onChange={campo('desconto')} />
            </div>
            <div className="compra-field">
              <label>Outras despesas</label>
              <input type="number" min="0" step="0.01" className="input-field" value={form.outras_despesas} onChange={campo('outras_despesas')} />
            </div>
            <div className="compra-field full">
              <label>Observações <span className="compra-field-optional">(opcional)</span></label>
              <input className="input-field" maxLength={1000} value={form.observacoes} onChange={campo('observacoes')} />
            </div>
          </div>
          <div className="compra-total">Total do pedido: {money(total)}</div>
        </div>

        <div className="compra-modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={salvando}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? 'Salvando...' : pedido ? 'Salvar alterações' : 'Criar pedido (rascunho)'}</button>
        </div>
      </form>
    </div>
  );
}
