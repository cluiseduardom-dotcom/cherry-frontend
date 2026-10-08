import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Tag, DollarSign, Edit, Trash2, Layers } from 'lucide-react';
import { listarProdutos, excluirProduto } from '../services/produtos';
import { useAuth } from '../context/AuthContext';
import { ACTIONS, podeExecutarAcao } from '../config/access';
import ProductModal from '../components/ProductModal';
import CategorizarProdutoModal from '../components/CategorizarProdutoModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useConfirmAction } from '../hooks/useConfirmAction';
import { useToast } from '../context/ToastContext';
import { formatarMoeda } from '../utils/mascaras';
import ProductRow from '../components/ProductRow';
import './Produtos.css';

const CARD_COLORS = ['#C9A96E', '#D4AF37', '#F5F0E8', '#C0C0C0', '#A70636', '#E8A0BF', '#FFD700', '#F4A7B9', '#B8860B'];

function colorForProduto(id) {
  return CARD_COLORS[id % CARD_COLORS.length];
}

export function temSku(produto) {
  return produto?.sku != null;
}

export default function Produtos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const podeGerenciar = podeExecutarAcao(user?.role, ACTIONS.GERENCIAR_ESTOQUE);
  const podeGerenciarPrecos = podeExecutarAcao(user?.role, ACTIONS.GERENCIAR_PRECOS);
  const podeCategorizar = podeExecutarAcao(user?.role, ACTIONS.CATEGORIZAR_PRODUTO);

  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingProduto, setEditingProduto] = useState(null);
  const [categorizarModalOpen, setCategorizarModalOpen] = useState(false);
  const [categorizandoProduto, setCategorizandoProduto] = useState(null);

  const { acaoPendente, pedirConfirmacao, confirmar, cancelar } = useConfirmAction();
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await listarProdutos({ canal: 'loja_fisica' });
        if (!cancelled) setProdutos(data.items);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = produtos.filter(p => {
    const term = search.toLowerCase();
    return p.nome.toLowerCase().includes(term) || (p.sku ?? '').toLowerCase().includes(term);
  });

  function handleDelete(id) {
    pedirConfirmacao({
      title: 'Excluir produto',
      message: 'Excluir este produto?',
      confirmLabel: 'Excluir',
      tone: 'danger',
      execute: () => executarDelete(id),
    });
  }

  async function executarDelete(id) {
    try {
      await excluirProduto(id);
      setProdutos(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      toast.error(err.message);
    }
  }

  function openCreateModal() {
    setModalMode('create');
    setEditingProduto(null);
    setModalOpen(true);
  }

  function openEditModal(produto) {
    setModalMode('edit');
    setEditingProduto(produto);
    setModalOpen(true);
  }

  function handleSaved(produtoSalvo) {
    setProdutos(prev => {
      if (modalMode === 'create') return [produtoSalvo, ...prev];
      return prev.map(p => (p.id === produtoSalvo.id ? produtoSalvo : p));
    });
    setModalOpen(false);
    toast.success(modalMode === 'create' ? 'Produto criado com sucesso.' : 'Produto atualizado com sucesso.');
  }

  function openCategorizarModal(produto) {
    setCategorizandoProduto(produto);
    setCategorizarModalOpen(true);
  }

  function handleCategorizado(produtoSalvo) {
    setProdutos(prev => prev.map(p => (p.id === produtoSalvo.id ? produtoSalvo : p)));
    setCategorizarModalOpen(false);
    toast.success('Categorias atualizadas com sucesso.');
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Produtos</h1>
          <p className="page-subtitle">{produtos.length} produtos cadastrados</p>
        </div>
        {podeGerenciar && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} />
            Novo Produto
          </button>
        )}
      </div>

      <div className="produtos-toolbar">
        <div className="input-icon-wrapper produtos-search">
          <Search size={16} className="input-icon" />
          <input
            type="text"
            className="input-field"
            placeholder="Buscar produto ou SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading && (
        <div className="empty-state">
          <p className="text-sm text-secondary">Carregando produtos...</p>
        </div>
      )}

      {!loading && error && (
        <div className="empty-state">
          <div className="empty-state-title">Não foi possível carregar os produtos</div>
          <p className="text-sm text-secondary">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Product list */}
          <div className="produtos-list" role="list">
            {filtered.map(p => (
              <ProductRow
                key={p.id}
                product={{
                  id: p.id,
                  name: p.nome,
                  sku: p.sku,
                  semSku: !temSku(p),
                  price: p.preco_venda,
                  stock: p.estoque_atual,
                  unidade: p.unidade,
                  imageUrl: p.imagem_url || p.foto_url || p.imagem || p.foto || null,
                  categorias: p.categorias,
                }}
                actions={(podeGerenciar || podeGerenciarPrecos || podeCategorizar) ? (
                  <div className="produto-actions">
                    {podeGerenciarPrecos && (
                      <button
                        className="produto-action-btn"
                        aria-label="Precificação por canal"
                        title="Precificação por canal"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/produtos/${p.id}/precos`, { state: { nome: p.nome, sku: p.sku, custo: p.custo } });
                        }}
                      >
                        <DollarSign size={14} />
                      </button>
                    )}
                    {podeCategorizar && (
                      <button
                        className="produto-action-btn"
                        aria-label="Categorizar produto"
                        title="Categorizar produto"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCategorizarModal(p);
                        }}
                      >
                        <Layers size={14} />
                      </button>
                    )}
                    {podeGerenciar && (
                      <>
                        <button
                          className="produto-action-btn"
                          aria-label="Editar"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(p);
                          }}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          className="produto-action-btn produto-action-btn--danger"
                          aria-label="Excluir"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(p.id);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                ) : null}
              />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon"><Tag size={24} /></div>
              <div className="empty-state-title">Nenhum produto encontrado</div>
              <p className="text-sm text-secondary">Tente outra busca ou adicione um novo produto</p>
            </div>
          )}
        </>
      )}

      <ProductModal
        open={modalOpen}
        mode={modalMode}
        produto={editingProduto}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />

      <CategorizarProdutoModal
        open={categorizarModalOpen}
        produto={categorizandoProduto}
        onClose={() => setCategorizarModalOpen(false)}
        onSaved={handleCategorizado}
      />

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
