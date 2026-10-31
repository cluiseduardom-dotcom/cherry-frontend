import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, AlertTriangle, Package, MapPin, Tag } from 'lucide-react';
import { listarProdutos } from '../services/produtos';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ACTIONS, podeExecutarAcao } from '../config/access';
import MovimentacaoEstoqueModal from '../components/MovimentacaoEstoqueModal';
import NovoLocalModal from '../components/NovoLocalModal';
import EtiquetasModal from '../components/etiquetas/EtiquetasModal';
import { listarLocais, saldosDoLocal } from '../services/locaisEstoque';
import { rotuloDoLocal, filtrarSaldos, totalDeUnidades } from '../utils/locaisEstoque';
import { useToast } from '../context/ToastContext';
import ProductCard from '../components/ProductCard';
import SaldosPorLocal from '../components/SaldosPorLocal';
import { corDoProduto as colorForProduto } from '../theme/themes';
import './Estoque.css';

const FILTROS_VALIDOS = ['todos', 'baixo', 'esgotado'];

// UX-04 (Issue #48): normaliza o valor cru do query param ?filtro= — usado
// tanto para o deeplink da Sidebar quanto para a troca manual dos pills.
// Qualquer valor ausente/desconhecido cai em "todos" (comportamento atual
// equivalente), sem quebrar a tela nem exigir um filtro "inválido" visível.
export function normalizarFiltro(valor) {
  return FILTROS_VALIDOS.includes(valor) ? valor : 'todos';
}

function StockBar({ value, max = 20 }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = value === 0 ? 'var(--color-danger)' : value <= 3 ? 'var(--color-warning)' : 'var(--color-success)';
  return (
    <div className="stock-bar-wrapper">
      <div className="stock-bar-track">
        <div className="stock-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="stock-bar-value" style={{ color }}>{value}</span>
    </div>
  );
}

export default function Estoque() {
  const { user } = useAuth();
  const podeMovimentar = podeExecutarAcao(user?.role, ACTIONS.MOVIMENTAR_ESTOQUE);
  // Itens para a janela de etiquetas (null = fechada). Vem do botão "Etiquetas" do card ou de uma entrada recém-salva.
  const [etiquetaItens, setEtiquetaItens] = useState(null);
  const podeCriarLocal = podeExecutarAcao(user?.role, ACTIONS.GERENCIAR_ESTOQUE);

  const [produtos, setProdutos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = normalizarFiltro(searchParams.get('filtro'));
  const [modalOpen, setModalOpen] = useState(false);
  const toast = useToast();

  // Estoque por local: '' = visão geral (total do produto, como sempre); com um local escolhido
  // a tela mostra o saldo daquele local (Central, Maleta ou Consignado).
  const [locais, setLocais] = useState([]);
  const [localId, setLocalId] = useState('');
  const [saldosLocal, setSaldosLocal] = useState([]);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [erroLocal, setErroLocal] = useState('');
  const [novoLocalOpen, setNovoLocalOpen] = useState(false);
  const localSelecionado = locais.find(l => String(l.id) === localId) ?? null;

  // UX-04 (Issue #48): a URL é a fonte única de verdade do filtro — tanto o
  // deeplink da Sidebar (/estoque?filtro=baixo) quanto o clique manual nos
  // pills abaixo passam por aqui, então os dois casos sempre convergem para
  // o mesmo estado e o botão voltar/avançar do navegador também funciona.
  function selecionarFiltro(key) {
    if (key === 'todos') {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('filtro');
        return next;
      });
    } else {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('filtro', key);
        return next;
      });
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [produtosData, alertasData] = await Promise.all([
          listarProdutos({ canal: 'loja_fisica' }),
          apiFetch('/produtos/estoque-baixo').then(body => body.data),
        ]);
        if (!cancelled) {
          setProdutos(produtosData.items.filter(p => p.ativo));
          setAlertas(alertasData);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // A lista de locais é complementar: se falhar, a tela segue funcionando na visão geral.
  function carregarLocais() {
    return listarLocais()
      .then(lista => setLocais(Array.isArray(lista) ? lista : []))
      .catch(() => setLocais([]));
  }

  useEffect(() => { carregarLocais(); }, []);

  useEffect(() => {
    if (!localId) return undefined;

    let cancelled = false;
    setLoadingLocal(true);
    setErroLocal('');

    saldosDoLocal(localId)
      .then(dados => { if (!cancelled) setSaldosLocal(dados.items); })
      .catch(err => { if (!cancelled) { setSaldosLocal([]); setErroLocal(err.message); } })
      .finally(() => { if (!cancelled) setLoadingLocal(false); });

    return () => { cancelled = true; };
  }, [localId]);

  const saldosFiltrados = filtrarSaldos(saldosLocal, search);

  function handleLocalCriado(local) {
    setNovoLocalOpen(false);
    carregarLocais();
    toast.success(`Local "${rotuloDoLocal(local)}" criado.`);
  }

  const filtered = produtos.filter(p => {
    const term = search.toLowerCase();
    const matchSearch = p.nome.toLowerCase().includes(term) || (p.sku ?? '').toLowerCase().includes(term);
    const matchFilter =
      filter === 'todos' ? true :
      filter === 'baixo' ? (p.estoque_atual > 0 && p.estoque_atual <= p.estoque_minimo) :
      filter === 'esgotado' ? p.estoque_atual === 0 :
      true;
    return matchSearch && matchFilter;
  });

  const lowStockCount = alertas.filter(a => a.estoque_atual > 0).length;
  const outCount      = alertas.filter(a => a.estoque_atual === 0).length;
  const totalItems    = produtos.reduce((s, p) => s + p.estoque_atual, 0);

  function handleMovimentacaoSaved(movimentacao, opcoes = {}) {
    const produtoAtualizado = produtos.find(p => p.id === movimentacao.produto_id);
    if (!produtoAtualizado) {
      setModalOpen(false);
      return;
    }

    const atualizado = { ...produtoAtualizado, estoque_atual: movimentacao.estoque_resultante };

    setProdutos(prev => prev.map(p => (p.id === atualizado.id ? atualizado : p)));

    setAlertas(prev => {
      const semEsteProduto = prev.filter(a => a.id !== atualizado.id);
      if (atualizado.estoque_atual <= atualizado.estoque_minimo) {
        return [...semEsteProduto, {
          id: atualizado.id,
          sku: atualizado.sku,
          nome: atualizado.nome,
          estoque_atual: atualizado.estoque_atual,
          estoque_minimo: atualizado.estoque_minimo,
        }];
      }
      return semEsteProduto;
    });

    setModalOpen(false);
    toast.success('Movimentação registrada com sucesso.');

    if (opcoes.imprimirEtiquetas) {
      setEtiquetaItens([{ produto_id: atualizado.id, nome: atualizado.nome, quantidade: opcoes.quantidade }]);
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Estoque</h1>
          <p className="page-subtitle">Controle de inventário e disponibilidade</p>
        </div>
        <div className="estoque-header-actions">
          {podeCriarLocal && (
            <button className="btn btn-secondary" onClick={() => setNovoLocalOpen(true)}>
              <MapPin size={16} />
              Novo local
            </button>
          )}
          {podeMovimentar && (
            <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
              <Plus size={16} />
              Entrada de Estoque
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {!localId && <div className="estoque-summary">
        <div className="estoque-summary-card card card-padding">
          <div className="estoque-summary-icon" style={{ background: 'var(--color-primary-ultra)', color: 'var(--color-primary)' }}>
            <Package size={20} />
          </div>
          <div>
            <div className="estoque-summary-value">{totalItems}</div>
            <div className="estoque-summary-label">Itens em estoque</div>
          </div>
        </div>
        <div className="estoque-summary-card card card-padding">
          <div className="estoque-summary-icon" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="estoque-summary-value">{lowStockCount}</div>
            <div className="estoque-summary-label">Estoque baixo</div>
          </div>
        </div>
        <div className="estoque-summary-card card card-padding">
          <div className="estoque-summary-icon" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
            <Package size={20} />
          </div>
          <div>
            <div className="estoque-summary-value">{outCount}</div>
            <div className="estoque-summary-label">Esgotados</div>
          </div>
        </div>
        <div className="estoque-summary-card card card-padding">
          <div className="estoque-summary-icon" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
            <Package size={20} />
          </div>
          <div>
            <div className="estoque-summary-value">{produtos.length}</div>
            <div className="estoque-summary-label">SKUs ativos</div>
          </div>
        </div>
      </div>}

      {localId && (
        <div className="estoque-summary">
          <div className="estoque-summary-card card card-padding">
            <div className="estoque-summary-icon" style={{ background: 'var(--color-primary-ultra)', color: 'var(--color-primary)' }}>
              <MapPin size={20} />
            </div>
            <div>
              <div className="estoque-summary-value">{totalDeUnidades(saldosLocal)}</div>
              <div className="estoque-summary-label">Itens em {rotuloDoLocal(localSelecionado)}</div>
            </div>
          </div>
          <div className="estoque-summary-card card card-padding">
            <div className="estoque-summary-icon" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
              <Package size={20} />
            </div>
            <div>
              <div className="estoque-summary-value">{saldosLocal.length}</div>
              <div className="estoque-summary-label">SKUs no local</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="estoque-filters">
        <div className="input-icon-wrapper" style={{ flex: 1, maxWidth: 360 }}>
          <Search size={16} className="input-icon" />
          <input
            type="text"
            className="input-field"
            placeholder="Buscar produto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {locais.length > 0 && (
          <select
            className="input-field estoque-local-select"
            value={localId}
            onChange={e => setLocalId(e.target.value)}
            aria-label="Local de estoque"
          >
            <option value="">Todos os locais (total)</option>
            {locais.map(l => <option key={l.id} value={l.id}>{rotuloDoLocal(l)}</option>)}
          </select>
        )}
        {!localId && <div className="estoque-filter-pills">
          {[
            { key: 'todos', label: 'Todos' },
            { key: 'baixo', label: 'Estoque baixo' },
            { key: 'esgotado', label: 'Esgotados' },
          ].map(f => (
            <button
              key={f.key}
              className={`category-pill ${filter === f.key ? 'category-pill--active' : ''}`}
              onClick={() => selecionarFiltro(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>}
      </div>

      {localId && loadingLocal && (
        <div className="empty-state"><p className="text-sm text-secondary">Carregando saldo do local...</p></div>
      )}

      {localId && !loadingLocal && erroLocal && (
        <div className="empty-state">
          <div className="empty-state-title">Não foi possível carregar o saldo do local</div>
          <p className="text-sm text-secondary">{erroLocal}</p>
        </div>
      )}

      {localId && !loadingLocal && !erroLocal && (
        <div>
          <div className="product-grid" role="list">
            {saldosFiltrados.map(i => (
              <ProductCard
                key={i.produto_id}
                product={{ id: i.produto_id, name: i.nome, sku: i.sku, stock: i.saldo, color: colorForProduto(i.produto_id) }}
                ocultarPreco
                estoqueRotulo="Saldo no local"
              />
            ))}
          </div>
          {saldosFiltrados.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon"><Package size={24} /></div>
              <div className="empty-state-title">
                {saldosLocal.length === 0 ? 'Nenhum produto neste local' : 'Nenhum produto encontrado'}
              </div>
            </div>
          )}
        </div>
      )}

      {!localId && loading && (
        <div className="empty-state">
          <p className="text-sm text-secondary">Carregando estoque...</p>
        </div>
      )}

      {!localId && !loading && error && (
        <div className="empty-state">
          <div className="empty-state-title">Não foi possível carregar o estoque</div>
          <p className="text-sm text-secondary">{error}</p>
        </div>
      )}

      {!localId && !loading && !error && (
        <div>
          <div className="product-grid" role="list">
            {filtered.map(p => {
              const status =
                p.estoque_atual === 0 ? 'esgotado' :
                p.estoque_atual <= p.estoque_minimo ? 'baixo' :
                'ok';
              return (
                <ProductCard
                  key={p.id}
                  product={{
                    id: p.id,
                    name: p.nome,
                    sku: p.sku,
                    price: p.preco_canal?.preco_venda ?? null,
                    stock: p.estoque_atual,
                    color: colorForProduto(p.id),
                    categorias: p.categorias,
                    imageUrl: p.imagem_url || p.foto_url || p.imagem || p.foto || null,
                  }}
                  ocultarEstoque
                >
                  <span className="estoque-total-label">Total em todos os locais</span>
                  <StockBar value={p.estoque_atual} />
                  <SaldosPorLocal produtoId={p.id} />
                  {status === 'esgotado' && <span className="badge badge-danger">Esgotado</span>}
                  {status === 'baixo'    && <span className="badge badge-warning"><AlertTriangle size={10} />Baixo</span>}
                  {status === 'ok'       && <span className="badge badge-success">Normal</span>}
                  {podeMovimentar && (
                    <button
                      type="button"
                      className="btn btn-ghost estoque-etiqueta-btn"
                      onClick={() => setEtiquetaItens([{ produto_id: p.id, nome: p.nome, quantidade: 1 }])}
                    >
                      <Tag size={14} /> Etiquetas
                    </button>
                  )}
                </ProductCard>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon"><Package size={24} /></div>
              <div className="empty-state-title">Nenhum produto encontrado</div>
            </div>
          )}
        </div>
      )}

      {podeCriarLocal && (
        <NovoLocalModal
          open={novoLocalOpen}
          locais={locais}
          onClose={() => setNovoLocalOpen(false)}
          onSaved={handleLocalCriado}
        />
      )}

      {podeMovimentar && etiquetaItens && (
        <EtiquetasModal itens={etiquetaItens} onClose={() => setEtiquetaItens(null)} />
      )}

      {podeMovimentar && (
        <MovimentacaoEstoqueModal
          open={modalOpen}
          produtos={produtos}
          onClose={() => setModalOpen(false)}
          onSaved={handleMovimentacaoSaved}
        />
      )}
    </div>
  );
}
