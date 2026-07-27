import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { criarProduto, atualizarProduto } from '../services/produtos';
import './ProductModal.css';

const EMPTY_FORM = {
  sku: '',
  nome: '',
  descricao: '',
  categoria: '',
  preco_venda: '',
  custo: '',
  estoque_atual: '',
  estoque_minimo: '',
  ativo: true,
};

function formFromProduto(produto) {
  if (!produto) return EMPTY_FORM;
  return {
    sku: produto.sku ?? '',
    nome: produto.nome ?? '',
    descricao: produto.descricao ?? '',
    categoria: produto.categoria ?? '',
    preco_venda: produto.preco_venda ?? '',
    custo: produto.custo ?? '',
    estoque_atual: produto.estoque_atual ?? '',
    estoque_minimo: produto.estoque_minimo ?? '',
    ativo: produto.ativo ?? true,
  };
}

function validar(form, mode) {
  if (!form.sku.trim()) return 'SKU é obrigatório';
  if (!form.nome.trim()) return 'Nome é obrigatório';

  const preco = Number(form.preco_venda);
  if (form.preco_venda === '' || Number.isNaN(preco) || preco <= 0) {
    return 'Preço de venda deve ser maior que zero';
  }

  const custo = Number(form.custo);
  if (form.custo === '' || Number.isNaN(custo) || custo <= 0) {
    return 'Custo deve ser maior que zero';
  }

  if (mode === 'create' && form.estoque_atual !== '') {
    const estoqueAtual = Number(form.estoque_atual);
    if (!Number.isInteger(estoqueAtual) || estoqueAtual < 0) {
      return 'Estoque atual inválido';
    }
  }

  if (form.estoque_minimo !== '') {
    const estoqueMinimo = Number(form.estoque_minimo);
    if (!Number.isInteger(estoqueMinimo) || estoqueMinimo < 0) {
      return 'Estoque mínimo inválido';
    }
  }

  return '';
}

function montarPayload(form, mode) {
  const payload = {
    sku: form.sku.trim(),
    nome: form.nome.trim(),
    descricao: form.descricao.trim(),
    categoria: form.categoria.trim(),
    preco_venda: Number(form.preco_venda),
    custo: Number(form.custo),
    estoque_minimo: form.estoque_minimo === '' ? undefined : Number(form.estoque_minimo),
    ativo: form.ativo,
  };

  if (mode === 'create') {
    payload.estoque_atual = form.estoque_atual === '' ? undefined : Number(form.estoque_atual);
  }

  return payload;
}

export default function ProductModal({ open, mode = 'create', produto, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(formFromProduto(produto));
      setError('');
      setSaving(false);
    }
  }, [open, produto]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const validationError = validar(form, mode);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSaving(true);
    try {
      const payload = montarPayload(form, mode);
      const produtoSalvo = mode === 'create'
        ? await criarProduto(payload)
        : await atualizarProduto(produto.id, payload);
      onSaved(produtoSalvo);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{mode === 'create' ? 'Novo Produto' : 'Editar Produto'}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {error && <div className="modal-error">{error}</div>}

            <div className="modal-form-grid">
              <div className="input-wrapper">
                <label className="input-label" htmlFor="pm-sku">SKU *</label>
                <input
                  id="pm-sku"
                  type="text"
                  className="input-field"
                  value={form.sku}
                  onChange={e => updateField('sku', e.target.value)}
                />
              </div>

              <div className="input-wrapper">
                <label className="input-label" htmlFor="pm-nome">Nome *</label>
                <input
                  id="pm-nome"
                  type="text"
                  className="input-field"
                  value={form.nome}
                  onChange={e => updateField('nome', e.target.value)}
                />
              </div>

              <div className="input-wrapper modal-form-span-2">
                <label className="input-label" htmlFor="pm-descricao">Descrição</label>
                <input
                  id="pm-descricao"
                  type="text"
                  className="input-field"
                  value={form.descricao}
                  onChange={e => updateField('descricao', e.target.value)}
                />
              </div>

              <div className="input-wrapper">
                <label className="input-label" htmlFor="pm-categoria">Categoria</label>
                <input
                  id="pm-categoria"
                  type="text"
                  className="input-field"
                  value={form.categoria}
                  onChange={e => updateField('categoria', e.target.value)}
                />
              </div>

              <div className="input-wrapper">
                <label className="input-label" htmlFor="pm-preco">Preço de venda *</label>
                <input
                  id="pm-preco"
                  type="number"
                  min="0"
                  step="0.01"
                  className="input-field"
                  value={form.preco_venda}
                  onChange={e => updateField('preco_venda', e.target.value)}
                />
              </div>

              <div className="input-wrapper">
                <label className="input-label" htmlFor="pm-custo">Custo *</label>
                <input
                  id="pm-custo"
                  type="number"
                  min="0"
                  step="0.01"
                  className="input-field"
                  value={form.custo}
                  onChange={e => updateField('custo', e.target.value)}
                />
              </div>

              {mode === 'create' ? (
                <div className="input-wrapper">
                  <label className="input-label" htmlFor="pm-estoque-atual">Estoque inicial</label>
                  <input
                    id="pm-estoque-atual"
                    type="number"
                    min="0"
                    step="1"
                    className="input-field"
                    value={form.estoque_atual}
                    onChange={e => updateField('estoque_atual', e.target.value)}
                  />
                </div>
              ) : (
                <div className="input-wrapper">
                  <label className="input-label" htmlFor="pm-estoque-atual">Estoque atual</label>
                  <input
                    id="pm-estoque-atual"
                    type="number"
                    className="input-field"
                    value={produto?.estoque_atual ?? 0}
                    disabled
                  />
                  <span className="modal-field-hint">Ajuste o estoque pela tela de Estoque</span>
                </div>
              )}

              <div className="input-wrapper">
                <label className="input-label" htmlFor="pm-estoque-minimo">Estoque mínimo</label>
                <input
                  id="pm-estoque-minimo"
                  type="number"
                  min="0"
                  step="1"
                  className="input-field"
                  value={form.estoque_minimo}
                  onChange={e => updateField('estoque_minimo', e.target.value)}
                />
              </div>

              <label className="modal-checkbox-wrapper">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={e => updateField('ativo', e.target.checked)}
                />
                Produto ativo
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
