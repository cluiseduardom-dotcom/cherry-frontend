import { useState, useEffect } from 'react';
import { X, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import { criarUsuario } from '../../services/usuarios';
import {
  cargosPermitidosParaCriacao,
  validarCriarUsuario,
} from '../../utils/usuarios';

export default function CriarUsuarioModal({ open, onClose, onSuccess, actor }) {
  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmacaoSenha: '',
    papel: '',
  });
  const [erros, setErros] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  const cargosDisponiveis = cargosPermitidosParaCriacao(actor);

  useEffect(() => {
    if (open) {
      setForm({
        nome: '',
        email: '',
        senha: '',
        confirmacaoSenha: '',
        papel: cargosDisponiveis[0]?.cargo || '',
      });
      setErros({});
      setApiError(null);
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (erros[field]) {
      setErros(prev => ({ ...prev, [field]: undefined }));
    }
    if (apiError) setApiError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;

    const validacao = validarCriarUsuario(form, actor);
    if (!validacao.valido) {
      setErros(validacao.erros);
      return;
    }

    setLoading(true);
    setApiError(null);

    try {
      const res = await criarUsuario(validacao.dados);
      onSuccess?.(res.usuario);
      onClose();
    } catch (err) {
      setApiError(err?.message || 'Falha ao cadastrar usuário.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div className="modal-header-icon" style={{ backgroundColor: 'var(--color-primary-soft, rgba(230, 0, 77, 0.1))', color: 'var(--color-primary, #e6004d)' }}>
            <UserPlus size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 className="modal-title">Novo usuário</h2>
            <p className="modal-subtitle">Cadastre um colaborador na empresa com cargo apropriado</p>
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

            {cargosDisponiveis.length === 0 ? (
              <div className="alert alert-warning">
                Seu nível de autorização atual não permite criar usuários com nenhum cargo abaixo do seu.
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label htmlFor="usuario-nome" className="form-label">
                    Nome completo <span style={{ color: 'var(--color-danger, #e53935)' }}>*</span>
                  </label>
                  <input
                    id="usuario-nome"
                    type="text"
                    className={`form-input ${erros.nome ? 'form-input--error' : ''}`}
                    placeholder="Ex.: Mariana Souza"
                    value={form.nome}
                    onChange={e => handleChange('nome', e.target.value)}
                    maxLength={255}
                    disabled={loading}
                    autoFocus
                  />
                  {erros.nome && <span className="form-error">{erros.nome}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="usuario-email" className="form-label">
                    E-mail <span style={{ color: 'var(--color-danger, #e53935)' }}>*</span>
                  </label>
                  <input
                    id="usuario-email"
                    type="email"
                    className={`form-input ${erros.email ? 'form-input--error' : ''}`}
                    placeholder="mariana@empresa.com"
                    value={form.email}
                    onChange={e => handleChange('email', e.target.value)}
                    maxLength={255}
                    disabled={loading}
                  />
                  {erros.email && <span className="form-error">{erros.email}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="usuario-papel" className="form-label">
                    Cargo / Papel <span style={{ color: 'var(--color-danger, #e53935)' }}>*</span>
                  </label>
                  <select
                    id="usuario-papel"
                    className={`form-select ${erros.papel ? 'form-input--error' : ''}`}
                    value={form.papel}
                    onChange={e => handleChange('papel', e.target.value)}
                    disabled={loading}
                  >
                    {cargosDisponiveis.map(c => (
                      <option key={c.cargo} value={c.cargo}>
                        {c.rotulo} {c.escada ? `(Nível ${c.nivel})` : '(Operacional)'}
                      </option>
                    ))}
                  </select>
                  {erros.papel && <span className="form-error">{erros.papel}</span>}
                  <span className="form-hint" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Apenas cargos ativos de nível estritamente menor que o seu podem ser atribuídos.
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label htmlFor="usuario-senha" className="form-label">
                      Senha provisória <span style={{ color: 'var(--color-danger, #e53935)' }}>*</span>
                    </label>
                    <input
                      id="usuario-senha"
                      type="password"
                      className={`form-input ${erros.senha ? 'form-input--error' : ''}`}
                      placeholder="Mínimo 6 caracteres"
                      value={form.senha}
                      onChange={e => handleChange('senha', e.target.value)}
                      maxLength={128}
                      disabled={loading}
                    />
                    {erros.senha && <span className="form-error">{erros.senha}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="usuario-confirmacao-senha" className="form-label">
                      Confirmar senha <span style={{ color: 'var(--color-danger, #e53935)' }}>*</span>
                    </label>
                    <input
                      id="usuario-confirmacao-senha"
                      type="password"
                      className={`form-input ${erros.confirmacaoSenha ? 'form-input--error' : ''}`}
                      placeholder="Repita a senha"
                      value={form.confirmacaoSenha}
                      onChange={e => handleChange('confirmacaoSenha', e.target.value)}
                      maxLength={128}
                      disabled={loading}
                    />
                    {erros.confirmacaoSenha && <span className="form-error">{erros.confirmacaoSenha}</span>}
                  </div>
                </div>
              </>
            )}
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
              className="btn btn-primary"
              disabled={loading || cargosDisponiveis.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Cadastrando...
                </>
              ) : (
                'Criar usuário'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
