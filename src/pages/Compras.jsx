import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, X, Trash2, ShoppingCart, PackageCheck, Ban, ClipboardList, ScanLine } from 'lucide-react';
import { listarCompras, criarCompra, cancelarCompra } from '../services/compras';
import { listarFornecedores } from '../services/fornecedores';
import { listarProdutos } from '../services/produtos';
import { useAuth } from '../context/AuthContext';
import { podeExecutarAcao, ACTIONS } from '../config/access';
import BarcodeScannerModal from '../components/compras/BarcodeScannerModal';
import { formatarData } from '../utils/formatarData';
import CancelarCompraModal from '../components/compras/CancelarCompraModal';
import { useConfirmarFechamentoModal } from '../hooks/useConfirmarFechamentoModal';
import { formularioAlterado } from '../utils/formularioAlterado';
import ConfirmarDescarteDialog from '../components/ConfirmarDescarteDialog';
import { formatarMoeda as money } from '../utils/mascaras';
import './Compras.css';

const today = () => new Date().toLocaleDateString('en-CA');

const SUBVIEWS = [
  { key: 'todas', label: 'Todas' },
  { key: 'recebidas', label: 'Recebidas' },
  { key: 'canceladas', label: 'Canceladas' },
];

function emptyItem() {
  return { produto_id: '', quantidade: 1, custo_unitario: '' };
}

function emptyFiltros() {
  return { fornecedor_id: '', data_de: '', data_ate: '' };
}

function emptyForm() {
  return {
    fornecedor_id: '',
    data_compra: today(),
    nota_fiscal: '',
    forma_pagamento: 'a_vista',
    dias_prazo: '',
    itens: [emptyItem()],
  };
}

// KPIs derivados exclusivamente do status real das compras já carregadas —
// não há estado de "em andamento"/"pendência" hoje (compras nascem
// diretamente como 'recebido'), então não fabricamos essas métricas.
export function calcularKpisCompras(compras) {
  const lista = Array.isArray(compras) ? compras : [];
  const recebidas = lista.filter(c => c.status === 'recebido');
  const canceladas = lista.filter(c => c.status === 'cancelado');

  return {
    total: lista.length,
    recebidas: recebidas.length,
    canceladas: canceladas.length,
    valorRecebido: recebidas.reduce((soma, c) => soma + Number(c.valor_total || 0), 0),
  };
}

// Busca client-side sobre a página já carregada (o backend de /compras não
// suporta busca por texto/NF/SKU — ver COMPRAS-UX-GPT-VALIDATION.md #5).
export function filtrarComprasPorBusca(compras, termo) {
  const lista = Array.isArray(compras) ? compras : [];
  const query = (termo || '').trim().toLowerCase();
  if (!query) return lista;

  const semHash = query.replace(/^#/, '');

  return lista.filter(c => {
    const id = String(c.id);
    const fornecedor = (c.fornecedor_nome || '').toLowerCase();
    const nf = (c.nota_fiscal || '').toLowerCase();
    return id.includes(semHash) || fornecedor.includes(query) || nf.includes(query);
  });
}

export function filtrarComprasPorSubview(compras, subview) {
  const lista = Array.isArray(compras) ? compras : [];
  if (subview === 'recebidas') return lista.filter(c => c.status === 'recebido');
  if (subview === 'canceladas') return lista.filter(c => c.status === 'cancelado');
  return lista;
}

export default function Compras() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Backend protege /compras inteiro (criar/cancelar/listar) com
  // requireEstoquista (admin + estoquista) — ACTIONS.MOVIMENTAR_ESTOQUE já
  // reflete essa mesma política, então reaproveitamos em vez de restringir
  // além do que o backend permite.
  const podeGerenciar = podeExecutarAcao(user?.role, ACTIONS.MOVIMENTAR_ESTOQUE);

  const [compras, setCompras] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const [busca, setBusca] = useState('');
  const [subview, setSubview] = useState('todas');
  const [filtros, setFiltros] = useState(emptyFiltros());
  const [filtrosAplicados, setFiltrosAplicados] = useState(emptyFiltros());

  const [modalOpen, setModalOpen] = useState(false);
  const [createIntent, setCreateIntent] = useState('escolha');
  const [form, setForm] = useState(emptyForm());
  const [initialForm, setInitialForm] = useState(form);
  const [scannerParaItem, setScannerParaItem] = useState(null);
  const [cancelAlvo, setCancelAlvo] = useState(null);

  function fecharModalDireto() {
    setModalOpen(false);
    setCreateIntent('escolha');
  }

  // Issue #42: nunca fechar o modal de "Nova compra" silenciosamente
  // (clique fora, ESC, X ou Cancelar) com itens/dados preenchidos e não
  // salvos — vale tanto na tela de formulário quanto se o usuário voltou
  // para a tela de escolha (o form preenchido continua ali, em risco).
  const isDirty = formularioAlterado(form, initialForm);
  const { confirmando, solicitarFechamento, confirmarDescarte, continuarEditando } =
    useConfirmarFechamentoModal({ open: modalOpen, isDirty, onClose: fecharModalDireto });

  async function load(filtrosParaCarregar = filtrosAplicados) {
    setLoading(true);
    setError('');
    try {
      const [c, f, p] = await Promise.all([
        listarCompras({
          fornecedor_id: filtrosParaCarregar.fornecedor_id || undefined,
          data_de: filtrosParaCarregar.data_de || undefined,
          data_ate: filtrosParaCarregar.data_ate || undefined,
        }),
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

  useEffect(() => { load(emptyFiltros()); }, []);

  const kpis = useMemo(() => calcularKpisCompras(compras), [compras]);

  const comprasVisiveis = useMemo(() => {
    const porSubview = filtrarComprasPorSubview(compras, subview);
    return filtrarComprasPorBusca(porSubview, busca);
  }, [compras, subview, busca]);

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
    const formInicial = emptyForm();
    setForm(formInicial);
    setInitialForm(formInicial);
    setCreateIntent('escolha');
    setFeedback('');
    setModalOpen(true);
  }

  function closeCreate() {
    solicitarFechamento();
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
      fecharModalDireto();
      setFeedback('Compra registrada com sucesso. O estoque foi atualizado.');
      await load();
    } catch (err) {
      setFeedback(err.message);
    }
  }

  async function confirmarCancelamento() {
    await cancelarCompra(cancelAlvo.id);
    setFeedback('Compra cancelada e estoque estornado.');
    setCancelAlvo(null);
    await load();
  }

  function aplicarFiltros(e) {
    e.preventDefault();
    setFiltrosAplicados(filtros);
    load(filtros);
  }

  function limparFiltros() {
    const vazio = emptyFiltros();
    setFiltros(vazio);
    setFiltrosAplicados(vazio);
    load(vazio);
  }

  const filtrosAtivos = Boolean(filtrosAplicados.fornecedor_id || filtrosAplicados.data_de || filtrosAplicados.data_ate);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Compras</h1>
          <p className="page-subtitle">Entradas de mercadorias, custos e integração financeira</p>
        </div>
        {podeGerenciar && (
          <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Nova compra</button>
        )}
      </div>

      {feedback && <div className="compra-alert success">{feedback}</div>}
      {error && <div className="compra-alert error">{error}</div>}

      <div className="compras-kpis">
        <button
          type="button"
          className={`compras-kpi-card ${subview === 'todas' ? 'compras-kpi-card--active' : ''}`}
          onClick={() => setSubview('todas')}
        >
          <div className="compras-kpi-icon compras-kpi-icon--neutro"><ClipboardList size={18} /></div>
          <div className="compras-kpi-value">{kpis.total}</div>
          <div className="compras-kpi-label">Total de compras</div>
        </button>
        <button
          type="button"
          className={`compras-kpi-card ${subview === 'recebidas' ? 'compras-kpi-card--active' : ''}`}
          onClick={() => setSubview('recebidas')}
        >
          <div className="compras-kpi-icon compras-kpi-icon--sucesso"><PackageCheck size={18} /></div>
          <div className="compras-kpi-value">{kpis.recebidas}</div>
          <div className="compras-kpi-label">Recebidas &middot; {money(kpis.valorRecebido)}</div>
        </button>
        <button
          type="button"
          className={`compras-kpi-card ${subview === 'canceladas' ? 'compras-kpi-card--active' : ''}`}
          onClick={() => setSubview('canceladas')}
        >
          <div className="compras-kpi-icon compras-kpi-icon--perigo"><Ban size={18} /></div>
          <div className="compras-kpi-value">{kpis.canceladas}</div>
          <div className="compras-kpi-label">Canceladas</div>
        </button>
      </div>

      <div className="compras-toolbar">
        <div className="input-icon-wrapper compras-search">
          <Search size={16} className="input-icon" />
          <input
            className="input-field"
            placeholder="Buscar por # da compra, fornecedor ou NF..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
      </div>

      <form className="compras-filtros" onSubmit={aplicarFiltros}>
        <div className="compra-field">
          <label>Fornecedor</label>
          <select className="input-field" value={filtros.fornecedor_id} onChange={e => setFiltros({ ...filtros, fornecedor_id: e.target.value })}>
            <option value="">Todos</option>
            {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </div>
        <div className="compra-field">
          <label>De</label>
          <input type="date" className="input-field" value={filtros.data_de} onChange={e => setFiltros({ ...filtros, data_de: e.target.value })} />
        </div>
        <div className="compra-field">
          <label>Até</label>
          <input type="date" className="input-field" value={filtros.data_ate} onChange={e => setFiltros({ ...filtros, data_ate: e.target.value })} />
        </div>
        <button type="submit" className="btn btn-secondary">Filtrar</button>
        {filtrosAtivos && <button type="button" className="btn btn-ghost" onClick={limparFiltros}>Limpar filtros</button>}
      </form>

      <div className="compras-tabs">
        {SUBVIEWS.map(tab => (
          <button
            key={tab.key}
            type="button"
            className={`compras-tab ${subview === tab.key ? 'compras-tab--active' : ''}`}
            onClick={() => setSubview(tab.key)}
          >
            {tab.label}
          </button>
        ))}
        {/* Recebimentos não é um filtro sobre `compras` — é outro conjunto
            de dados (pedidos de compra/recebimentos, sem relação com
            Compra Direta), por isso navega em vez de filtrar a tabela. */}
        <button type="button" className="compras-tab" onClick={() => navigate('/compras/recebimentos')}>
          Recebimentos
        </button>
      </div>

      {loading ? (
        <div className="empty-state"><p className="text-sm text-secondary">Carregando compras...</p></div>
      ) : compras.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><ShoppingCart size={24} /></div>
          <div className="empty-state-title">Nenhuma compra registrada</div>
          <p className="text-sm text-secondary">Registre a primeira entrada de mercadorias.</p>
        </div>
      ) : comprasVisiveis.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Search size={24} /></div>
          <div className="empty-state-title">Nenhuma compra encontrada</div>
          <p className="text-sm text-secondary">Ajuste a busca, os filtros ou a aba selecionada.</p>
        </div>
      ) : (
        <div className="card compras-table-wrap">
          <table className="compras-table">
            <thead><tr>
              <th>#</th><th>Data</th><th>Fornecedor</th><th>NF</th><th>Pagamento</th>
              <th className="numeric">Total</th><th>Status</th><th />
            </tr></thead>
            <tbody>
              {comprasVisiveis.map(c => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{formatarData(c.data_compra)}</td>
                  <td>{c.fornecedor_nome || '—'}</td>
                  <td>{c.nota_fiscal || '—'}</td>
                  <td>{c.forma_pagamento === 'prazo' ? 'A prazo' + (c.dias_prazo ? ' (' + c.dias_prazo + ' dias)' : '') : 'À vista'}</td>
                  <td className="numeric">{money(c.valor_total)}</td>
                  <td><span className={c.status === 'cancelado' ? 'badge badge-danger' : 'badge badge-success'}>{c.status}</span></td>
                  <td>
                    <button className="produto-action-btn" title="Ver detalhes" onClick={() => navigate(`/compras/${c.id}`)}><Eye size={14} /></button>
                    {c.status === 'recebido' && podeGerenciar && (
                      <button className="produto-action-btn produto-action-btn--danger" title="Cancelar" onClick={() => setCancelAlvo(c)}><X size={14} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="compra-modal-backdrop" onMouseDown={e => e.target === e.currentTarget && closeCreate()}>
          {createIntent === 'escolha' ? (
            <div className="compra-modal compra-modal--intent">
              <div className="compra-modal-header">
                <h2>Nova compra</h2>
                <button type="button" className="produto-action-btn" onClick={closeCreate}><X size={16} /></button>
              </div>
              <p className="text-sm text-secondary" style={{ marginTop: -8, marginBottom: 18 }}>Como você deseja comprar?</p>
              <div className="compra-intent-grid">
                <button type="button" className="compra-intent-card" onClick={() => setCreateIntent('direta')}>
                  <ShoppingCart size={22} />
                  <strong>Compra direta</strong>
                  <span>Preciso comprar agora. Fornecedor, produtos e custos entram no estoque na hora.</span>
                </button>
                <button type="button" className="compra-intent-card compra-intent-card--disabled" disabled title="O recebimento já é suportado pelo backend, mas ainda não há como criar um pedido de compra pela interface">
                  <ClipboardList size={22} />
                  <strong>Compra planejada</strong>
                  <span className="compra-intent-badge">Em breve</span>
                  <span>Necessidade → Cotação → Pedido → Recebimento, com aprovação em etapas.</span>
                </button>
              </div>
              <div className="compra-modal-actions">
                <button type="button" className="btn btn-ghost" onClick={closeCreate}>Cancelar</button>
              </div>
            </div>
          ) : (
            <form className="compra-modal" onSubmit={handleSubmit}>
              <div className="compra-modal-header">
                <h2>Nova compra direta</h2>
                <button type="button" className="produto-action-btn" onClick={closeCreate}><X size={16} /></button>
              </div>

              {feedback && <div className="compra-alert error">{feedback}</div>}

              <div className="compra-form-section">
                <h3 className="compra-form-section-title">Fornecedor e data</h3>
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
                </div>
              </div>

              <div className="compra-form-section">
                <h3 className="compra-form-section-title">NF-e</h3>
                <div className="compra-form-grid">
                  <div className="compra-field full">
                    <label>Número da NF-e <span className="compra-field-optional">(opcional)</span></label>
                    <input className="input-field" placeholder="Deixe em branco se ainda não houver NF-e" value={form.nota_fiscal} onChange={e => setForm({ ...form, nota_fiscal: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="compra-form-section">
                <h3 className="compra-form-section-title">Forma de pagamento</h3>
                <div className="compra-form-grid">
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
              </div>

              <div className="compra-items">
                <div className="compra-items-header">
                  <h3 className="compra-form-section-title" style={{ margin: 0 }}>Itens</h3>
                  <button type="button" className="btn btn-secondary" onClick={() => setForm(prev => ({ ...prev, itens: [...prev.itens, emptyItem()] }))}><Plus size={14} /> Item</button>
                </div>
                {form.itens.map((item, index) => (
                  <div className="compra-item-row" key={index}>
                    <div className="compra-field compra-item-product">
                      <label>Produto *</label>
                      <div className="compra-item-product-row">
                        <select className="input-field" value={item.produto_id} onChange={e => updateItem(index, 'produto_id', e.target.value)}>
                          <option value="">Selecione...</option>
                          {produtos.map(p => <option key={p.id} value={p.id}>{p.sku ? p.sku + ' — ' : ''}{p.nome}</option>)}
                        </select>
                        <button type="button" className="produto-action-btn" title="Ler código do produto" onClick={() => setScannerParaItem(index)}><ScanLine size={14} /></button>
                      </div>
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
                <button type="button" className="btn btn-ghost" onClick={() => setCreateIntent('escolha')}>&lsaquo; Voltar</button>
                <button type="submit" className="btn btn-primary">Registrar compra</button>
              </div>
            </form>
          )}
        </div>
      )}

      {confirmando && (
        <ConfirmarDescarteDialog onContinuar={continuarEditando} onDescartar={confirmarDescarte} />
      )}

      {scannerParaItem !== null && (
        <BarcodeScannerModal
          onClose={() => setScannerParaItem(null)}
          onDetect={produto => {
            const disponivel = produtos.some(p => p.id === produto.produto_id);
            if (!disponivel) {
              setFeedback(`"${produto.nome}" foi encontrado, mas não está disponível no canal desta compra.`);
              return;
            }
            updateItem(scannerParaItem, 'produto_id', String(produto.produto_id));
            setScannerParaItem(null);
          }}
        />
      )}

      {cancelAlvo && (
        <CancelarCompraModal
          compra={cancelAlvo}
          onClose={() => setCancelAlvo(null)}
          onConfirm={confirmarCancelamento}
        />
      )}
    </div>
  );
}
