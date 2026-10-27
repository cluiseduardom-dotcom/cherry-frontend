import { useEffect, useState } from 'react';
import { X, Copy } from 'lucide-react';
import { redefinirSenhaUsuario } from '../../services/usuarios';
import { useToast } from '../../context/ToastContext';
import '../ProductModal.css';
import './CamposFormulario.css';

// Admin redefine a senha de outro usuário: confirma a PRÓPRIA senha, recebe uma senha temporária
// aleatória (mostrada uma vez) e passa ao usuário, que precisa trocá-la ao entrar.
export default function RedefinirSenhaModal({ open, usuario, onClose, onSuccess }) {
  const toast = useToast();
  const [senhaConfirmacao, setSenhaConfirmacao] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [temporaria, setTemporaria] = useState('');

  useEffect(() => {
    if (open) {
      setSenhaConfirmacao('');
      setErro('');
      setLoading(false);
      setTemporaria('');
    }
  }, [open, usuario]);

  if (!open || !usuario) return null;

  async function enviar(e) {
    e.preventDefault();
    if (loading) return;
    if (!senhaConfirmacao) { setErro('Informe a sua senha para confirmar'); return; }
    setLoading(true);
    setErro('');
    try {
      const resultado = await redefinirSenhaUsuario(usuario.id, senhaConfirmacao);
      setTemporaria(resultado.senha_temporaria);
      setSenhaConfirmacao('');
      onSuccess?.(resultado);
    } catch (err) {
      setErro(err?.message || 'Falha ao redefinir a senha.');
    } finally {
      setLoading(false);
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(temporaria);
      toast.success('Senha copiada.');
    } catch {
      toast.error('Não foi possível copiar. Selecione e copie manualmente.');
    }
  }

  // Depois de mostrar a senha, fechar é explícito (clicar fora não pode fazer a senha sumir sem querer).
  const fechar = () => { if (!loading) onClose(); };

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && !temporaria && fechar()}>
      <div className="modal-panel card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Redefinir senha</h2>
            <p className="modal-subtitle">{usuario.nome} · {usuario.email}</p>
          </div>
          <button type="button" className="modal-close" onClick={fechar} aria-label="Fechar"><X size={18} /></button>
        </div>

        {temporaria ? (
          <div className="modal-body">
            <p>Senha temporária gerada. <strong>Ela aparece só agora</strong>: passe ao usuário por um canal seguro.
              Ele será obrigado a trocá-la no primeiro acesso e as sessões atuais dele foram encerradas.</p>
            <input className="input-field" readOnly value={temporaria} aria-label="Senha temporária"
              onFocus={e => e.target.select()} style={{ fontFamily: 'monospace', fontSize: '1.2rem', letterSpacing: '0.08em' }} />
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={copiar}><Copy size={14} /> Copiar</button>
              <button type="button" className="btn btn-primary" onClick={fechar}>Concluir</button>
            </div>
          </div>
        ) : (
          <form onSubmit={enviar} noValidate>
            <div className="modal-body">
              {erro && <div className="modal-error" role="alert">{erro}</div>}
              <p>Vamos gerar uma senha temporária para <strong>{usuario.nome}</strong>. A senha atual dele deixa de funcionar
                e ele sai de todos os dispositivos.</p>
              <div className="input-wrapper">
                <label className="input-label" htmlFor="rs-confirmacao">Sua senha (para confirmar)</label>
                <input id="rs-confirmacao" type="password" autoComplete="current-password" className="input-field"
                  value={senhaConfirmacao} onChange={e => { setSenhaConfirmacao(e.target.value); setErro(''); }} disabled={loading} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={fechar} disabled={loading}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Gerando…' : 'Gerar senha temporária'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
