import { useEffect, useState } from 'react';
import { listarPrecosProduto, atualizarPrecoCanal } from '../services/precos';
import { formatCurrency, formatDateBR } from '../pages/relatorios/relatoriosUtils';
import { useToast } from '../context/ToastContext';
import { canalLabel, formatPercent, montarPayloadPreco, validarValorPreco } from '../utils/precoCanal';
import '../pages/PrecificacaoProduto.css';

function formFormDefaults() {
  return { modo: 'markup', valor: '', saving: false, error: '' };
}

/**
 * Cartões de preço por canal de um produto (markup ou preço direto). Cada canal salva na hora.
 * Usado pela tela de Precificação e pelo assistente de cadastro.
 * `onChange(canais)` avisa a cada preço salvo, com a lista de canais atualizada.
 */
export default function PrecosPorCanal({ produtoId, onChange }) {
  const [canais, setCanais] = useState([]);
  const [formsPorCanal, setFormsPorCanal] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;

    async function carregar() {
      setLoading(true);
      setLoadError('');
      try {
        const data = await listarPrecosProduto(produtoId);
        if (cancelled) return;
        setCanais(data);
        setFormsPorCanal(Object.fromEntries(data.map(c => [c.canal_id, formFormDefaults()])));
        onChange?.(data);
      } catch (err) {
        if (!cancelled) setLoadError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    carregar();
    return () => { cancelled = true; };
    // onChange fica fora das dependências de propósito: só recarrega quando o produto muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produtoId]);

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
      const atualizado = await atualizarPrecoCanal(produtoId, canalId, payload);
      const proximos = canais.map(c => (c.canal_id === canalId ? { ...c, ...atualizado } : c));
      setCanais(proximos);
      updateForm(canalId, { saving: false, valor: '' });
      toast.success('Preço atualizado com sucesso.');
      onChange?.(proximos);
    } catch (err) {
      updateForm(canalId, { saving: false, error: err.message });
    }
  }

  if (loading) {
    return (
      <div className="empty-state">
        <p className="text-sm text-secondary">Carregando preços...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Não foi possível carregar os preços</div>
        <p className="text-sm text-secondary">{loadError}</p>
      </div>
    );
  }

  return (
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
  );
}
