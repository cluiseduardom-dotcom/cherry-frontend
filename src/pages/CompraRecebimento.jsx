import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, ScanLine, TriangleAlert } from 'lucide-react';
import { buscarCompra } from '../services/compras';
import { listarProdutos } from '../services/produtos';
import BarcodeScannerModal from '../components/compras/BarcodeScannerModal';
import './CompraRecebimento.css';

// A conferência de recebimento é só local nesta entrega: não existe backend
// de recebimento (GET/POST /recebimentos etc.) hoje — ver
// docs/ai/COMPRAS-UX-GPT-VALIDATION.md #2 e #7. Este cálculo não persiste em
// lugar nenhum nem altera estoque; serve só para a UX de conferência em
// tela enquanto o contrato real não existe.
export function calcularProgressoConferencia(itens, conferidos) {
  const lista = Array.isArray(itens) ? itens : [];
  const totalPedido = lista.reduce((soma, item) => soma + Number(item.quantidade || 0), 0);
  const totalConferido = lista.reduce((soma, item) => soma + Number(conferidos?.[item.id] || 0), 0);
  const percentual = totalPedido > 0 ? Math.round((totalConferido / totalPedido) * 100) : 0;

  return { totalPedido, totalConferido, percentual: Math.min(100, percentual) };
}

export default function CompraRecebimento() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [compra, setCompra] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [conferidos, setConferidos] = useState({});
  const [scannerAberto, setScannerAberto] = useState(false);
  const [scannerFeedback, setScannerFeedback] = useState('');

  useEffect(() => {
    let cancelado = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [compraData, produtosData] = await Promise.all([
          buscarCompra(id),
          listarProdutos({ canal: 'loja_fisica', pageSize: 100 }),
        ]);
        if (cancelado) return;
        setCompra(compraData);
        setProdutos(produtosData.items || []);
      } catch (err) {
        if (!cancelado) setError(err.message);
      } finally {
        if (!cancelado) setLoading(false);
      }
    }
    load();
    return () => { cancelado = true; };
  }, [id]);

  const itensComProduto = useMemo(() => {
    return (compra?.itens || []).map(item => ({
      ...item,
      produto: produtos.find(p => p.id === item.produto_id) || null,
    }));
  }, [compra, produtos]);

  const progresso = useMemo(() => calcularProgressoConferencia(compra?.itens, conferidos), [compra, conferidos]);

  function ajustarConferido(itemId, quantidadeMaxima, delta) {
    setConferidos(prev => {
      const atual = Number(prev[itemId] || 0);
      const proximo = Math.max(0, Math.min(quantidadeMaxima, atual + delta));
      return { ...prev, [itemId]: proximo };
    });
  }

  function handleScanDetect(produto) {
    const item = (compra?.itens || []).find(i => i.produto_id === produto.id);
    if (!item) {
      setScannerFeedback(`"${produto.nome}" não faz parte desta compra.`);
      setScannerAberto(false);
      return;
    }
    ajustarConferido(item.id, item.quantidade, 1);
    setScannerFeedback(`+1 em "${produto.nome}" (conferência local).`);
    setScannerAberto(false);
  }

  if (loading) {
    return <div className="page-content"><div className="empty-state"><p className="text-sm text-secondary">Carregando compra...</p></div></div>;
  }

  if (error && !compra) {
    return (
      <div className="page-content">
        <button className="compra-detalhe-voltar" onClick={() => navigate(`/compras/${id}`)}><ArrowLeft size={16} /> Voltar para a compra</button>
        <div className="compra-alert error">{error}</div>
      </div>
    );
  }

  if (!compra) return null;

  return (
    <div className="page-content">
      <button className="compra-detalhe-voltar" onClick={() => navigate(`/compras/${id}`)}><ArrowLeft size={16} /> Voltar para Compra #{compra.id}</button>

      <div className="page-header">
        <div>
          <h1 className="page-title">Conferência de recebimento</h1>
          <p className="page-subtitle">Compra #{compra.id} &middot; {compra.fornecedor_nome}</p>
        </div>
      </div>

      <div className="compra-recebimento-aviso">
        <TriangleAlert size={18} />
        <div>
          <strong>Recurso aguardando suporte do backend.</strong>
          <p>
            Não existe hoje um endpoint de recebimento (<code>/recebimentos</code>) no backend — a compra já entra
            no estoque no momento em que é registrada. A conferência abaixo é <strong>somente local</strong>: não é
            salva, não é enviada ao servidor e não altera estoque. Ela existe para validar a experiência de
            conferência com leitor/scanner antes do contrato de API ser definido.
          </p>
        </div>
      </div>

      <div className="card card-padding compra-recebimento-progresso">
        <div className="compra-recebimento-progresso-header">
          <span>Progresso da conferência (local): {progresso.totalConferido} / {progresso.totalPedido} itens</span>
          <span>{progresso.percentual}%</span>
        </div>
        <div className="compra-recebimento-progresso-bar">
          <div className="compra-recebimento-progresso-fill" style={{ width: `${progresso.percentual}%` }} />
        </div>
      </div>

      {scannerFeedback && <div className="compra-alert success">{scannerFeedback}</div>}

      <div className="card compras-table-wrap">
        <table className="compras-table">
          <thead>
            <tr><th>Produto</th><th>SKU</th><th className="numeric">Pedido</th><th>Conferido (local)</th></tr>
          </thead>
          <tbody>
            {itensComProduto.map(item => {
              const conferido = Number(conferidos[item.id] || 0);
              const completo = conferido >= item.quantidade;
              return (
                <tr key={item.id}>
                  <td>{item.produto?.nome || `Produto #${item.produto_id}`}</td>
                  <td>{item.produto?.sku || '—'}</td>
                  <td className="numeric">{item.quantidade}</td>
                  <td>
                    <div className="compra-recebimento-stepper">
                      <button type="button" className="produto-action-btn" onClick={() => ajustarConferido(item.id, item.quantidade, -1)} disabled={conferido === 0}><Minus size={14} /></button>
                      <span className={completo ? 'badge badge-success' : 'badge badge-warning'}>{conferido}</span>
                      <button type="button" className="produto-action-btn" onClick={() => ajustarConferido(item.id, item.quantidade, 1)} disabled={conferido >= item.quantidade}><Plus size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="compra-recebimento-acoes">
        <button type="button" className="btn btn-secondary" onClick={() => setScannerAberto(true)}><ScanLine size={16} /> Abrir leitor / scanner</button>
        <button type="button" className="btn btn-primary" disabled title="Indisponível — aguardando endpoint de recebimento no backend">
          Concluir conferência
        </button>
      </div>

      {scannerAberto && (
        <BarcodeScannerModal
          produtos={itensComProduto.map(i => i.produto).filter(Boolean)}
          onClose={() => setScannerAberto(false)}
          onDetect={handleScanDetect}
        />
      )}
    </div>
  );
}
