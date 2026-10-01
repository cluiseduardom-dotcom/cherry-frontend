import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ScanLine, TriangleAlert } from 'lucide-react';
import { buscarRecebimento, alterarStatusRecebimento, aprovarRecebimento } from '../services/recebimentos';
import { listarFornecedores } from '../services/fornecedores';
import { useAuth } from '../context/AuthContext';
import { podeExecutarAcao, ACTIONS } from '../config/access';
import BarcodeScannerModal from '../components/compras/BarcodeScannerModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useConfirmAction } from '../hooks/useConfirmAction';
import { useToast } from '../context/ToastContext';
import './RecebimentoDetalhe.css';

// Vocabulário fixo de status.js (CHECK constraint de `recebimentos` no
// backend, migration 030). APROVADO fica fora da lista de transição manual
// de propósito: recebimentosService.alterarStatus rejeita essa transição —
// aprovação só acontece via aprovarRecebimento (POST /:id/aprovar), que faz
// toda a integração transacional (estoque, pedido de compra, financeiro).
const STATUS_TRANSICIONAVEIS = ['RASCUNHO', 'EM_CONFERENCIA', 'CONFERIDO', 'DIVERGENCIA', 'CANCELADO'];

export function badgeClassePorStatus(status) {
  switch (status) {
    case 'APROVADO': return 'badge badge-success';
    case 'CANCELADO': return 'badge badge-danger';
    case 'DIVERGENCIA': return 'badge badge-warning';
    case 'CONFERIDO': return 'badge badge-info';
    default: return 'badge badge-warning';
  }
}

// Divergência real: o backend guarda quantidade_pedida e quantidade_recebida
// por item de recebimento (migration 030) — nada fabricado aqui.
export function calcularDivergenciaItensRecebimento(itens) {
  const lista = Array.isArray(itens) ? itens : [];
  const divergentes = lista.filter(item => Number(item.quantidade_recebida) !== Number(item.quantidade_pedida));
  return {
    totalItens: lista.length,
    itensDivergentes: divergentes.length,
    temDivergencia: divergentes.length > 0,
  };
}

export default function RecebimentoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const podeGerenciar = podeExecutarAcao(user?.role, ACTIONS.MOVIMENTAR_ESTOQUE);

  const [recebimento, setRecebimento] = useState(null);
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [proximoStatus, setProximoStatus] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [scannerAberto, setScannerAberto] = useState(false);
  const [itemDestacadoId, setItemDestacadoId] = useState(null);

  const { acaoPendente, pedirConfirmacao, confirmar, cancelar } = useConfirmAction();
  const toast = useToast();

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [recebimentoData, fornecedoresData] = await Promise.all([
        buscarRecebimento(id),
        listarFornecedores({ pageSize: 100 }),
      ]);
      setRecebimento(recebimentoData);
      setFornecedores(fornecedoresData.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  const divergencia = useMemo(() => calcularDivergenciaItensRecebimento(recebimento?.itens), [recebimento]);
  const fornecedorNome = fornecedores.find(f => f.id === recebimento?.fornecedor_id)?.nome;

  async function handleAlterarStatus(e) {
    e.preventDefault();
    if (!proximoStatus) return;
    setSalvando(true);
    try {
      await alterarStatusRecebimento(id, proximoStatus);
      toast.success(`Status alterado para ${proximoStatus}.`);
      setProximoStatus('');
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSalvando(false);
    }
  }

  function handleAprovar() {
    pedirConfirmacao({
      title: 'Aprovar recebimento',
      message: 'Aprovar este recebimento? O backend vai lançar entrada de estoque, atualizar o pedido de compra e gerar a conta a pagar correspondente.',
      confirmLabel: 'Aprovar',
      tone: 'warning',
      execute: executarAprovar,
    });
  }

  async function executarAprovar() {
    setSalvando(true);
    try {
      const resultado = await aprovarRecebimento(id);
      toast.success(
        resultado?.conta_pagar
          ? `Recebimento aprovado. Conta a pagar #${resultado.conta_pagar.id} gerada.`
          : 'Recebimento aprovado.'
      );
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSalvando(false);
    }
  }

  function handleScanDetect(produto) {
    const item = (recebimento?.itens || []).find(i => i.produto_id === produto.produto_id);
    setScannerAberto(false);
    if (!item) {
      toast.warning(`"${produto.nome}" não faz parte deste recebimento.`);
      return;
    }
    toast.info(`Localizado: ${item.descricao_snapshot}.`);
    setItemDestacadoId(item.id);
    setTimeout(() => setItemDestacadoId(null), 3000);
  }

  if (loading) {
    return <div className="page-content"><div className="empty-state"><p className="text-sm text-secondary">Carregando recebimento...</p></div></div>;
  }

  if (error && !recebimento) {
    return (
      <div className="page-content">
        <button className="compra-detalhe-voltar" onClick={() => navigate('/compras/recebimentos')}><ArrowLeft size={16} /> Voltar para Recebimentos</button>
        <div className="compra-alert error">{error}</div>
      </div>
    );
  }

  if (!recebimento) return null;

  const podeAprovar = recebimento.status === 'CONFERIDO' && podeGerenciar;
  const podeAlterarStatus = podeGerenciar && !['APROVADO', 'CANCELADO'].includes(recebimento.status);
  // Conferência (scanner) só faz sentido enquanto o recebimento ainda pode
  // receber apontamentos — nos estados terminais (APROVADO/CANCELADO) ou já
  // fechado para conferência (CONFERIDO) não há o que localizar/ajustar.
  const podeConferir = podeGerenciar && ['RASCUNHO', 'EM_CONFERENCIA', 'DIVERGENCIA'].includes(recebimento.status);
  const labelConferencia = recebimento.status === 'RASCUNHO' ? 'Iniciar conferência' : 'Continuar conferência';

  return (
    <div className="page-content">
      <button className="compra-detalhe-voltar" onClick={() => navigate('/compras/recebimentos')}><ArrowLeft size={16} /> Voltar para Recebimentos</button>

      <div className="page-header">
        <div>
          <h1 className="page-title">Recebimento {recebimento.numero}</h1>
          <p className="page-subtitle">Pedido de compra #{recebimento.pedido_compra_id} &middot; {fornecedorNome || `Fornecedor #${recebimento.fornecedor_id}`}</p>
        </div>
        <span className={badgeClassePorStatus(recebimento.status)}>{recebimento.status}</span>
      </div>

      {divergencia.temDivergencia && (
        <div className="compra-recebimento-aviso">
          <TriangleAlert size={18} />
          <div>
            <strong>{divergencia.itensDivergentes} de {divergencia.totalItens} itens com divergência entre pedido e recebido.</strong>
            <p>Quantidades conforme registradas no backend — nenhum valor calculado no frontend.</p>
          </div>
        </div>
      )}

      <div className="card compras-table-wrap">
        <table className="compras-table">
          <thead>
            <tr><th>Item</th><th className="numeric">Pedido</th><th className="numeric">Recebido</th><th>Unidade</th><th>Lote</th></tr>
          </thead>
          <tbody>
            {(recebimento.itens || []).map(item => (
              <tr key={item.id} className={item.id === itemDestacadoId ? 'compra-recebimento-item--destacado' : ''}>
                <td>{item.descricao_snapshot}</td>
                <td className="numeric">{item.quantidade_pedida}</td>
                <td className="numeric">
                  {item.quantidade_recebida}
                  {Number(item.quantidade_recebida) !== Number(item.quantidade_pedida) && (
                    <span className="badge badge-warning" style={{ marginLeft: 6 }}>divergente</span>
                  )}
                </td>
                <td>{item.unidade}</td>
                <td>{item.lote || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card card-padding compra-recebimento-acoes-card">
        {podeConferir && (
          <button type="button" className="btn btn-primary" onClick={() => setScannerAberto(true)}>
            <ScanLine size={16} /> {labelConferencia} (scanner)
          </button>
        )}

        {podeAlterarStatus && (
          <form className="compra-recebimento-status-form" onSubmit={handleAlterarStatus}>
            <select className="input-field" value={proximoStatus} onChange={e => setProximoStatus(e.target.value)}>
              <option value="">Alterar status para...</option>
              {STATUS_TRANSICIONAVEIS.filter(s => s !== recebimento.status).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="submit" className="btn btn-secondary" disabled={!proximoStatus || salvando}>Aplicar</button>
          </form>
        )}

        {podeAprovar && (
          <button type="button" className="btn btn-primary" onClick={handleAprovar} disabled={salvando}>
            <CheckCircle2 size={16} /> Aprovar recebimento
          </button>
        )}
      </div>

      {scannerAberto && (
        <BarcodeScannerModal onClose={() => setScannerAberto(false)} onDetect={handleScanDetect} />
      )}

      <ConfirmDialog
        open={acaoPendente !== null}
        title={acaoPendente?.title}
        message={acaoPendente?.message}
        confirmLabel={acaoPendente?.confirmLabel}
        tone={acaoPendente?.tone}
        onConfirm={confirmar}
        onCancel={cancelar}
      />
    </div>
  );
}
