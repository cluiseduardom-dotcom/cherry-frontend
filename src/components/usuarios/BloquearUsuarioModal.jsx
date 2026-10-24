import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { alterarBloqueioUsuario } from '../../services/usuarios';
import { validarBloqueioUsuario, formatarCargo } from '../../utils/usuarios';
import { useConfirmarFechamentoModal } from '../../hooks/useConfirmarFechamentoModal';
import ConfirmarDescarteDialog from '../ConfirmarDescarteDialog';
import '../ProductModal.css';
import './CamposFormulario.css';

export default function BloquearUsuarioModal({ open, usuario, onClose, onSuccess }) {
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const bloqueando = Boolean(usuario?.ativo);

  useEffect(() => {
    if (open) {
      setMotivo('');
      setErro('');
      setApiError('');
      setLoading(false);
    }
  }, [open, usuario]);

  // Motivo digitado e não enviado não se perde com um clique fora.
  const isDirty = motivo.trim() !== '';
  const { confirmando, solicitarFechamento, confirmarDescarte, continuarEditando } =
    useConfirmarFechamentoModal({ open: open && Boolean(usuario), isDirty, onClose });

  if (!open || !usuario) return null;

  function tentarFechar() {
    if (loading) return;
    solicitarFechamento();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;

    const validacao = validarBloqueioUsuario(motivo);
    if (!validacao.valido) {
      setErro(validacao.erro);
      return;
    }

    setLoading(true);
    setApiError('');

    try {
      const res = await alterarBloqueioUsuario(usuario.id, {
        bloqueado: bloqueando,
        motivo: validacao.motivo,
      });
      onSuccess?.(res);
      onClose();
    } catch (err) {
      setApiError(err?.message || 'Falha ao alterar o status do usuário.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && tentarFechar()}>
      <div className="modal-panel card" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="bloqueio-titulo">
        <div className="modal-header">
          <div>
            <h2 className="modal-title" id="bloqueio-titulo">
              {bloqueando ? 'Bloquear usuário' : 'Desbloquear usuário'}
            </h2>
            <p className="modal-header-subtitulo">
              {bloqueando
                ? 'Interrompe o acesso e derruba as sessões ativas'
                : 'Devolve o acesso ao sistema'}
            </p>
          </div>
          <button type="button" className="modal-close" onClick={tentarFechar} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {apiError && <div className="modal-error" role="alert">{apiError}</div>}

            <div className="modal-resumo">
              <strong>{usuario.nome}</strong>
              <span>{usuario.email}</span>
              <span>Cargo: {formatarCargo(usuario.cargo)}</span>
            </div>

            {bloqueando && (
              <div className="modal-warning">
                Ao bloquear, todas as sessões deste usuário são encerradas imediatamente.
              </div>
            )}

            <div className="input-wrapper">
              <label className="input-label" htmlFor="bloqueio-motivo">Motivo *</label>
              <textarea
                id="bloqueio-motivo"
                className={`input-field${erro ? ' input-field--erro' : ''}`}
                rows={3}
                placeholder={bloqueando ? 'Ex.: Colaborador desligado da empresa.' : 'Ex.: Retorno de afastamento autorizado.'}
                value={motivo}
                onChange={e => {
                  setMotivo(e.target.value);
                  if (erro) setErro('');
                  if (apiError) setApiError('');
                }}
                maxLength={300}
                disabled={loading}
                autoFocus
              />
              {erro && <span className="campo-erro">{erro}</span>}
              <span className="campo-dica">
                {motivo.length}/300 · de 3 a 300 caracteres. Fica registrado na trilha de auditoria.
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={tentarFechar} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className={`btn ${bloqueando ? 'btn-danger' : 'btn-primary'}`} disabled={loading}>
              {loading
                ? (<><Loader2 size={16} className="animate-spin" /> Processando...</>)
                : bloqueando ? 'Confirmar bloqueio' : 'Confirmar desbloqueio'}
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
