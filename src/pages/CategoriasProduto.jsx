import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, FolderTree } from 'lucide-react';
import { listarNiveisCategoria, excluirNivelCategoria } from '../services/niveisCategoria';
import { listarCategorias, excluirCategoria } from '../services/categorias';
import NivelCategoriaModal from '../components/NivelCategoriaModal';
import CategoriaProdutoModal from '../components/CategoriaProdutoModal';
import './Contas.css';
import './CategoriasProduto.css';

export default function CategoriasProduto() {
  const [niveis, setNiveis] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [workingId, setWorkingId] = useState(null);

  const [nivelModalOpen, setNivelModalOpen] = useState(false);
  const [nivelModalMode, setNivelModalMode] = useState('create');
  const [editingNivel, setEditingNivel] = useState(null);

  const [categoriaModalOpen, setCategoriaModalOpen] = useState(false);
  const [categoriaModalMode, setCategoriaModalMode] = useState('create');
  const [editingCategoria, setEditingCategoria] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [niveisData, categoriasData] = await Promise.all([
        listarNiveisCategoria(),
        listarCategorias({ page: 1, pageSize: 100 }),
      ]);
      setNiveis(niveisData);
      setCategorias(categoriasData.items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function rotuloNivel(nivel) {
    return niveis.find(n => n.nivel === nivel)?.nome || `Nível ${nivel}`;
  }

  function openCreateNivel() {
    setNivelModalMode('create');
    setEditingNivel(null);
    setNivelModalOpen(true);
  }

  function openEditNivel(nivel) {
    setNivelModalMode('edit');
    setEditingNivel(nivel);
    setNivelModalOpen(true);
  }

  function handleNivelSaved(nivelSalvo) {
    setNiveis(prev => {
      const proximos = nivelModalMode === 'create'
        ? [...prev, nivelSalvo]
        : prev.map(n => (n.id === nivelSalvo.id ? nivelSalvo : n));
      return [...proximos].sort((a, b) => a.nivel - b.nivel);
    });
    setNivelModalOpen(false);
    setActionSuccess(nivelModalMode === 'create' ? 'Nível criado com sucesso.' : 'Nível renomeado com sucesso.');
    setTimeout(() => setActionSuccess(''), 4000);
  }

  async function handleExcluirNivel(nivel) {
    if (!window.confirm(`Excluir o rótulo do nível ${nivel.nivel} (${nivel.nome})? Categorias existentes nesse nível não são afetadas.`)) return;

    setActionError('');
    setWorkingId(`nivel-${nivel.id}`);
    try {
      await excluirNivelCategoria(nivel.id);
      setNiveis(prev => prev.filter(n => n.id !== nivel.id));
      setActionSuccess('Rótulo de nível excluído.');
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setWorkingId(null);
    }
  }

  function openCreateCategoria() {
    setCategoriaModalMode('create');
    setEditingCategoria(null);
    setCategoriaModalOpen(true);
  }

  function openEditCategoria(categoria) {
    setCategoriaModalMode('edit');
    setEditingCategoria(categoria);
    setCategoriaModalOpen(true);
  }

  function handleCategoriaSaved(categoriaSalva) {
    setCategorias(prev => {
      if (categoriaModalMode === 'create') return [...prev, categoriaSalva];
      return prev.map(c => (c.id === categoriaSalva.id ? categoriaSalva : c));
    });
    setCategoriaModalOpen(false);
    setActionSuccess(categoriaModalMode === 'create' ? 'Categoria criada com sucesso.' : 'Categoria renomeada com sucesso.');
    setTimeout(() => setActionSuccess(''), 4000);
  }

  async function handleExcluirCategoria(categoria) {
    if (!window.confirm(`Excluir a categoria "${categoria.nome}"? Produtos e SKUs já existentes não são afetados.`)) return;

    setActionError('');
    setWorkingId(`categoria-${categoria.id}`);
    try {
      await excluirCategoria(categoria.id);
      setCategorias(prev => prev.filter(c => c.id !== categoria.id));
      setActionSuccess('Categoria excluída.');
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setWorkingId(null);
    }
  }

  const gruposCategorias = [...new Set(categorias.map(c => c.nivel))]
    .sort((a, b) => a - b)
    .map(nivel => ({ nivel, itens: categorias.filter(c => c.nivel === nivel) }));

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Categorias de produto</h1>
          <p className="page-subtitle">Níveis, códigos e nomes usados para gerar o SKU automaticamente</p>
        </div>
      </div>

      {actionError && (
        <p className="text-sm" style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-3)' }}>
          {actionError}
        </p>
      )}

      {actionSuccess && (
        <p className="text-sm" style={{ color: 'var(--color-success)', marginBottom: 'var(--space-3)' }}>
          {actionSuccess}
        </p>
      )}

      {loading && (
        <div className="empty-state">
          <p className="text-sm text-secondary">Carregando...</p>
        </div>
      )}

      {!loading && error && (
        <div className="empty-state">
          <div className="empty-state-title">Não foi possível carregar categorias</div>
          <p className="text-sm text-secondary">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="card categorias-produto-secao">
            <div className="categorias-produto-secao-header">
              <h2 className="categorias-produto-secao-title">Níveis</h2>
              <button className="btn btn-secondary" onClick={openCreateNivel}>
                <Plus size={16} />
                Novo nível
              </button>
            </div>
            <p className="text-sm text-secondary">
              Renomear é seguro — é só o rótulo de exibição. Excluir não afeta categorias nem SKUs já existentes.
            </p>

            {niveis.length === 0 ? (
              <p className="text-sm text-secondary">Nenhum nível nomeado ainda — categorias aparecem como "Nível N" até serem nomeadas.</p>
            ) : (
              <table className="contas-table">
                <thead>
                  <tr>
                    <th>Nível</th>
                    <th>Nome</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {niveis.map(nivel => (
                    <tr key={nivel.id} className="contas-row">
                      <td>{nivel.nivel}</td>
                      <td>{nivel.nome}</td>
                      <td>
                        <div className="contas-actions">
                          <button
                            className="contas-action-btn"
                            aria-label="Renomear"
                            title="Renomear"
                            disabled={workingId === `nivel-${nivel.id}`}
                            onClick={() => openEditNivel(nivel)}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            className="contas-action-btn contas-action-btn--danger"
                            aria-label="Excluir"
                            title="Excluir"
                            disabled={workingId === `nivel-${nivel.id}`}
                            onClick={() => handleExcluirNivel(nivel)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card categorias-produto-secao">
            <div className="categorias-produto-secao-header">
              <h2 className="categorias-produto-secao-title">Categorias</h2>
              <button className="btn btn-secondary" onClick={openCreateCategoria}>
                <Plus size={16} />
                Nova categoria
              </button>
            </div>

            {gruposCategorias.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon"><FolderTree size={24} /></div>
                <div className="empty-state-title">Nenhuma categoria cadastrada</div>
                <p className="text-sm text-secondary">Produtos sem categoria ficam sem SKU até serem categorizados.</p>
              </div>
            )}

            {gruposCategorias.map(({ nivel, itens }) => (
              <div key={nivel} className="categorias-produto-grupo">
                <h3 className="categorias-produto-grupo-title">{rotuloNivel(nivel)}</h3>
                <table className="contas-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Nome</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map(categoria => (
                      <tr key={categoria.id} className="contas-row">
                        <td>{categoria.codigo}</td>
                        <td>{categoria.nome}</td>
                        <td>
                          <div className="contas-actions">
                            <button
                              className="contas-action-btn"
                              aria-label="Renomear"
                              title="Renomear"
                              disabled={workingId === `categoria-${categoria.id}`}
                              onClick={() => openEditCategoria(categoria)}
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              className="contas-action-btn contas-action-btn--danger"
                              aria-label="Excluir"
                              title="Excluir"
                              disabled={workingId === `categoria-${categoria.id}`}
                              onClick={() => handleExcluirCategoria(categoria)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </>
      )}

      <NivelCategoriaModal
        open={nivelModalOpen}
        mode={nivelModalMode}
        nivel={editingNivel}
        onClose={() => setNivelModalOpen(false)}
        onSaved={handleNivelSaved}
      />

      <CategoriaProdutoModal
        open={categoriaModalOpen}
        mode={categoriaModalMode}
        categoria={editingCategoria}
        onClose={() => setCategoriaModalOpen(false)}
        onSaved={handleCategoriaSaved}
      />
    </div>
  );
}
