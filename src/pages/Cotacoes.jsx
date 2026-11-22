import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, Plus, Scale } from 'lucide-react';
import { listarCotacoes } from '../services/cotacoes';
import { listarFornecedores } from '../services/fornecedores';
import { listarTodosProdutos } from '../services/produtos';
import CotacaoModal from '../components/compras/CotacaoModal';
import { FILTROS_STATUS_COTACAO, rotuloStatusCotacao, badgeStatusCotacao } from '../utils/cotacao';
import { formatarData } from '../utils/formatarData';
import { useToast } from '../context/ToastContext';
import './Compras.css';
import './Cotacoes.css';

export default function Cotacoes() {
  const navigate = useNavigate();
  const toast = useToast();
  const [cotacoes, setCotacoes] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [novaAberta, setNovaAberta] = useState(false);

  async function load(statusFiltro = status) {
    setLoading(true);
    setError('');
    try {
      const [lista, forn, prod] = await Promise.all([
        listarCotacoes({ status: statusFiltro || undefined, pageSize: 100 }),
        listarFornecedores({ pageSize: 100 }),
        listarTodosProdutos({ canal: 'loja_fisica' }),
      ]);
      setCotacoes(lista.items || []);
      setFornecedores((forn.items || []).filter(f => f.ativo !== false));
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

  function criada(cotacao) {
    setNovaAberta(false);
    toast.success(`Cotação ${cotacao.numero} criada. Registre a proposta de cada fornecedor.`);
    navigate(`/compras/cotacoes/${cotacao.id}`);
  }

  return (
    <div className="page-content">
      <button className="compra-detalhe-voltar" onClick={() => navigate('/compras')}><ArrowLeft size={16} /> Voltar para Compras</button>

      <div className="page-header">
        <div>
          <h1 className="page-title">Cotações</h1>
          <p className="page-subtitle">Peça preço a vários fornecedores, compare item a item e gere o pedido do que ficou melhor</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setNovaAberta(true)}><Plus size={16} /> Nova cotação</button>
      </div>

      {error && <div className="compra-alert error">{error}</div>}

      <div className="compras-filtros">
        <div className="compra-field">
          <label>Situação</label>
          <select className="input-field" value={status} onChange={trocarStatus}>
            <option value="">Todas</option>
            {FILTROS_STATUS_COTACAO.map(s => <option key={s} value={s}>{rotuloStatusCotacao(s)}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><p className="text-sm text-secondary">Carregando cotações...</p></div>
      ) : cotacoes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Scale size={24} /></div>
          <div className="empty-state-title">Nenhuma cotação</div>
          <p className="text-sm text-secondary">Crie uma cotação com o que precisa e os fornecedores que quer consultar; compare as propostas e gere o pedido.</p>
        </div>
      ) : (
        <div className="card compras-table-wrap">
          <table className="compras-table">
            <thead><tr><th>Número</th><th>Aberta em</th><th>Responder até</th><th className="numeric">Itens</th><th>Propostas</th><th>Situação</th><th /></tr></thead>
            <tbody>
              {cotacoes.map(c => (
                <tr key={c.id}>
                  <td>{c.numero}</td>
                  <td>{c.data_abertura ? formatarData(c.data_abertura) : '—'}</td>
                  <td>{c.data_limite ? formatarData(c.data_limite) : '—'}</td>
                  <td className="numeric">{c.itens}</td>
                  <td>{c.respondidas} de {c.fornecedores}</td>
                  <td><span className={badgeStatusCotacao(c.status)}>{rotuloStatusCotacao(c.status)}</span></td>
                  <td><button className="produto-action-btn" title="Ver cotação" aria-label="Ver cotação" onClick={() => navigate(`/compras/cotacoes/${c.id}`)}><Eye size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {novaAberta && <CotacaoModal fornecedores={fornecedores} produtos={produtos} onClose={() => setNovaAberta(false)} onCriada={criada} />}
    </div>
  );
}
