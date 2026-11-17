import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PrecosPorCanal from '../components/PrecosPorCanal';
import { buscarProduto } from '../services/produtos';
import { formatCurrency } from './relatorios/relatoriosUtils';
import './PrecificacaoProduto.css';

export { canalLabel, formatPercent, montarPayloadPreco, validarValorPreco } from '../utils/precoCanal';

export default function PrecificacaoProduto() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [produtoInfo, setProdutoInfo] = useState(location.state ?? null);

  useEffect(() => {
    // Nome/SKU chegam via state da navegação (link na lista de Produtos).
    // Se a tela foi aberta direto pela URL (sem state, ex: refresh), busca o
    // produto individualmente como fallback.
    if (produtoInfo) return;
    let cancelled = false;

    async function carregarProduto() {
      try {
        const produto = await buscarProduto(id);
        if (cancelled) return;
        setProdutoInfo({ nome: produto.nome, sku: produto.sku, custo: produto.custo });
      } catch {
        // Falha aqui não impede a tela de preços de funcionar — só o
        // cabeçalho fica sem nome/SKU.
      }
    }

    carregarProduto();
    return () => { cancelled = true; };
  }, [id, produtoInfo]);

  return (
    <div className="page-content">
      <button type="button" className="btn btn-ghost precos-voltar-btn" onClick={() => navigate('/produtos')}>
        <ArrowLeft size={16} />
        Voltar
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title">{produtoInfo?.nome ?? `Produto #${id}`}</h1>
          <p className="page-subtitle">
            SKU: {produtoInfo?.sku ?? '—'} · Custo: {produtoInfo?.custo != null ? formatCurrency(produtoInfo.custo) : '—'}
          </p>
        </div>
      </div>

      <PrecosPorCanal produtoId={id} />
    </div>
  );
}
