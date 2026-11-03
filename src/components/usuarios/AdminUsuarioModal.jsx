import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { concederAdmin, revogarAdmin } from '../../services/privilegios';
import '../ProductModal.css';
import './CamposFormulario.css';

export const MOTIVO_MINIMO = 5;

// Conceder (acao 'conceder') ou remover (acao 'revogar') o privilégio de Admin de um usuário. Confirma a senha de
// quem executa e pede o motivo, como o backend exige.
export default function AdminUsuarioModal({ open, usuario, acao, onClose, onSuccess }) {
  const [senha, setSenha] = useState('');
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSenha('');
      setMotivo('');
      setErro('');
      setLoading(false);
    }
  }, [open, usuario, acao]);

  if (!open || !usuario) return null;

  const concedendo = acao === 'conceder';

  async function enviar(e) {
    e.preventDefault();
    if (loading) return;
    if (motivo.trim().length < MOTIVO_MINIMO) { setErro(`Informe o motivo (mínimo ${MOTIVO_MINIMO} caracteres).`); return; }
    if (!senha) { setErro('Informe a sua senha para confirmar.'); return; }
    setLoading(true);
    setErro('');
    try {
      const resultado = concedendo
        ? await concederAdmin(usuario.id, { senha, motivo })
        : await revogarAdmin(usuario.id, { senha, motivo });
      onSuccess?.(resultado);
      onClose();
    } catch (err) {
      setErro(err?.message || 'Falha ao alterar o privilégio de Admin.');
      setSenha('');
    } finally {
      setLoading(false);
    }
  }

  const fechar = () => { if (!loading) onClose(); };

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && fechar()}>
      <div className="modal-panel card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{concedendo ? 'Tornar Admin' : 'Remover Admin'}</h2>
            <p className="modal-subtitle">{usuario.nome} · {usuario.email}</p>
          </div>
          <button type="button" className="modal-close" onClick={fechar} aria-label="Fechar"><X size={18} /></button>
        </div>
        <form onSubmit={enviar} noValidate>
          <div className="modal-body">
            {erro && <div className="modal-error" role="alert">{erro}</div>}
            {concedendo ? (
              <p><strong>{usuario.nome}</strong> passa a ter acesso total: custos e margens, financeiro, usuários,
                configurações e todas as demais telas. O cargo continua o mesmo.</p>
            ) : (
              <p><strong>{usuario.nome}</strong> volta a ter só as permissões do cargo e sai de todos os aparelhos
                (precisa entrar de novo).</p>
            )}
            <div className="input-wrapper">
              <label className="input-label" htmlFor="adm-motivo">Motivo</label>
              <input id="adm-motivo" className="input-field" value={motivo} maxLength={500} disabled={loading}
                placeholder={concedendo ? 'Ex.: sócia da loja' : 'Ex.: saiu da sociedade'}
                onChange={e => { setMotivo(e.target.value); setErro(''); }} />
            </div>
            <div className="input-wrapper">
              <label className="input-label" htmlFor="adm-senha">Sua senha (para confirmar)</label>
              <input id="adm-senha" type="password" autoComplete="current-password" className="input-field"
                value={senha} disabled={loading} onChange={e => { setSenha(e.target.value); setErro(''); }} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={fechar} disabled={loading}>Cancelar</button>
            <button type="submit" className={`btn ${concedendo ? 'btn-primary' : 'btn-danger'}`} disabled={loading}>
              {loading ? 'Salvando…' : concedendo ? 'Tornar Admin' : 'Remover Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
