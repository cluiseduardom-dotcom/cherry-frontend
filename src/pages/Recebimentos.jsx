import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PackageSearch } from 'lucide-react';
import { listarRecebimentos } from '../services/recebimentos';
import { listarFornecedores } from '../services/fornecedores';
import { badgeClassePorStatus } from './RecebimentoDetalhe';
import { formatarData } from '../utils/formatarData';

const STATUS_FILTROS = ['RASCUNHO', 'EM_CONFERENCIA', 'CONFERIDO', 'APROVADO', 'DIVERGENCIA', 'CANCELADO'];

export default function Recebimentos() {
  const navigate = useNavigate();
  const [recebimentos, setRecebimentos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(statusFiltro = status) {
    setLoading(true);
    setError('');
    try {
      const [recebimentosData, fornecedoresData] = await Promise.all([
        listarRecebimentos({ status: statusFiltro || undefined, limit: 100 }),
        listarFornecedores({ pageSize: 100 }),
      ]);
      setRecebimentos(Array.isArray(recebimentosData) ? recebimentosData : []);
      setFornecedores(fornecedoresData.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(''); }, []);

  function handleStatusChange(e) {
    const proximo = e.target.value;
    setStatus(proximo);
    load(proximo);
  }

  return (
    <div className="page-content">
      <button className="compra-detalhe-voltar" onClick={() => navigate('/compras')}><ArrowLeft size={16} /> Voltar para Compras</button>

      <div className="page-header">
        <div>
          <h1 className="page-title">Recebimentos</h1>
          <p className="page-subtitle">Recebimentos de pedidos de compra e sua aprovação — fluxo separado da Compra Direta</p>
        </div>
      </div>

      {error && <div className="compra-alert error">{error}</div>}

      <div className="compras-filtros">
        <div className="compra-field">
          <label>Status</label>
          <select className="input-field" value={status} onChange={handleStatusChange}>
            <option value="">Todos</option>
            {STATUS_FILTROS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><p className="text-sm text-secondary">Carregando recebimentos...</p></div>
      ) : recebimentos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><PackageSearch size={24} /></div>
          <div className="empty-state-title">Nenhum recebimento encontrado</div>
          <p className="text-sm text-secondary">
            Recebimentos são criados a partir de um pedido de compra. A interface para criar pedidos de compra ainda
            não existe — esta tela lista os recebimentos já existentes no backend.
          </p>
        </div>
      ) : (
        <div className="card compras-table-wrap">
          <table className="compras-table">
            <thead><tr>
              <th>#</th><th>Número</th><th>Pedido de compra</th><th>Fornecedor</th><th>Data</th><th>Status</th><th />
            </tr></thead>
            <tbody>
              {recebimentos.map(r => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.numero}</td>
                  <td>#{r.pedido_compra_id}</td>
                  <td>{fornecedores.find(f => f.id === r.fornecedor_id)?.nome || `Fornecedor #${r.fornecedor_id}`}</td>
                  <td>{formatarData(r.data_recebimento)}</td>
                  <td><span className={badgeClassePorStatus(r.status)}>{r.status}</span></td>
                  <td>
                    <button className="produto-action-btn" title="Ver detalhes" onClick={() => navigate(`/compras/recebimentos/${r.id}`)}>Ver</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
