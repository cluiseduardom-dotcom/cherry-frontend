import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { listarPrecosProduto, atualizarPrecoCanal } from '../services/precos';
import { buscarProduto } from '../services/produtos';
import { formatCurrency, formatDateBR } from './relatorios/relatoriosUtils';
import './PrecificacaoProduto.css';

const CANAL_LABEL = { loja_fisica: 'Loja física', online: 'Online' };

export function canalLabel(canal) {
  return CANAL_LABEL[canal] ?? canal;
}

export function formatPercent(value) {
  if (value == null) return '—';
  return `${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

export function montarPayloadPreco(modo, valor) {
  const numero = Number(valor);
  return modo === 'markup' ? { markup_percentual: numero } : { preco_venda: numero };
}

export function validarValorPreco(valor) {
  const numero = Number(valor);
  if (valor === '' || Number.isNaN(numero) || numero <= 0) {
    return 'Informe um valor maior que zero';
  }
  return '';
}

function formFormDefaults() {
  return { modo: 'markup', valor: '', saving: false, error: '' };
}

export default function PrecificacaoProduto() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [produtoInfo, setProdutoInfo] = useState(location.state ?? null);
  const [canais, setCanais] = useState([]);
  const [formsPorCanal, setFormsPorCanal] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function carregar() {
      setLoading(true);
      setLoadError('');
      try {
        const data = await listarPrecosProduto(id);
        if (cancelled) return;
        setCanais(data);
        setFormsPorCanal(Object.fromEntries(data.map(c => [c.canal_id, formFormDefaults()])));
      } catch (err) {
        if (!cancelled) setLoadError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    carregar();
    return () => { cancelled = true; };
  }, [id]);

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

  function updateForm(canalId, patch) {
    setFormsPorCanal(prev => ({ ...prev, [canalId]: { ...prev[canalId], ...patch } }));
  }

  async function handleSalvar(canalId) {
    const form = formsPorCanal[canalId];
    const erro = validarValorPreco(form.valor);
    if (erro) {
      updateForm(canalId, { error: erro });
      return;
    }

    updateForm(canalId, { saving: true, error: '' });
    try {
      const payload = montarPayloadPreco(form.modo, form.valor);
      const atualizado = await atualizarPrecoCanal(id, canalId, payload);
      setCanais(prev => prev.map(c => (c.canal_id === canalId ? { ...c, ...atualizado } : c)));
      updateForm(canalId, { saving: false, valor: '' });
      setSuccessMsg('Preço atualizado com sucesso.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      updateForm(canalId, { saving: false, error: err.message });
    }
  }

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

      {successMsg && (
        <p className="text-sm" style={{ color: 'var(--color-success)', marginBottom: 'var(--space-3)' }}>
          {successMsg}
        </p>
      )}

      {loading && (
        <div className="empty-state">
          <p className="text-sm text-secondary">Carregando preços...</p>
        </div>
      )}

      {!loading && loadError && (
        <div className="empty-state">
          <div className="empty-state-title">Não foi possível carregar os preços</div>
          <p className="text-sm text-secondary">{loadError}</p>
        </div>
      )}

      {!loading && !loadError && (
        <div className="precos-grid">
          {canais.map(canal => {
            const form = formsPorCanal[canal.canal_id] ?? formFormDefaults();
            return (
              <div key={canal.canal_id} className="preco-canal-card card card-padding">
                <h3 className="preco-canal-nome">{canalLabel(canal.canal)}</h3>

                {canal.preco_venda == null ? (
                  <p className="preco-canal-vazio">Sem preço definido para este canal</p>
                ) : (
                  <div className="preco-canal-info">
                    <div className="preco-canal-linha">
                      <span className="preco-canal-label">Preço de venda</span>
                      <span className="preco-canal-valor">{formatCurrency(canal.preco_venda)}</span>
                    </div>
                    <div className="preco-canal-linha">
                      <span className="preco-canal-label">Markup</span>
                      <span className="preco-canal-valor">{formatPercent(canal.markup_percentual)}</span>
                    </div>
                    <div className="preco-canal-linha">
                      <span className="preco-canal-label">Margem</span>
                      <span className="preco-canal-valor">{formatPercent(canal.margem_percentual)}</span>
                    </div>
                    <div className="preco-canal-linha">
                      <span className="preco-canal-label">Vigente desde</span>
                      <span className="preco-canal-valor">{formatDateBR(canal.vigente_desde)}</span>
                    </div>
                  </div>
                )}

                <div className="preco-canal-form">
                  <div className="preco-canal-toggle">
                    <button
                      type="button"
                      className={`preco-modo-btn ${form.modo === 'markup' ? 'preco-modo-btn--active' : ''}`}
                      onClick={() => updateForm(canal.canal_id, { modo: 'markup' })}
                    >
                      Definir por markup (%)
                    </button>
                    <button
                      type="button"
                      className={`preco-modo-btn ${form.modo === 'preco' ? 'preco-modo-btn--active' : ''}`}
                      onClick={() => updateForm(canal.canal_id, { modo: 'preco' })}
                    >
                      Definir por preço direto (R$)
                    </button>
                  </div>

                  {form.error && <p className="preco-canal-erro">{form.error}</p>}

                  <div className="preco-canal-input-row">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input-field"
                      placeholder={form.modo === 'markup' ? 'Markup %' : 'Preço R$'}
                      value={form.valor}
                      onChange={e => updateForm(canal.canal_id, { valor: e.target.value })}
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={form.saving}
                      onClick={() => handleSalvar(canal.canal_id)}
                    >
                      {form.saving ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
