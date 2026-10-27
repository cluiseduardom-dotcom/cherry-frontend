import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { alterarSenha } from '../services/auth';
import { homeRouteForRole } from '../config/access';
import { validarTrocaSenha, SENHA_MINIMA } from '../utils/senha';

const VAZIO = { senha_atual: '', nova_senha: '', confirmacao: '' };

export default function AlterarSenha() {
  const { atualizarToken, user } = useAuth();
  const obrigatoria = user?.senha_temporaria === true;
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(VAZIO);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const set = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }));

  async function enviar(e) {
    e.preventDefault();
    const invalido = validarTrocaSenha(form);
    if (invalido) { setErro(invalido); return; }
    setErro('');
    setSalvando(true);
    try {
      const novoToken = await alterarSenha(form);
      atualizarToken(novoToken);
      setForm(VAZIO);
      toast.success('Senha alterada. Outros dispositivos precisarão entrar novamente.');
      // Troca obrigatória: não há "voltar" (a página anterior era o login); vai para a home do cargo.
      navigate(obrigatoria ? homeRouteForRole(user.role) : -1, obrigatoria ? { replace: true } : undefined);
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Alterar senha</h1>
          {obrigatoria && (
            <p className="modal-error" role="status">
              Você entrou com uma senha temporária. Defina uma nova senha para continuar usando o sistema.
            </p>
          )}
          <p className="page-subtitle">Use no mínimo {SENHA_MINIMA} caracteres. Ao trocar, os outros dispositivos saem da conta.</p>
        </div>
      </div>
      <form className="card card-padding" style={{ maxWidth: 420, display: "flex", flexDirection: "column", gap: 12 }} onSubmit={enviar} noValidate>
        {erro && <div className="modal-error" role="alert">{erro}</div>}
        <div className="input-wrapper">
          <label className="input-label" htmlFor="as-atual">{obrigatoria ? 'Senha temporária' : 'Senha atual'}</label>
          <input id="as-atual" type="password" autoComplete="current-password" className="input-field"
            value={form.senha_atual} onChange={e => set('senha_atual', e.target.value)} />
        </div>
        <div className="input-wrapper">
          <label className="input-label" htmlFor="as-nova">Nova senha</label>
          <input id="as-nova" type="password" autoComplete="new-password" className="input-field"
            value={form.nova_senha} onChange={e => set('nova_senha', e.target.value)} />
        </div>
        <div className="input-wrapper">
          <label className="input-label" htmlFor="as-conf">Confirmar nova senha</label>
          <input id="as-conf" type="password" autoComplete="new-password" className="input-field"
            value={form.confirmacao} onChange={e => set('confirmacao', e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary btn-full" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Alterar senha'}
        </button>
      </form>
    </div>
  );
}
