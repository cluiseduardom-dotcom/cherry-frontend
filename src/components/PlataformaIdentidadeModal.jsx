import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { atualizarIdentidade, obterHistoricoIdentidade } from '../services/plataforma';
import {
  descreverMudancaIdentidade, formatarDataHora, linkDaMarca, normalizarSlug, rotuloTema, validarIdentidade,
} from '../utils/identidade';
import ConfirmDialog from './ConfirmDialog';
import './ProductModal.css';

// Tema e endereço (/c/<slug>) da tela de login de uma empresa. A mudança só é enviada depois de um
// diálogo de confirmação que descreve o efeito; quem alterou é gravado pelo backend (usuário logado).
export default function PlataformaIdentidadeModal({ empresa, temas, onClose, onSaved }) {
  const origem = typeof window === 'undefined' ? '' : window.location.origin;
  const atual = { tema_visual: empresa.tema_visual, slug: empresa.slug ?? '' };
  const [form, setForm] = useState({ tema_visual: atual.tema_visual, slug: atual.slug });
  const [erros, setErros] = useState({});
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendente, setPendente] = useState(null);
  const [historico, setHistorico] = useState(null);

  useEffect(() => {
    let cancelado = false;
    obterHistoricoIdentidade(empresa.empresa_id)
      .then(d => { if (!cancelado) setHistorico(d); })
      .catch(() => { if (!cancelado) setHistorico([]); });
    return () => { cancelado = true; };
  }, [empresa.empresa_id]);

  function atualizar(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }));
    if (erros[campo]) setErros(prev => ({ ...prev, [campo]: undefined }));
    if (apiError) setApiError('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    const validacao = validarIdentidade(form, atual);
    if (!validacao.valido) {
      setErros(validacao.erros);
      return;
    }
    if (!validacao.corpo) {
      setApiError('Nada foi alterado.');
      return;
    }
    setPendente({ corpo: validacao.corpo, mensagem: descreverMudancaIdentidade(empresa.empresa_nome, validacao.corpo, origem) });
  }

  async function confirmar() {
    const { corpo } = pendente;
    setPendente(null);
    setSaving(true);
    setApiError('');
    try {
      await atualizarIdentidade(empresa.empresa_id, corpo);
      onSaved();
    } catch (err) {
      setApiError(err?.message || 'Não foi possível salvar a alteração.');
      setSaving(false);
    }
  }

  const slugDigitado = normalizarSlug(form.slug);

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && !saving && onClose()}>
      <div className="modal-panel card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="pi-titulo">
        <div className="modal-header">
          <h2 className="modal-title" id="pi-titulo">Identidade visual · {empresa.empresa_nome}</h2>
          <button type="button" className="modal-close" onClick={() => !saving && onClose()} aria-label="Fechar"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {apiError && <div className="modal-error" role="alert">{apiError}</div>}

            <div className="modal-form-grid">
              <div className="input-wrapper modal-form-span-2">
                <label className="input-label" htmlFor="pi-tema">Tema *</label>
                <select
                  id="pi-tema"
                  className="input-field"
                  value={form.tema_visual}
                  onChange={e => atualizar('tema_visual', e.target.value)}
                  disabled={saving}
                >
                  {temas.map(t => <option key={t} value={t}>{rotuloTema(t)}</option>)}
                </select>
                <span className="modal-field-hint">Cores, logo e tela de login de todos os usuários da empresa.</span>
              </div>

              <div className="input-wrapper modal-form-span-2">
                <label className="input-label" htmlFor="pi-slug">Endereço da marca (opcional)</label>
                <input
                  id="pi-slug"
                  type="text"
                  className={`input-field${erros.slug ? ' input-field--erro' : ''}`}
                  placeholder="Ex.: cherry"
                  value={form.slug}
                  onChange={e => atualizar('slug', e.target.value)}
                  disabled={saving}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                {erros.slug
                  ? <span className="campo-erro">{erros.slug}</span>
                  : <span className="modal-field-hint">
                      {slugDigitado ? <>Link: <strong>{linkDaMarca(origem, slugDigitado)}</strong></> : 'Em branco: a empresa não tem link próprio e usa o login padrão.'}
                    </span>}
              </div>
            </div>

            <h3 className="plataforma-hist-titulo">Histórico</h3>
            {!historico && <p className="text-sm text-secondary">Carregando...</p>}
            {historico && historico.length === 0 && <p className="text-sm text-secondary">Nenhuma alteração registrada.</p>}
            {historico && historico.length > 0 && (
              <ul className="plataforma-hist-lista">
                {historico.map(h => (
                  <li key={h.id}>
                    <strong>{formatarDataHora(h.criado_em)}</strong> · {h.responsavel}
                    <span className="plataforma-hist-sub">
                      {h.tema_anterior !== h.tema_novo && <>Tema: {rotuloTema(h.tema_anterior)} → {rotuloTema(h.tema_novo)}. </>}
                      {(h.slug_anterior ?? null) !== (h.slug_novo ?? null) && <>Endereço: {h.slug_anterior || 'nenhum'} → {h.slug_novo || 'nenhum'}.</>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={Boolean(pendente)}
        title="Confirmar mudança de identidade"
        message={pendente?.mensagem}
        confirmLabel="Confirmar"
        onConfirm={confirmar}
        onCancel={() => setPendente(null)}
      />
    </div>
  );
}
