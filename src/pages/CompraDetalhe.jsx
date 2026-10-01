import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { buscarCompra, cancelarCompra } from '../services/compras';
import { listarProdutos } from '../services/produtos';
import { useAuth } from '../context/AuthContext';
import { podeExecutarAcao, ACTIONS, canAccessRoute } from '../config/access';
import ComprasTimeline from '../components/compras/ComprasTimeline';
import CancelarCompraModal from '../components/compras/CancelarCompraModal';
import { useToast } from '../context/ToastContext';
import { formatarData } from '../utils/formatarData';
import { formatarMoeda as money } from '../utils/mascaras';
import './CompraDetalhe.css';

export default function CompraDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const podeGerenciar = podeExecutarAcao(user?.role, ACTIONS.MOVIMENTAR_ESTOQUE);
  const podeVerContasPagar = canAccessRoute('/contas-pagar', user?.role);

  const [compra, setCompra] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelarAberto, setCancelarAberto] = useState(false);
  const toast = useToast();

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [compraData, produtosData] = await Promise.all([
        buscarCompra(id),
        listarProdutos({ canal: 'loja_fisica', pageSize: 100 }),
      ]);
      setCompra(compraData);
      setProdutos(produtosData.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function confirmarCancelamento() {
    await cancelarCompra(id);
    toast.success('Compra cancelada e estoque estornado.');
    setCancelarAberto(false);
    await load();
  }

  if (loading) {
    return (
      <div className="page-content">
        <div className="empty-state"><p className="text-sm text-secondary">Carregando compra...</p></div>
      </div>
    );
  }

  if (error && !compra) {
    return (
      <div className="page-content">
        <button className="compra-detalhe-voltar" onClick={() => navigate('/compras')}><ArrowLeft size={16} /> Voltar para Compras</button>
        <div className="compra-alert error">{error}</div>
      </div>
    );
  }

  if (!compra) return null;

  return (
    <div className="page-content">
      <button className="compra-detalhe-voltar" onClick={() => navigate('/compras')}><ArrowLeft size={16} /> Voltar para Compras</button>

      {error && <div className="compra-alert error">{error}</div>}

      <div className="page-header">
        <div>
          <h1 className="page-title">Compra #{compra.id}</h1>
          <p className="page-subtitle">{compra.fornecedor_nome}</p>
        </div>
        <div className="compra-detalhe-header-actions">
          <span className={compra.status === 'cancelado' ? 'badge badge-danger' : 'badge badge-success'}>{compra.status}</span>
          {compra.status === 'recebido' && podeGerenciar && (
            <button className="btn btn-secondary" onClick={() => setCancelarAberto(true)}><X size={16} /> Cancelar compra</button>
          )}
        </div>
      </div>

      <div className="compra-detalhe-grid">
        <div className="card card-padding">
          <h3 className="compra-detalhe-section-title">Linha do tempo</h3>
          <ComprasTimeline compra={compra} />
        </div>

        <div className="card card-padding">
          <h3 className="compra-detalhe-section-title">Resumo</h3>
          <dl className="compra-detalhe-summary">
            <div><dt>Data da compra</dt><dd>{formatarData(compra.data_compra)}</dd></div>
            <div><dt>NF-e</dt><dd>{compra.nota_fiscal || 'Não informada'}</dd></div>
            <div><dt>Forma de pagamento</dt><dd>{compra.forma_pagamento === 'prazo' ? `A prazo (${compra.dias_prazo || '—'} dias)` : 'À vista'}</dd></div>
            <div><dt>Valor total</dt><dd>{money(compra.valor_total)}</dd></div>
          </dl>
          {compra.forma_pagamento === 'prazo' && (
            <p className="text-sm text-secondary compra-detalhe-financeiro-nota">
              O status de pagamento (aberto/pago) desta conta não é retornado por esta tela.
              {podeVerContasPagar ? ' Consulte em ' : ' Consulte com um administrador em '}
              {podeVerContasPagar
                ? <Link to="/contas-pagar">Contas a Pagar</Link>
                : 'Contas a Pagar'}.
            </p>
          )}
        </div>
      </div>

      <div className="card card-padding compra-detalhe-itens">
        <h3 className="compra-detalhe-section-title">Itens ({(compra.itens || []).length})</h3>
        <table className="compras-table">
          <thead><tr><th>Produto</th><th>Qtd.</th><th>Custo unit.</th><th className="numeric">Total</th></tr></thead>
          <tbody>
            {(compra.itens || []).map(item => (
              <tr key={item.id}>
                <td>{produtos.find(p => p.id === item.produto_id)?.nome || `Produto #${item.produto_id}`}</td>
                <td>{item.quantidade}</td>
                <td>{money(item.custo_unitario)}</td>
                <td className="numeric">{money(Number(item.quantidade) * Number(item.custo_unitario))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="compra-total">Total: {money(compra.valor_total)}</div>
      </div>

      {cancelarAberto && (
        <CancelarCompraModal
          compra={compra}
          onClose={() => setCancelarAberto(false)}
          onConfirm={confirmarCancelamento}
        />
      )}
    </div>
  );
}
