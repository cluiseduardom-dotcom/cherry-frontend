import { useState } from 'react';
import { X } from 'lucide-react';
import {
  trocarPlanoEmpresa, definirCondicaoEmpresa, encerrarCondicaoEmpresa,
} from '../services/plataforma';
import {
  hojeBrasilia, formatarPercentual, descreverEfeito,
  validarTrocaPlano, validarCondicao, validarEncerrarCondicao,
} from '../utils/plataforma';
import ConfirmDialog from './ConfirmDialog';
import './ProductModal.css';

const TITULOS = {
  plano: 'Alterar plano',
  condicao: 'Definir exceção de taxa',
  encerrar: 'Encerrar exceção de taxa',
};

const FORM_INICIAL = {
  plano: { plano: '', vigencia_inicio: '', justificativa: '' },
  condicao: { percentual: '', vigencia_inicio: '', vigencia_fim: '', justificativa: '' },
  encerrar: { a_partir_de: '', justificativa: '' },
};

// Alterar plano / definir ou encerrar a exceção de uma empresa. A mudança só é enviada depois de um
// diálogo de confirmação que descreve o efeito. O responsável é gravado pelo backend (usuário logado).
export default function PlataformaComercialModal({ modo, empresa, planos, onClose, onSaved }) {
  const hoje = hojeBrasilia();
  const [form, setForm] = useState(FORM_INICIAL[modo]);
  const [erros, setErros] = useState({});
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendente, setPendente] = useState(null);

  function tentarFechar() {
    if (!saving) onClose();
  }

  function atualizar(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }));
    if (erros[campo]) setErros(prev => ({ ...prev, [campo]: undefined }));
    if (apiError) setApiError('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;

    const validacao = modo === 'plano' ? validarTrocaPlano(form, hoje)
      : modo === 'condicao' ? validarCondicao(form, hoje)
        : validarEncerrarCondicao(form, hoje);

    if (!validacao.valido) {
      setErros(validacao.erros);
      return;
    }

    const planoEscolhido = planos.find(p => p.codigo === form.plano);
    setPendente({
      corpo: validacao.corpo,
      mensagem: descreverEfeito({
        acao: modo,
        empresa: empresa.empresa_nome,
        planoNome: planoEscolhido?.nome,
        percentual: validacao.corpo.percentual,
        inicio: validacao.corpo.vigencia_inicio ?? validacao.corpo.a_partir_de,
        hoje,
      }),
    });
  }

  async function confirmar() {
    const { corpo } = pendente;
    setPendente(null);
    setSaving(true);
    setApiError('');
    try {
      if (modo === 'plano') await trocarPlanoEmpresa(empresa.empresa_id, corpo);
      else if (modo === 'condicao') await definirCondicaoEmpresa(empresa.empresa_id, corpo);
      else await encerrarCondicaoEmpresa(empresa.empresa_id, corpo);
      onSaved(modo);
    } catch (err) {
      setApiError(err?.message || 'Não foi possível salvar a alteração.');
      setSaving(false);
    }
  }

  const planosAtivos = planos.filter(p => p.ativo && p.percentual !== null);

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && tentarFechar()}>
      <div className="modal-panel card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="pc-titulo">
        <div className="modal-header">
          <h2 className="modal-title" id="pc-titulo">{TITULOS[modo]} · {empresa.empresa_nome}</h2>
          <button type="button" className="modal-close" onClick={tentarFechar} aria-label="Fechar"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {apiError && <div className="modal-error" role="alert">{apiError}</div>}

            <div className="modal-form-grid">
              {modo === 'plano' && (
                <div className="input-wrapper modal-form-span-2">
                  <label className="input-label" htmlFor="pc-plano">Plano *</label>
                  <select
                    id="pc-plano"
                    className={`input-field${erros.plano ? ' input-field--erro' : ''}`}
                    value={form.plano}
                    onChange={e => atualizar('plano', e.target.value)}
                    disabled={saving}
                  >
                    <option value="">Selecione o plano</option>
                    {planosAtivos.map(p => (
                      <option key={p.codigo} value={p.codigo}>
                        {p.nome} — {formatarPercentual(p.percentual)} sobre o Pix{p.tem_mensalidade ? '' : ' (sem mensalidade)'}
                      </option>
                    ))}
                  </select>
                  {erros.plano && <span className="campo-erro">{erros.plano}</span>}
                </div>
              )}

              {modo === 'condicao' && (
                <div className="input-wrapper modal-form-span-2">
                  <label className="input-label" htmlFor="pc-percentual">Percentual sobre o Pix (%) *</label>
                  <input
                    id="pc-percentual"
                    type="text"
                    inputMode="decimal"
                    className={`input-field${erros.percentual ? ' input-field--erro' : ''}`}
                    placeholder="Ex.: 0,5 (use 0 para isentar)"
                    value={form.percentual}
                    onChange={e => atualizar('percentual', e.target.value)}
                    disabled={saving}
                  />
                  {erros.percentual && <span className="campo-erro">{erros.percentual}</span>}
                </div>
              )}

              {modo !== 'encerrar' && (
                <div className="input-wrapper">
                  <label className="input-label" htmlFor="pc-inicio">Início da vigência</label>
                  <input
                    id="pc-inicio"
                    type="date"
                    min={hoje}
                    className={`input-field${erros.vigencia_inicio ? ' input-field--erro' : ''}`}
                    value={form.vigencia_inicio}
                    onChange={e => atualizar('vigencia_inicio', e.target.value)}
                    disabled={saving}
                  />
                  <span className="modal-field-hint">Em branco: a partir de hoje.</span>
                  {erros.vigencia_inicio && <span className="campo-erro">{erros.vigencia_inicio}</span>}
                </div>
              )}

              {modo === 'condicao' && (
                <div className="input-wrapper">
                  <label className="input-label" htmlFor="pc-fim">Fim da vigência (opcional)</label>
                  <input
                    id="pc-fim"
                    type="date"
                    min={form.vigencia_inicio || hoje}
                    className={`input-field${erros.vigencia_fim ? ' input-field--erro' : ''}`}
                    value={form.vigencia_fim}
                    onChange={e => atualizar('vigencia_fim', e.target.value)}
                    disabled={saving}
                  />
                  {erros.vigencia_fim && <span className="campo-erro">{erros.vigencia_fim}</span>}
                </div>
              )}

              {modo === 'encerrar' && (
                <div className="input-wrapper modal-form-span-2">
                  <label className="input-label" htmlFor="pc-partir">Encerrar a partir de</label>
                  <input
                    id="pc-partir"
                    type="date"
                    min={hoje}
                    className={`input-field${erros.a_partir_de ? ' input-field--erro' : ''}`}
                    value={form.a_partir_de}
                    onChange={e => atualizar('a_partir_de', e.target.value)}
                    disabled={saving}
                  />
                  <span className="modal-field-hint">Em branco: a partir de hoje.</span>
                  {erros.a_partir_de && <span className="campo-erro">{erros.a_partir_de}</span>}
                </div>
              )}

              <div className="input-wrapper modal-form-span-2">
                <label className="input-label" htmlFor="pc-justificativa">Justificativa *</label>
                <textarea
                  id="pc-justificativa"
                  className={`input-field${erros.justificativa ? ' input-field--erro' : ''}`}
                  rows={3}
                  maxLength={500}
                  placeholder="Por que esta mudança? Fica registrada junto com quem fez."
                  value={form.justificativa}
                  onChange={e => atualizar('justificativa', e.target.value)}
                  disabled={saving}
                />
                {erros.justificativa && <span className="campo-erro">{erros.justificativa}</span>}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={tentarFechar} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Continuar'}</button>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={!!pendente}
        title="Confirmar alteração"
        message={pendente?.mensagem ?? ''}
        confirmLabel="Confirmar"
        onConfirm={confirmar}
        onCancel={() => setPendente(null)}
      />
    </div>
  );
}
