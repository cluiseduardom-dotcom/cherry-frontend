import { useEffect, useState } from 'react';
import { alterarLoginUsuario } from '../../services/usuarios';
import { loginValido, normalizarLogin } from '../../utils/loginUsuario';

// Usuário (código de login) dentro de "Editar dados": salva sozinho (PATCH /usuarios/:id/login), separado dos
// dados cadastrais. O backend garante a permissão, o formato e que não se repete na loja.
export default function LoginUsuarioCampo({ usuarioId, loginAtual, sugestao, onAlterado }) {
  const [valor, setValor] = useState(loginAtual ?? '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');

  // Trocar de usuário zera tudo; o valor salvo voltando do cadastro só atualiza o campo (mantém o "salvo").
  useEffect(() => {
    setErro('');
    setOk('');
  }, [usuarioId]);

  useEffect(() => {
    setValor(loginAtual ?? '');
  }, [loginAtual]);

  const normalizado = normalizarLogin(valor);
  const mudou = normalizado !== (loginAtual ?? '');

  async function salvar() {
    if (salvando || !mudou) return;
    if (!loginValido(normalizado)) {
      setErro('Usuário deve ter de 2 a 20 letras ou números.');
      return;
    }
    setSalvando(true);
    setErro('');
    setOk('');
    try {
      const r = await alterarLoginUsuario(usuarioId, normalizado);
      setOk(`Usuário alterado para ${r.login}. Vale no próximo acesso.`);
      onAlterado?.(r.login);
    } catch (err) {
      setErro(err?.message || 'Não foi possível alterar o usuário.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="input-wrapper" style={{ marginBottom: 'var(--space-4)' }}>
      <label className="input-label" htmlFor="editar-usuario-login">Usuário (para entrar)</label>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <input
          id="editar-usuario-login"
          type="text"
          className={`input-field${erro ? ' input-field--erro' : ''}`}
          value={valor}
          maxLength={20}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          disabled={salvando}
          placeholder="Ex.: EGASIL"
          onChange={e => { setValor(normalizarLogin(e.target.value).slice(0, 20)); setErro(''); setOk(''); }}
        />
        <button type="button" className="btn btn-secondary" onClick={salvar} disabled={salvando || !mudou}>
          {salvando ? 'Salvando…' : 'Salvar usuário'}
        </button>
      </div>
      {erro && <span className="campo-erro">{erro}</span>}
      {ok && <span className="modal-field-hint" role="status">{ok}</span>}
      {!erro && !ok && <span className="modal-field-hint">Entra com ele na página da loja. O e-mail continua valendo.</span>}
      {sugestao && sugestao !== (loginAtual ?? '') && sugestao !== normalizado && (
        <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} disabled={salvando}
          onClick={() => { setValor(sugestao); setErro(''); setOk(''); }}>
          Usar a sugestão pelo nome: {sugestao}
        </button>
      )}
    </div>
  );
}
