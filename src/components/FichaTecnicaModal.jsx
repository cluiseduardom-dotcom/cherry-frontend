import { useEffect, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { listarInsumos } from '../services/consumos';
import { obterFichaTecnica, salvarFichaTecnica } from '../services/producao';
import { montarFichaTecnica, validarFichaTecnica } from '../utils/producao';
import './ProductModal.css';

// Ficha técnica (receita): o que UMA unidade do produto consome de insumo na produção.
// Salvar cria uma nova versão; ordens já criadas continuam presas à versão que usaram.
export default function FichaTecnicaModal({ open, produto, onClose, onSaved }) {
  const [insumos, setInsumos] = useState([]);
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !produto) return undefined;
    let cancelado = false;

    async function carregar() {
      setLoading(true);
      setError('');
      try {
        const lista = await listarInsumos();
        // 404 = produto ainda sem ficha: começa em branco (não é erro).
        const ficha = await obterFichaTecnica(produto.id).catch(err => {
          if (err?.status === 404) return null;
          throw err;
        });
        if (cancelado) return;
        setInsumos(Array.isArray(lista) ? lista : []);
        setItens((ficha?.itens ?? []).map(i => ({
          insumo_produto_id: String(i.insumo_produto_id),
          quantidade: String(i.quantidade_necessaria),
        })));
      } catch (err) {
        if (!cancelado) setError(err.message);
      } finally {
        if (!cancelado) setLoading(false);
      }
    }

    carregar();
    return () => { cancelado = true; };
  }, [open, produto]);

  if (!open || !produto) return null;

  function atualizar(indice, campo, valor) {
    setItens(anterior => anterior.map((item, i) => (i === indice ? { ...item, [campo]: valor } : item)));
  }

  async function salvar(evento) {
    evento.preventDefault();
    const erro = validarFichaTecnica(itens);
    if (erro) { setError(erro); return; }
    setError('');
    setSaving(true);
    try {
      await salvarFichaTecnica(produto.id, montarFichaTecnica(itens));
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && !saving && onClose()}>
      <div className="modal-panel card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Ficha técnica: {produto.nome}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar" disabled={saving}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={salvar} noValidate>
          <div className="modal-body">
            {error && <div className="modal-error">{error}</div>}
            <p className="text-sm text-secondary">
              Quanto de cada insumo <strong>uma unidade</strong> deste produto consome. Ao salvar, cria-se uma nova versão;
              ordens de produção já criadas não mudam.
            </p>
            {loading ? <p>Carregando…</p> : (
              <>
                {itens.length === 0 && <p className="text-sm">Nenhum insumo na ficha.</p>}
                {itens.map((item, indice) => (
                  <div key={indice} className="ficha-linha">
                    <select
                      className="input-field"
                      aria-label={`Insumo ${indice + 1}`}
                      value={item.insumo_produto_id}
                      onChange={e => atualizar(indice, 'insumo_produto_id', e.target.value)}
                    >
                      <option value="">Escolha o insumo</option>
                      {insumos.map(i => (
                        <option key={i.id} value={i.id}>{i.sku ? `${i.sku} — ` : ''}{i.nome}</option>
                      ))}
                    </select>
                    <input
                      type="number" min="1" step="1" className="input-field ficha-qtd"
                      aria-label={`Quantidade ${indice + 1}`}
                      value={item.quantidade}
                      onChange={e => atualizar(indice, 'quantidade', e.target.value)}
                    />
                    <button
                      type="button" className="produto-action-btn produto-action-btn--danger"
                      aria-label="Remover insumo" title="Remover insumo"
                      onClick={() => setItens(anterior => anterior.filter((_, i) => i !== indice))}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button" className="btn btn-secondary"
                  onClick={() => setItens(anterior => [...anterior, { insumo_produto_id: '', quantidade: '1' }])}
                >
                  <Plus size={14} /> Adicionar insumo
                </button>
                {insumos.length === 0 && (
                  <p className="text-sm text-secondary">Ainda não há insumos cadastrados. Cadastre-os em Estoque &gt; Insumos.</p>
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
