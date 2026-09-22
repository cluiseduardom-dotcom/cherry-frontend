import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Eye, X, Trash2, ShoppingCart } from 'lucide-react';
import { listarCompras, criarCompra, cancelarCompra, buscarCompra } from '../services/compras';
import { listarFornecedores } from '../services/fornecedores';
import { listarProdutos } from '../services/produtos';
import { useAuth } from '../context/AuthContext';
import { podeExecutarAcao, ACTIONS } from '../config/access';
import './Compras.css';

const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const today = () => new Date().toLocaleDateString('en-CA');

function emptyItem() {
  return { produto_id: '', quantidade: 1, custo_unitario: '' };
}

export default function Compras() {
  const { user } = useAuth();
  const podeGerenciar = podeExecutarAcao(user?.role, ACTIONS.GERENCIAR_ESTOQUE);

  const [compras, setCompras] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [details, setDetails] = useState(null);
  const [form, setForm] = useState({
    fornecedor_id: '',
    data_compra: today(),
    nota_fiscal: '',
    forma_pagamento: 'a_vista',
    dias_prazo: '',
    itens: [emptyItem()],
  });

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [c, f, p] = await Promise.all([
        listarCompras(),
        listarFornecedores({ pageSize: 100 }),
        listarProdutos({ canal: 'loja_fisica', pageSize: 100 }),
      ]);
      setCompras(c.items || []);
      setFornecedores(f.items || []);
      setProdutos(p.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const total = useMemo(
    () => form.itens.reduce((sum, item) => sum + Number(item.quantidade || 0) * Number(item.custo_unitario || 0), 0),
    [form.itens]
  );

  function updateItem(index, field, value) {
    setForm(prev => ({
      ...prev,
      itens: prev.itens.map((item, i) => i === index ? { ...item, [field]: value } : item),
    }));
  }

  function openCreate() {
    setForm({
      fornecedor_id: '',
      data_compra: today(),
      nota_fiscal: '',
      forma_pagamento: 'a_vista',
      dias_prazo: '',
      itens: [emptyItem()],
    });
    setFeedback('');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFeedback('');
    try {
      if (!form.fornecedor_id) throw new Error('Selecione o fornecedor.');
      if (!form.itens.length || form.itens.some(i => !i.produto_id || Number(i.quantidade) <= 0 || Number(i.custo_unitario) <= 0)) {
        throw new Error('Preencha corretamente todos os itens.');
      }
      if (form.forma_pagamento === 'prazo' && Number(form.dias_prazo) <= 0) {
        throw new Error('Informe o prazo em dias.');
      }

      const payload = {
        fornecedor_id: Number(form.fornecedor_id),
        data_compra: form.data_compra,
        nota_fiscal: form.nota_fiscal || undefined,
        forma_pagamento: form.forma_pagamento,
        dias_prazo: form.forma_pagamento === 'prazo' ? Number(form.dias_prazo) : undefined,
        itens: form.itens.map(i => ({
          produto_id: Number(i.produto_id),
          quantidade: Number(i.quantidade),
          custo_unitario: Number(i.custo_unitario),
        })),
      };

      await criarCompra(payload);
      setModalOpen(false);
      setFeedback('Compra registrada com sucesso. O estoque foi atualizado.');
      await load();
    } catch (err) {
      setFeedback(err.message);
    }
  }

  async function openDetails(id) {
    try {
      setDetails(await buscarCompra(id));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCancel(id) {
    if (!window.confirm('Cancelar esta compra? O estoque será estornado e a conta a pagar vinculada será cancelada, se houver.')) return;
    try {
      await cancelarCompra(id);
      setFeedback('Compra cancelada e estoque estornado.');
      await load();
      if (details?.id === id) setDetails(null);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Compras</h1>
          <p className="page-subtitle">Entrada de mercadorias, custos e integração financeira</p>
        </div>
        {podeGerenciar && (
          <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Nova Compra</button>
        )}
      </div>

      {feedback && <div className="compra-alert success">{feedback}</div>}
      {error && <div className="compra-alert error">{error}</div>}

      {loading ? (
        <div className="empty-state"><p className="text-sm text-secondary">Carregando compras...</p></div>
      ) : compras.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><ShoppingCart size={24} /></div>
          <div className="empty-state-title">Nenhuma compra registrada</div>
          <p className="text-sm text-secondary">Registre a primeira entrada de mercadorias.</p>
        </div>
      ) : (
        <div className="card compras-table-wrap">
          <table className="compras-table">
            <thead><tr>
              <th>#</th><th>Data</th><th>Fornecedor</th><th>NF</th><th>Pagamento</th>
              <th className="numeric">Total</th><th>Status</th><th />
            </tr></thead>
            <tbody>
              {compras.map(c => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{new Date(c.data_compra + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                  <td>{c.fornecedor_nome || '—'}</td>
                  <td>{c.nota_fiscal || '—'}</td>
                  <td>{c.forma_pagamento === 'prazo' ? 'A prazo' + (c.dias_prazo ? ' (' + c.dias_prazo + ' dias)' : '') : 'À vista'}</td>
                  <td className="numeric">{money(c.valor_total)}</td>
                  <td><span className={c.status === 'cancelado' ? 'badge badge-danger' : 'badge badge-success'}>{c.status}</span></td>
                  <td>
                    <button className="produto-action-btn" title="Ver detalhes" onClick={() => openDetails(c.id)}><Eye size={14} /></button>
                    {c.status === 'recebido' && podeGerenciar && (
                      <button className="produto-action-btn produto-action-btn--danger" title="Cancelar" onClick={() => handleCancel(c.id)}><X size={14} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="compra-modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setModalOpen(false)}>
          <form className="compra-modal" onSubmit={handleSubmit}>
            <div className="compra-modal-header">
              <h2>Nova Compra</h2>
              <button type="button" className="produto-action-btn" onClick={() => setModalOpen(false)}><X size={16} /></button>
            </div>

            {feedback && <div className="compra-alert error">{feedback}</div>}

            <div className="compra-form-grid">
              <div className="compra-field">
                <label>Fornecedor *</label>
                <select className="input-field" value={form.fornecedor_id} onChange={e => setForm({ ...form, fornecedor_id: e.target.value })}>
                  <option value="">Selecione...</option>
                  {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </div>
              <div className="compra-field">
                <label>Data da compra *</label>
                <input type="date" className="input-field" value={form.data_compra} onChange={e => setForm({ ...form, data_compra: e.target.value })} />
              </div>
              <div className="compra-field">
                <label>Nota fiscal</label>
                <input className="input-field" value={form.nota_fiscal} onChange={e => setForm({ ...form, nota_fiscal: e.target.value })} />
              </div>
              <div className="compra-field">
                <label>Forma de pagamento *</label>
                <select className="input-field" value={form.forma_pagamento} onChange={e => setForm({ ...form, forma_pagamento: e.target.value })}>
                  <option value="a_vista">À vista</option>
                  <option value="prazo">A prazo</option>
                </select>
              </div>
              {form.forma_pagamento === 'prazo' && (
                <div className="compra-field">
                  <label>Prazo (dias) *</label>
                  <input type="number" min="1" className="input-field" value={form.dias_prazo} onChange={e => setForm({ ...form, dias_prazo: e.target.value })} />
                </div>
              )}
            </div>

            <div className="compra-items">
              <div className="compra-items-header">
                <strong>Itens da compra</strong>
                <button type="button" className="btn btn-secondary" onClick={() => setForm(prev => ({ ...prev, itens: [...prev.itens, emptyItem()] }))}><Plus size={14} /> Item</button>
              </div>
              {form.itens.map((item, index) => (
                <div className="compra-item-row" key={index}>
                  <div className="compra-field compra-item-product">
                    <label>Produto *</label>
                    <select className="input-field" value={item.produto_id} onChange={e => updateItem(index, 'produto_id', e.target.value)}>
                      <option value="">Selecione...</option>
                      {produtos.map(p => <option key={p.id} value={p.id}>{p.sku ? p.sku + ' — ' : ''}{p.nome}</option>)}
                    </select>
                  </div>
                  <div className="compra-field">
                    <label>Qtd. *</label>
                    <input type="number" min="1" step="1" className="input-field" value={item.quantidade} onChange={e => updateItem(index, 'quantidade', e.target.value)} />
                  </div>
                  <div className="compra-field">
                    <label>Custo unit. *</label>
                    <input type="number" min="0.01" step="0.01" className="input-field" value={item.custo_unitario} onChange={e => updateItem(index, 'custo_unitario', e.target.value)} />
                  </div>
                  <div className="compra-field">
                    <label>Total</label>
                    <div className="input-field">{money(Number(item.quantidade || 0) * Number(item.custo_unitario || 0))}</div>
                  </div>
                  <button type="button" className="produto-action-btn produto-action-btn--danger" disabled={form.itens.length === 1} onClick={() => setForm(prev => ({ ...prev, itens: prev.itens.filter((_, i) => i !== index) }))}><Trash2 size={14} /></button>
                </div>
              ))}
              <div className="compra-total">Total: {money(total)}</div>
            </div>

            <div className="compra-modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Registrar compra</button>
            </div>
          </form>
        </div>
      )}

      {details && (
        <div className="compra-modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setDetails(null)}>
          <div className="compra-modal">
            <div className="compra-modal-header">
              <h2>Compra #{details.id}</h2>
              <button className="produto-action-btn" onClick={() => setDetails(null)}><X size={16} /></button>
            </div>
            <p><strong>Fornecedor:</strong> {details.fornecedor_nome}</p>
            <p><strong>Data:</strong> {new Date(details.data_compra + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
            <p><strong>Status:</strong> {details.status}</p>
            <div className="card" style={{ marginTop: 16 }}>
              <table className="compras-table">
                <thead><tr><th>Produto</th><th>Qtd.</th><th>Custo unit.</th><th className="numeric">Total</th></tr></thead>
                <tbody>{(details.itens || []).map(item => (
                  <tr key={item.id}>
                    <td>{produtos.find(p => p.id === item.produto_id)?.nome || 'Produto #' + item.produto_id}</td>
                    <td>{item.quantidade}</td>
                    <td>{money(item.custo_unitario)}</td>
                    <td className="numeric">{money(Number(item.quantidade) * Number(item.custo_unitario))}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="compra-total">Total: {money(details.valor_total)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
