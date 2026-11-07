import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Tag, DollarSign, Edit, Trash2, Layers, Boxes } from 'lucide-react';
import { listarProdutos, excluirProduto } from '../services/produtos';
import { useAuth } from '../context/AuthContext';
import { ACTIONS, podeExecutarAcao } from '../config/access';
import ProductModal from '../components/ProductModal';
import FichaVendaModal from '../components/FichaVendaModal';
import CategorizarProdutoModal from '../components/CategorizarProdutoModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useConfirmAction } from '../hooks/useConfirmAction';
import { useToast } from '../context/ToastContext';
import { formatarMoeda } from '../utils/mascaras';
import ProductCard from '../components/ProductCard';
import { doTipo } from '../utils/tipoProduto';
import './Produtos.css';

export function temSku(produto) {
  return produto?.sku != null;
}

// `tipo` separa o catálogo: 'acabado' (Produtos) ou 'insumo' (Insumos). Insumo não é vendido nem
// precificado e não passa pela categorização de produto.
export default function Produtos({ tipo = 'acabado' }) {
  const ehInsumo = tipo === 'insumo';
  const rotuloItem = ehInsumo ? 'insumo' : 'produto';
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
  const [fichaProduto, setFichaProduto] = useState(null);
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
        if (!cancelled) setProdutos(data.items.filter(p => p.ativo && doTipo(p, tipo)));
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [tipo]);

  const filtered = produtos.filter(p => {
    const term = search.toLowerCase();
    return p.nome.toLowerCase().includes(term) || (p.sku ?? '').toLowerCase().includes(term);
  });

  function handleDelete(id) {
    pedirConfirmacao({
      title: `Excluir ${rotuloItem}`,
      message: `Excluir este ${rotuloItem}?`,
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
      // Mescla: a resposta da edição não traz categorias nem foto, que precisam continuar no card.
      return prev.map(p => (p.id === produtoSalvo.id ? { ...p, ...produtoSalvo } : p));
    });
    setModalOpen(false);
    toast.success(modalMode === 'create'
      ? (ehInsumo ? 'Insumo criado com sucesso.' : 'Produto criado com sucesso.')
      : (ehInsumo ? 'Insumo atualizado com sucesso.' : 'Produto atualizado com sucesso.'));
  }

  function handleFotosAlteradas(produtoId, imagens) {
    setProdutos(prev => prev.map(p => (p.id === produtoId ? { ...p, imagem_url: imagens[0]?.url ?? null } : p)));
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
          <h1 className="page-title">{ehInsumo ? 'Insumos' : 'Produtos'}</h1>
          <p className="page-subtitle">{produtos.length} {ehInsumo ? 'insumos cadastrados' : 'produtos cadastrados'}</p>
        </div>
        {podeGerenciar && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} />
            {ehInsumo ? 'Novo Insumo' : 'Novo Produto'}
          </button>
        )}
      </div>

      <div className="produtos-toolbar">
        <div className="input-icon-wrapper produtos-search">
          <Search size={16} className="input-icon" />
          <input
            type="text"
            className="input-field"
            placeholder={ehInsumo ? 'Buscar insumo ou SKU...' : 'Buscar produto ou SKU...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading && (
        <div className="empty-state">
          <p className="text-sm text-secondary">{ehInsumo ? 'Carregando insumos...' : 'Carregando produtos...'}</p>
        </div>
      )}

      {!loading && error && (
        <div className="empty-state">
          <div className="empty-state-title">{ehInsumo ? 'Não foi possível carregar os insumos' : 'Não foi possível carregar os produtos'}</div>
          <p className="text-sm text-secondary">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Product list */}
          <div className="produtos-list product-grid" role="list">
            {filtered.map(p => (
              <ProductCard
                key={p.id}
                ocultarEstoque
                product={{
                  id: p.id,
                  name: p.nome,
                  sku: p.sku,
                  semSku: !ehInsumo && !temSku(p),
                  price: p.preco_canal?.preco_venda ?? null,
                  stock: p.estoque_atual,
                  unidade: p.unidade,
                  imageUrl: p.imagem_url || p.foto_url || p.imagem || p.foto || null,
                  categorias: p.categorias,
                }}
                actions={(podeGerenciar || (!ehInsumo && (podeGerenciarPrecos || podeCategorizar))) ? (
                  <div className="produto-actions">
                    {!ehInsumo && podeGerenciarPrecos && (
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
                    {!ehInsumo && podeCategorizar && (
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
                    {podeGerenciar && !ehInsumo && (
                      <button
                        className="produto-action-btn"
                        aria-label="Ficha de venda"
                        title="Ficha de venda (insumos)"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFichaProduto(p);
                        }}
                      >
                        <Boxes size={14} />
                      </button>
                    )}
                    {podeGerenciar && (
                      <>
                        <button
                          className="produto-action-btn"
                          aria-label={`Editar ${rotuloItem}`}
                          title={`Editar ${rotuloItem}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(p);
                          }}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          className="produto-action-btn produto-action-btn--danger"
                          aria-label={`Excluir ${rotuloItem}`}
                          title={`Excluir ${rotuloItem}`}
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
              <div className="empty-state-title">{ehInsumo ? 'Nenhum insumo encontrado' : 'Nenhum produto encontrado'}</div>
              <p className="text-sm text-secondary">Tente outra busca ou adicione {ehInsumo ? 'um novo insumo' : 'um novo produto'}</p>
            </div>
          )}
        </>
      )}

      <FichaVendaModal
        open={fichaProduto !== null}
        produto={fichaProduto}
        onClose={() => setFichaProduto(null)}
        onSaved={() => { setFichaProduto(null); toast.success('Ficha de venda salva.'); }}
      />

      <ProductModal
        open={modalOpen}
        mode={modalMode}
        tipo={tipo}
        produto={editingProduto}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        onFotosAlteradas={handleFotosAlteradas}
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
