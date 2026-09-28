import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { listarCategorias } from '../services/categorias';
import { listarNiveisCategoria } from '../services/niveisCategoria';
import { categorizarProduto } from '../services/produtos';
import { useConfirmarFechamentoModal } from '../hooks/useConfirmarFechamentoModal';
import { formularioAlterado } from '../utils/formularioAlterado';
import ConfirmarDescarteDialog from './ConfirmarDescarteDialog';
import './ProductModal.css';

export function agruparCategoriasPorNivel(categorias) {
  const porNivel = new Map();
  for (const categoria of categorias) {
    if (!porNivel.has(categoria.nivel)) porNivel.set(categoria.nivel, []);
    porNivel.get(categoria.nivel).push(categoria);
  }
  return [...porNivel.entries()]
    .sort(([a], [b]) => a - b)
    .map(([nivel, itens]) => ({ nivel, categorias: itens }));
}

export function rotuloNivel(nivel, niveis) {
  const encontrado = niveis.find(n => n.nivel === nivel);
  return encontrado?.nome || `Nível ${nivel}`;
}

export function selecaoInicial(categoriasDoProduto = []) {
  const selecao = {};
  for (const categoria of categoriasDoProduto ?? []) {
    selecao[categoria.nivel] = categoria.id;
  }
  return selecao;
}

export function montarCategoriaIds(selecao) {
  return Object.values(selecao).filter(id => id != null);
}

export default function CategorizarProdutoModal({ open, produto, onClose, onSaved }) {
  const [categorias, setCategorias] = useState([]);
  const [niveis, setNiveis] = useState([]);
  const [selecao, setSelecao] = useState({});
  const [selecaoInicialCarregada, setSelecaoInicialCarregada] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [categoriasResp, niveisResp] = await Promise.all([
          listarCategorias({ page: 1, pageSize: 100 }),
          listarNiveisCategoria(),
        ]);
        if (cancelled) return;
        setCategorias(categoriasResp.items);
        setNiveis(niveisResp);
        const inicial = selecaoInicial(produto?.categorias);
        setSelecao(inicial);
        setSelecaoInicialCarregada(inicial);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [open, produto]);

  // Issue #42: nunca fechar silenciosamente (clique fora, ESC, X ou
  // Cancelar) com seleção de categoria alterada e não salva. O snapshot só
  // fica pronto depois do carregamento assíncrono acima — antes disso
  // `selecao` e `selecaoInicialCarregada` são o mesmo `{}`, então isDirty
  // é falso enquanto carrega.
  const isDirty = formularioAlterado(selecao, selecaoInicialCarregada);
  const { confirmando, solicitarFechamento, confirmarDescarte, continuarEditando } =
    useConfirmarFechamentoModal({ open, isDirty, onClose });

  if (!open) return null;

  function tentarFechar() {
    if (saving) return;
    solicitarFechamento();
  }

  const grupos = agruparCategoriasPorNivel(categorias);
  const jaTemSku = produto?.sku != null;

  function updateSelecao(nivel, value) {
    setSelecao(prev => ({ ...prev, [nivel]: value === '' ? null : Number(value) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const categoriaIds = montarCategoriaIds(selecao);
      const produtoSalvo = await categorizarProduto(produto.id, categoriaIds);
      onSaved(produtoSalvo);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={tentarFechar}>
      <div className="modal-panel card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Categorizar produto</h2>
          <button type="button" className="modal-close" onClick={tentarFechar} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {error && <div className="modal-error">{error}</div>}

            {jaTemSku ? (
              <p className="modal-warning">
                Este produto já tem SKU (<strong>{produto.sku}</strong>). Alterar as categorias não muda o SKU já gerado.
              </p>
            ) : (
              <p className="modal-warning">
                O SKU será gerado a partir da combinação de categorias escolhida e não poderá ser alterado depois.
              </p>
            )}

            {loading && <p className="text-sm text-secondary">Carregando categorias...</p>}

            {!loading && grupos.length === 0 && (
              <p className="text-sm text-secondary">
                Nenhuma categoria cadastrada ainda. Um admin pode cadastrar categorias em Configurações → Categorias de produto.
              </p>
            )}

            {!loading && grupos.map(({ nivel, categorias: categoriasDoNivel }) => (
              <div className="input-wrapper" key={nivel} style={{ marginBottom: 'var(--space-3)' }}>
                <label className="input-label" htmlFor={`cpm-nivel-${nivel}`}>{rotuloNivel(nivel, niveis)}</label>
                <select
                  id={`cpm-nivel-${nivel}`}
                  className="input-field"
                  value={selecao[nivel] ?? ''}
                  onChange={e => updateSelecao(nivel, e.target.value)}
                >
                  <option value="">Nenhuma</option>
                  {categoriasDoNivel.map(c => (
                    <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={tentarFechar} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || loading}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>

        {confirmando && (
          <ConfirmarDescarteDialog onContinuar={continuarEditando} onDescartar={confirmarDescarte} />
        )}
      </div>
    </div>
  );
}
