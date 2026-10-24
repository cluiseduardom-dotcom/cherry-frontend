import { useState, useEffect } from 'react';
import { X, ShieldAlert, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { alterarBloqueioUsuario } from '../../services/usuarios';
import { validarBloqueioUsuario, formatarCargo } from '../../utils/usuarios';

export default function BloquearUsuarioModal({ open, usuario, onClose, onSuccess }) {
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [loading, setLoading] = useState(false);

  const bloqueando = Boolean(usuario?.ativo);

  useEffect(() => {
    if (open) {
      setMotivo('');
      setErro(null);
      setApiError(null);
      setLoading(false);
    }
  }, [open, usuario]);

  if (!open || !usuario) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;

    const validacao = validarBloqueioUsuario(motivo);
    if (!validacao.valido) {
      setErro(validacao.erro);
      return;
    }

    setLoading(true);
    setApiError(null);

    try {
      const res = await alterarBloqueioUsuario(usuario.id, {
        bloqueado: bloqueando,
        motivo: validacao.motivo,
      });
      onSuccess?.(res);
      onClose();
    } catch (err) {
      setApiError(err?.message || 'Falha ao alterar status do usuário.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div
            className="modal-header-icon"
            style={{
              backgroundColor: bloqueando
                ? 'var(--color-danger-soft, rgba(229, 57, 53, 0.1))'
                : 'var(--color-success-soft, rgba(46, 125, 50, 0.1))',
              color: bloqueando
                ? 'var(--color-danger, #e53935)'
                : 'var(--color-success, #2e7d32)',
            }}
          >
            {bloqueando ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}
          </div>
          <div style={{ flex: 1 }}>
            <h2 className="modal-title">
              {bloqueando ? 'Bloquear usuário' : 'Desbloquear usuário'}
            </h2>
            <p className="modal-subtitle">
              {bloqueando
                ? 'Interrompe o acesso e derruba sessões ativas'
                : 'Restaura a permissão de acesso ao sistema'}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            aria-label="Fechar modal"
            disabled={loading}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {apiError && (
              <div className="alert alert-danger" role="alert" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{apiError}</span>
              </div>
            )}

            <div
              style={{
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md, 8px)',
                backgroundColor: 'var(--bg-secondary, #f8f9fa)',
                border: '1px solid var(--border-color, #e9ecef)',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{usuario.nome}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{usuario.email}</div>
              <div style={{ fontSize: '0.85rem', marginTop: 4 }}>
                Cargo: <strong>{formatarCargo(usuario.cargo)}</strong>
              </div>
            </div>

            <div
              className={`alert ${bloqueando ? 'alert-warning' : 'alert-info'}`}
              style={{ fontSize: '0.85rem' }}
            >
              {bloqueando
                ? 'Atenção: Ao bloquear este usuário, todas as suas sessões e tokens ativos serão revogados imediatamente.'
                : 'O usuário poderá efetuar login e utilizar os recursos da sua empresa novamente.'}
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="bloqueio-motivo" className="form-label">
                  Motivo da ação <span style={{ color: 'var(--color-danger, #e53935)' }}>*</span>
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {motivo.length}/300
                </span>
              </div>
              <textarea
                id="bloqueio-motivo"
                className={`form-input ${erro ? 'form-input--error' : ''}`}
                rows={3}
                placeholder={
                  bloqueando
                    ? 'Ex.: Colaborador desligado da empresa em 24/10.'
                    : 'Ex.: Retorno de afastamento autorizado.'
                }
                value={motivo}
                onChange={e => {
                  setMotivo(e.target.value);
                  if (erro) setErro(null);
                  if (apiError) setApiError(null);
                }}
                maxLength={300}
                disabled={loading}
                autoFocus
              />
              {erro && <span className="form-error">{erro}</span>}
              <span className="form-hint" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Mínimo 3 e máximo 300 caracteres. Este registro fica salvo na trilha de auditoria.
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`btn ${bloqueando ? 'btn-danger' : 'btn-primary'}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processando...
                </>
              ) : bloqueando ? (
                'Confirmar bloqueio'
              ) : (
                'Confirmar desbloqueio'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
