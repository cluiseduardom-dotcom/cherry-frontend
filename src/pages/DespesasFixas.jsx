import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Power, Receipt } from 'lucide-react';
import { listarDespesasFixas, removerDespesaFixa, alternarAtivoDespesaFixa } from '../services/despesasFixas';
import { obterConfiguracaoFinanceira, atualizarConfiguracaoFinanceira } from '../services/configuracoesFinanceiras';
import DespesaFixaModal from '../components/DespesaFixaModal';
import './Contas.css';
import './DespesasFixas.css';

const CATEGORIA_LABEL = { estrutural: 'Estrutural', pessoal: 'Pessoal', administrativa: 'Administrativa' };
const CATEGORIA_ORDEM = ['estrutural', 'pessoal', 'administrativa'];

function formatCurrency(value) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function DespesasFixas() {
  const [despesas, setDespesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [workingId, setWorkingId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingDespesa, setEditingDespesa] = useState(null);

  const [aliquota, setAliquota] = useState('');
  const [aliquotaLoading, setAliquotaLoading] = useState(true);
  const [aliquotaSaving, setAliquotaSaving] = useState(false);
  const [aliquotaError, setAliquotaError] = useState('');
  const [aliquotaSuccess, setAliquotaSuccess] = useState('');

  useEffect(() => {
    loadDespesas();
    loadConfiguracao();
  }, []);

  async function loadDespesas() {
    setLoading(true);
    setError('');
    try {
      const data = await listarDespesasFixas();
      setDespesas(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadConfiguracao() {
    setAliquotaLoading(true);
    setAliquotaError('');
    try {
      const configuracao = await obterConfiguracaoFinanceira();
      setAliquota(String(Number(configuracao.aliquota_imposto) * 100));
    } catch (err) {
      setAliquotaError(err.message);
    } finally {
      setAliquotaLoading(false);
    }
  }

  function openCreateModal() {
    setModalMode('create');
    setEditingDespesa(null);
    setModalOpen(true);
  }

  function openEditModal(despesa) {
    setModalMode('edit');
    setEditingDespesa(despesa);
    setModalOpen(true);
  }

  function handleSaved(despesaSalva) {
    setDespesas(prev => {
      if (modalMode === 'create') return [...prev, despesaSalva];
      return prev.map(d => (d.id === despesaSalva.id ? despesaSalva : d));
    });
    setModalOpen(false);
    setActionSuccess(modalMode === 'create' ? 'Despesa fixa criada com sucesso.' : 'Despesa fixa atualizada com sucesso.');
    setTimeout(() => setActionSuccess(''), 4000);
  }

  async function handleToggle(despesa) {
    setActionError('');
    setWorkingId(despesa.id);
    try {
      const atualizada = await alternarAtivoDespesaFixa(despesa.id);
      setDespesas(prev => prev.map(d => (d.id === atualizada.id ? atualizada : d)));
    } catch (err) {
      setActionError(err.message);
    } finally {
      setWorkingId(null);
    }
  }

  async function handleRemover(despesa) {
    if (!window.confirm(`Excluir a despesa "${despesa.descricao}"?`)) return;

    setActionError('');
    setWorkingId(despesa.id);
    try {
      await removerDespesaFixa(despesa.id);
      setDespesas(prev => prev.filter(d => d.id !== despesa.id));
      setActionSuccess('Despesa fixa excluída.');
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setWorkingId(null);
    }
  }

  async function handleSalvarAliquota(e) {
    e.preventDefault();

    const percentual = Number(aliquota);
    if (aliquota === '' || Number.isNaN(percentual) || percentual < 0 || percentual > 100) {
      setAliquotaError('Alíquota deve estar entre 0% e 100%');
      return;
    }

    setAliquotaError('');
    setAliquotaSaving(true);
    try {
      const configuracao = await atualizarConfiguracaoFinanceira(percentual / 100);
      setAliquota(String(Number(configuracao.aliquota_imposto) * 100));
      setAliquotaSuccess('Alíquota de imposto atualizada.');
      setTimeout(() => setAliquotaSuccess(''), 4000);
    } catch (err) {
      setAliquotaError(err.message);
    } finally {
      setAliquotaSaving(false);
    }
  }

  const grupos = CATEGORIA_ORDEM
    .map(categoria => ({ categoria, itens: despesas.filter(d => d.categoria === categoria) }))
    .filter(g => g.itens.length > 0);

  const totalAtivas = despesas.filter(d => d.ativo).reduce((soma, d) => soma + Number(d.valor), 0);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Despesas Fixas</h1>
          <p className="page-subtitle">{formatCurrency(totalAtivas)} em despesas ativas por mês</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={16} />
          Nova Despesa
        </button>
      </div>

      <div className="card card-padding despesas-fixas-aliquota">
        <div className="despesas-fixas-aliquota-header">
          <Receipt size={18} strokeWidth={2} />
          <h2 className="despesas-fixas-aliquota-title">Alíquota de Imposto</h2>
        </div>
        <p className="text-sm text-secondary">
          Usada no cálculo do Ponto de Equilíbrio para estimar os impostos sobre a receita do período.
        </p>
        {aliquotaError && <div className="modal-error">{aliquotaError}</div>}
        {aliquotaSuccess && (
          <p className="text-sm" style={{ color: 'var(--color-success)' }}>{aliquotaSuccess}</p>
        )}
        <form className="despesas-fixas-aliquota-form" onSubmit={handleSalvarAliquota}>
          <div className="input-wrapper">
            <label className="input-label" htmlFor="aliquota-imposto">Alíquota (%)</label>
            <input
              id="aliquota-imposto"
              type="number"
              min="0"
              max="100"
              step="0.01"
              className="input-field"
              value={aliquota}
              disabled={aliquotaLoading}
              onChange={e => setAliquota(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary" disabled={aliquotaSaving || aliquotaLoading}>
            {aliquotaSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
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
          <p className="text-sm text-secondary">Carregando despesas fixas...</p>
        </div>
      )}

      {!loading && error && (
        <div className="empty-state">
          <div className="empty-state-title">Não foi possível carregar as despesas fixas</div>
          <p className="text-sm text-secondary">{error}</p>
        </div>
      )}

      {!loading && !error && grupos.map(({ categoria, itens }) => (
        <div key={categoria} className="card despesas-fixas-grupo">
          <div className="despesas-fixas-grupo-header">
            <h2 className="despesas-fixas-grupo-title">{CATEGORIA_LABEL[categoria]}</h2>
          </div>
          <table className="contas-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {itens.map(despesa => (
                <tr key={despesa.id} className="contas-row">
                  <td className="contas-descricao">{despesa.descricao}</td>
                  <td className="contas-valor">{formatCurrency(despesa.valor)}</td>
                  <td>
                    <span className={`badge ${despesa.ativo ? 'badge-success' : 'badge-danger'}`}>
                      {despesa.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td>
                    <div className="contas-actions">
                      <button
                        className="contas-action-btn"
                        aria-label="Editar"
                        title="Editar"
                        disabled={workingId === despesa.id}
                        onClick={() => openEditModal(despesa)}
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        className="contas-action-btn"
                        aria-label={despesa.ativo ? 'Desativar' : 'Ativar'}
                        title={despesa.ativo ? 'Desativar' : 'Ativar'}
                        disabled={workingId === despesa.id}
                        onClick={() => handleToggle(despesa)}
                      >
                        <Power size={14} />
                      </button>
                      <button
                        className="contas-action-btn contas-action-btn--danger"
                        aria-label="Excluir"
                        title="Excluir"
                        disabled={workingId === despesa.id}
                        onClick={() => handleRemover(despesa)}
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

      {!loading && !error && grupos.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon"><Receipt size={24} /></div>
          <div className="empty-state-title">Nenhuma despesa fixa cadastrada</div>
        </div>
      )}

      <DespesaFixaModal
        open={modalOpen}
        mode={modalMode}
        despesa={editingDespesa}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
