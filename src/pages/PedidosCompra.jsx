import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Eye, Plus } from 'lucide-react';
import { listarPedidosCompra } from '../services/pedidosCompra';
import { listarFornecedores } from '../services/fornecedores';
import { listarTodosProdutos } from '../services/produtos';
import PedidoCompraModal from '../components/compras/PedidoCompraModal';
import { FILTROS_STATUS, rotuloStatusPedido, badgeStatusPedido } from '../utils/pedidoCompra';
import { formatarData } from '../utils/formatarData';
import { formatarMoeda as money } from '../utils/mascaras';
import { useToast } from '../context/ToastContext';
import './Compras.css';

export default function PedidosCompra() {
  const navigate = useNavigate();
  const toast = useToast();
  const [pedidos, setPedidos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [novoAberto, setNovoAberto] = useState(false);

  async function load(statusFiltro = status) {
    setLoading(true);
    setError('');
    try {
      const [lista, forn, prod] = await Promise.all([
        listarPedidosCompra({ status: statusFiltro || undefined, pageSize: 100 }),
        listarFornecedores({ pageSize: 100 }),
        listarTodosProdutos({ canal: 'loja_fisica' }),
      ]);
      setPedidos(lista.items || []);
      setFornecedores(forn.items || []);
      setProdutos(prod.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(''); }, []);

  function trocarStatus(e) {
    setStatus(e.target.value);
    load(e.target.value);
  }

  function pedidoSalvo(pedido) {
    setNovoAberto(false);
    toast.success(`Pedido ${pedido.numero} criado como rascunho.`);
    navigate(`/compras/pedidos/${pedido.id}`);
  }

  return (
    <div className="page-content">
      <button className="compra-detalhe-voltar" onClick={() => navigate('/compras')}><ArrowLeft size={16} /> Voltar para Compras</button>

      <div className="page-header">
        <div>
          <h1 className="page-title">Pedidos de compra</h1>
          <p className="page-subtitle">Peça ao fornecedor, acompanhe o que falta chegar e receba aos poucos</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setNovoAberto(true)}><Plus size={16} /> Novo pedido</button>
      </div>

      {error && <div className="compra-alert error">{error}</div>}

      <div className="compras-filtros">
        <div className="compra-field">
          <label>Situação</label>
          <select className="input-field" value={status} onChange={trocarStatus}>
            <option value="">Todas</option>
            {FILTROS_STATUS.map((s) => <option key={s} value={s}>{rotuloStatusPedido(s)}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><p className="text-sm text-secondary">Carregando pedidos...</p></div>
      ) : pedidos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><ClipboardList size={24} /></div>
          <div className="empty-state-title">Nenhum pedido de compra</div>
          <p className="text-sm text-secondary">Crie um pedido para o fornecedor; quando a mercadoria chegar, receba por aqui e o estoque e a conta a pagar são lançados.</p>
        </div>
      ) : (
        <div className="card compras-table-wrap">
          <table className="compras-table">
            <thead><tr><th>Número</th><th>Fornecedor</th><th>Emissão</th><th>Entrega prevista</th><th className="numeric">Itens</th><th className="numeric">Total</th><th>Situação</th><th /></tr></thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id}>
                  <td>{p.numero}</td>
                  <td>{p.fornecedor_nome}</td>
                  <td>{p.data_emissao ? formatarData(p.data_emissao) : '—'}</td>
                  <td>{p.data_prevista_entrega ? formatarData(p.data_prevista_entrega) : '—'}</td>
                  <td className="numeric">{p.itens}</td>
                  <td className="numeric">{money(p.total)}</td>
                  <td><span className={badgeStatusPedido(p.status)}>{rotuloStatusPedido(p.status)}</span></td>
                  <td><button className="produto-action-btn" title="Ver pedido" aria-label="Ver pedido" onClick={() => navigate(`/compras/pedidos/${p.id}`)}><Eye size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {novoAberto && (
        <PedidoCompraModal fornecedores={fornecedores} produtos={produtos} onClose={() => setNovoAberto(false)} onSalvo={pedidoSalvo} />
      )}
    </div>
  );
}
