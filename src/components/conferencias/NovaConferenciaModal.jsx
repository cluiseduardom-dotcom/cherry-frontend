import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { criarConferencia } from '../../services/conferenciasEstoque';
import { saldosDoLocal } from '../../services/locaisEstoque';
import { rotuloDoLocal } from '../../utils/locaisEstoque';
import {
  FORM_CONFERENCIA_VAZIO, diferencaDaContagem, itensContados, contagemValida,
  resumoDaConferencia, rotuloDaDiferenca, validarConferencia,
} from '../../utils/conferencias';
import { useConfirmarFechamentoModal } from '../../hooks/useConfirmarFechamentoModal';
import { formularioAlterado } from '../../utils/formularioAlterado';
import ConfirmarDescarteDialog from '../ConfirmarDescarteDialog';
import '../ProductModal.css';
import '../usuarios/CamposFormulario.css';
import './Conferencias.css';

// Equipe conta fisicamente os produtos do local; o sistema compara com o saldo. Sem ajuste o
// estoque não muda (só registra). Só o admin pode pedir `aplicar_ajuste`, e isso exige uma
// segunda confirmação porque altera o saldo do local. O backend valida tudo de novo.
export default function NovaConferenciaModal({ open, local, admin, onClose, onSaved }) {
  const [form, setForm] = useState(FORM_CONFERENCIA_VAZIO);
  const [saldos, setSaldos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmandoAjuste, setConfirmandoAjuste] = useState(false);

  useEffect(() => {
    if (!open || !local) return undefined;

    let cancelado = false;
    setForm(FORM_CONFERENCIA_VAZIO);
    setSaldos([]);
    setErro('');
    setSaving(false);
    setConfirmandoAjuste(false);
    setCarregando(true);
    saldosDoLocal(local.id)
      .then(dados => { if (!cancelado) setSaldos(dados.items); })
      .catch(err => { if (!cancelado) setErro(err?.message || 'Não foi possível carregar os produtos do local.'); })
      .finally(() => { if (!cancelado) setCarregando(false); });

    return () => { cancelado = true; };
  }, [open, local]);

  const isDirty = formularioAlterado(form, FORM_CONFERENCIA_VAZIO);
  const { confirmando, solicitarFechamento, confirmarDescarte, continuarEditando } =
    useConfirmarFechamentoModal({ open, isDirty, onClose });

  const resumo = useMemo(() => resumoDaConferencia(saldos, form.contagens), [saldos, form.contagens]);

  if (!open || !local) return null;

  function tentarFechar() {
    if (saving) return;
    solicitarFechamento();
  }

  function mudarContagem(produtoId, valor) {
    setForm(prev => ({ ...prev, contagens: { ...prev.contagens, [produtoId]: valor } }));
    setConfirmandoAjuste(false);
    setErro('');
  }

  async function enviar() {
    setSaving(true);
    setErro('');
    try {
      const validacao = validarConferencia(saldos, form, { admin });
      if (!validacao.valido) {
        setErro(validacao.erro);
        setSaving(false);
        return;
      }
      const criada = await criarConferencia(local.id, validacao.dados);
      onSaved(criada, validacao.dados.aplicar_ajuste === true);
    } catch (err) {
      setErro(err?.message || 'Falha ao registrar a conferência.');
      setSaving(false);
      setConfirmandoAjuste(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;

    const validacao = validarConferencia(saldos, form, { admin });
    if (!validacao.valido) {
      setErro(validacao.erro);
      return;
    }

    // Ajuste altera o saldo do local: pede confirmação explícita antes de enviar.
    if (form.aplicarAjuste && resumo.comDiferenca > 0 && !confirmandoAjuste) {
      setConfirmandoAjuste(true);
      return;
    }

    enviar();
  }

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && tentarFechar()}>
      <div className="modal-panel card conf-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="nova-conf-titulo">
        <div className="modal-header">
          <h2 className="modal-title" id="nova-conf-titulo">Conferência — {rotuloDoLocal(local)}</h2>
          <button type="button" className="modal-close" onClick={tentarFechar} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {erro && <div className="modal-error" role="alert">{erro}</div>}

            <p className="modal-field-hint">
              Digite a quantidade contada de cada produto. Deixe em branco o que não foi contado.
              Só são listados produtos com saldo no sistema.
            </p>

            {carregando && <p className="text-sm text-secondary">Carregando produtos...</p>}
            {!carregando && saldos.length === 0 && !erro && (
              <p className="text-sm text-secondary">Este local não tem produtos com saldo para conferir.</p>
            )}

            {saldos.length > 0 && (
              <ul className="conf-lista">
                {saldos.map(s => {
                  const valor = form.contagens[s.produto_id] ?? '';
                  const dif = contagemValida(valor) ? diferencaDaContagem(s.saldo, valor) : null;
                  return (
                    <li key={s.produto_id} className="conf-linha">
                      <span className="conf-linha-nome">{s.nome}{s.sku ? ` (${s.sku})` : ''}</span>
                      <span className="conf-linha-saldo">sistema: {s.saldo}</span>
                      <input
                        type="number" min="0" step="1" inputMode="numeric" className="input-field conf-linha-qtd"
                        aria-label={`Quantidade contada de ${s.nome}`} value={valor} disabled={saving}
                        onChange={e => mudarContagem(s.produto_id, e.target.value)}
                      />
                      <span className={`conf-linha-dif ${dif > 0 ? 'conf-sobra' : dif < 0 ? 'conf-falta' : ''}`}>
                        {dif === null ? '' : rotuloDaDiferenca(dif)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            {itensContados(saldos, form.contagens).length > 0 && (
              <p className="conf-resumo">
                {resumo.contados} contado(s) · {resumo.comDiferenca} com diferença · sobra {resumo.sobra} · falta {resumo.falta}
              </p>
            )}

            <div className="input-wrapper">
              <label className="input-label" htmlFor="conf-obs">Observação (opcional)</label>
              <input id="conf-obs" type="text" className="input-field" maxLength={500} value={form.observacao} disabled={saving}
                onChange={e => setForm(prev => ({ ...prev, observacao: e.target.value }))} />
            </div>

            {admin && (
              <label className="conf-ajuste">
                <input type="checkbox" checked={form.aplicarAjuste} disabled={saving}
                  onChange={e => { setForm(prev => ({ ...prev, aplicarAjuste: e.target.checked })); setConfirmandoAjuste(false); }} />
                <span>
                  <strong>Aplicar ajuste ao estoque</strong><br />
                  <span className="modal-field-hint">O saldo do sistema passa a ser o contado nos produtos com diferença. Sem marcar, a conferência só fica registrada.</span>
                </span>
              </label>
            )}

            {confirmandoAjuste && (
              <div className="conf-aviso" role="alertdialog" aria-label="Confirmar ajuste de estoque">
                O estoque de {resumo.comDiferenca} produto(s) em "{rotuloDoLocal(local)}" será alterado
                (sobra {resumo.sobra}, falta {resumo.falta}). A conferência fica registrada e não pode ser desfeita.
                <div className="conf-aviso-acoes">
                  <button type="button" className="btn btn-ghost" onClick={() => setConfirmandoAjuste(false)} disabled={saving}>Voltar</button>
                  <button type="button" className="btn btn-primary" onClick={enviar} disabled={saving}>
                    {saving ? 'Aplicando...' : 'Confirmar ajuste'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={tentarFechar} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving || carregando || confirmandoAjuste}>
              {saving ? 'Registrando...' : form.aplicarAjuste ? 'Registrar e ajustar' : 'Registrar conferência'}
            </button>
          </div>
        </form>

        {confirmando && <ConfirmarDescarteDialog onContinuar={continuarEditando} onDescartar={confirmarDescarte} />}
      </div>
    </div>
  );
}
