import { useEffect, useState } from 'react';
import { alterarNomeUsuario } from '../../services/usuarios';

// Nome completo dentro de "Editar dados": salva sozinho (PATCH /usuarios/:id/nome), separado dos dados
// cadastrais. O backend garante a permissão (o próprio usuário ou quem pode gerenciá-lo) e registra na trilha.
export default function NomeUsuarioCampo({ usuarioId, nomeAtual, onAlterado }) {
  const [valor, setValor] = useState(nomeAtual ?? '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');

  // Trocar de usuário zera tudo; o valor salvo voltando do cadastro só atualiza o campo (mantém o "salvo").
  useEffect(() => {
    setErro('');
    setOk('');
  }, [usuarioId]);

  useEffect(() => {
    setValor(nomeAtual ?? '');
  }, [nomeAtual]);

  const limpo = valor.trim().replace(/\s+/g, ' ');
  const mudou = limpo !== (nomeAtual ?? '');

  async function salvar() {
    if (salvando || !mudou) return;
    if (!limpo) { setErro('Informe o nome completo.'); return; }
    setSalvando(true);
    setErro('');
    setOk('');
    try {
      const r = await alterarNomeUsuario(usuarioId, limpo);
      setOk('Nome atualizado.');
      onAlterado?.(r.nome);
    } catch (err) {
      setErro(err?.message || 'Não foi possível alterar o nome.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="input-wrapper" style={{ marginBottom: 'var(--space-4)' }}>
      <label className="input-label" htmlFor="editar-usuario-nome">Nome completo</label>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <input
          id="editar-usuario-nome"
          type="text"
          className={`input-field${erro ? ' input-field--erro' : ''}`}
          value={valor}
          maxLength={255}
          autoComplete="name"
          disabled={salvando}
          onChange={e => { setValor(e.target.value); setErro(''); setOk(''); }}
        />
        <button type="button" className="btn btn-secondary" onClick={salvar} disabled={salvando || !mudou}>
          {salvando ? 'Salvando…' : 'Salvar nome'}
        </button>
      </div>
      {erro && <span className="campo-erro">{erro}</span>}
      {ok && <span className="modal-field-hint" role="status">{ok}</span>}
    </div>
  );
}
