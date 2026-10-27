import { useEffect, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { listarInsumos, obterFichaVenda, salvarFichaVenda } from '../services/consumos';
import { validarFicha, montarFicha, formatarCusto } from '../utils/consumos';
import './ProductModal.css';

// Ficha de venda: insumos baixados automaticamente a cada venda do produto.
// Salvar cria uma nova versão da ficha; vendas antigas mantêm a versão que usaram.
export default function FichaVendaModal({ open, produto, onClose, onSaved }) {
  const [insumos, setInsumos] = useState([]);
  const [itens, setItens] = useState([]);
  const [ficha, setFicha] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !produto) return undefined;
    let cancelado = false;
    setLoading(true);
    setError('');
    Promise.all([listarInsumos(), obterFichaVenda(produto.id)])
      .then(([listaInsumos, fichaVigente]) => {
        if (cancelado) return;
        setInsumos(Array.isArray(listaInsumos) ? listaInsumos : []);
        setFicha(fichaVigente);
        setItens((fichaVigente?.itens ?? []).map(i => ({
          insumo_produto_id: String(i.insumo_produto_id),
          quantidade: String(i.quantidade),
        })));
      })
      .catch(err => { if (!cancelado) setError(err.message); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [open, produto]);

  if (!open || !produto) return null;

  function atualizar(idx, campo, valor) {
    setItens(prev => prev.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)));
  }

  async function salvar(e) {
    e.preventDefault();
    const erro = validarFicha(itens);
    if (erro) { setError(erro); return; }
    setError('');
    setSaving(true);
    try {
      await salvarFichaVenda(produto.id, montarFicha(itens));
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const custoTotal = formatarCusto(ficha?.custo_total_sku);

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && !saving && onClose()}>
      <div className="modal-panel card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Ficha de venda — {produto.nome}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar" disabled={saving}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={salvar} noValidate>
          <div className="modal-body">
            {error && <div className="modal-error">{error}</div>}
            <p className="text-sm text-secondary">
              Insumos baixados automaticamente do estoque Central a cada venda deste produto.
              Ao salvar, cria-se uma nova versão da ficha; vendas já feitas não mudam.
            </p>
            {loading ? <p>Carregando…</p> : (
              <>
                {itens.length === 0 && <p className="text-sm">Nenhum insumo na ficha.</p>}
                {itens.map((it, idx) => (
                  <div key={idx} className="ficha-linha">
                    <select
                      className="input-field"
                      aria-label={`Insumo ${idx + 1}`}
                      value={it.insumo_produto_id}
                      onChange={e => atualizar(idx, 'insumo_produto_id', e.target.value)}
                    >
                      <option value="">Escolha o insumo</option>
                      {insumos.map(i => (
                        <option key={i.id} value={i.id}>{i.sku ? `${i.sku} — ` : ''}{i.nome}</option>
                      ))}
                    </select>
                    <input
                      type="number" min="1" step="1" className="input-field ficha-qtd"
                      aria-label={`Quantidade ${idx + 1}`}
                      value={it.quantidade}
                      onChange={e => atualizar(idx, 'quantidade', e.target.value)}
                    />
                    <button
                      type="button" className="produto-action-btn produto-action-btn--danger"
                      aria-label="Remover insumo" title="Remover insumo"
                      onClick={() => setItens(prev => prev.filter((_, i) => i !== idx))}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button" className="btn btn-secondary"
                  onClick={() => setItens(prev => [...prev, { insumo_produto_id: '', quantidade: '1' }])}
                >
                  <Plus size={14} /> Adicionar insumo
                </button>
                {custoTotal && (
                  <p className="text-sm">
                    Custo total do SKU (item + insumos, ficha vigente): <strong>{custoTotal}</strong>
                  </p>
                )}
              </>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving || loading}>
              {saving ? 'Salvando…' : 'Salvar ficha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
