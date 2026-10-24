import { useState, useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { criarUsuario, listarCargosAtribuiveis } from '../../services/usuarios';
import { validarCriarUsuario, DADOS_VAZIOS } from '../../utils/usuarios';
import { useConfirmarFechamentoModal } from '../../hooks/useConfirmarFechamentoModal';
import { formularioAlterado } from '../../utils/formularioAlterado';
import { useRolarParaErro } from '../../hooks/useRolarParaErro';
import ConfirmarDescarteDialog from '../ConfirmarDescarteDialog';
import DadosCadastraisCampos from './DadosCadastraisCampos';
import '../ProductModal.css';
import './CamposFormulario.css';

const FORM_VAZIO = { nome: '', email: '', senha: '', confirmacaoSenha: '', papel: '', ...DADOS_VAZIOS };

function rotuloDoCargo(c) {
  return c.em_escada ? `${c.rotulo} (nível ${c.nivel})` : `${c.rotulo} (operacional)`;
}

export default function CriarUsuarioModal({ open, onClose, onSuccess }) {
  const [form, setForm] = useState(FORM_VAZIO);
  const [inicial, setInicial] = useState(FORM_VAZIO);
  const [cargos, setCargos] = useState([]);
  const [carregandoCargos, setCarregandoCargos] = useState(false);
  const [erros, setErros] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const painelRef = useRef(null);
  const [falhasEnvio, setFalhasEnvio] = useState(0);

  // Só os cargos que o backend aceitaria (ativos na empresa, abaixo do nível do ator).
  useEffect(() => {
    if (!open) return undefined;

    let cancelado = false;
    setForm(FORM_VAZIO);
    setInicial(FORM_VAZIO);
    setErros({});
    setApiError('');
    setLoading(false);
    setCarregandoCargos(true);

    listarCargosAtribuiveis()
      .then(lista => {
        if (cancelado) return;
        const itens = Array.isArray(lista) ? lista : [];
        setCargos(itens);
        const base = { ...FORM_VAZIO, papel: itens[0]?.cargo || '' };
        setForm(base);
        setInicial(base);
      })
      .catch(err => {
        if (!cancelado) setApiError(err?.message || 'Não foi possível carregar os cargos.');
      })
      .finally(() => {
        if (!cancelado) setCarregandoCargos(false);
      });

    return () => { cancelado = true; };
  }, [open]);

  useRolarParaErro(painelRef, falhasEnvio);

  // Nunca fecha em silêncio (clique fora, ESC, X ou Cancelar) com dados preenchidos.
  const isDirty = formularioAlterado(form, inicial);
  const { confirmando, solicitarFechamento, confirmarDescarte, continuarEditando } =
    useConfirmarFechamentoModal({ open, isDirty, onClose });

  if (!open) return null;

  function tentarFechar() {
    if (loading) return;
    solicitarFechamento();
  }

  function atualizar(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }));
    if (erros[campo]) setErros(prev => ({ ...prev, [campo]: undefined }));
    if (apiError) setApiError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;

    const validacao = validarCriarUsuario(form, null);
    if (!validacao.valido) {
      setErros(validacao.erros);
      setFalhasEnvio(n => n + 1);
      return;
    }

    setLoading(true);
    setApiError('');

    let criado;
    try {
      const res = await criarUsuario(validacao.dados);
      criado = res.usuario;
    } catch (err) {
      setFalhasEnvio(n => n + 1);
      setApiError(err?.message || 'Falha ao cadastrar usuário.');
      setLoading(false);
      return;
    }

    // Já gravou no backend: daqui em diante nada é "falha ao cadastrar".
    setLoading(false);
    onClose();
    onSuccess?.(criado);
  }

  const semCargos = !carregandoCargos && cargos.length === 0;

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && tentarFechar()}>
      <div className="modal-panel card" ref={painelRef} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="criar-usuario-titulo">
        <div className="modal-header">
          <h2 className="modal-title" id="criar-usuario-titulo">Novo usuário</h2>
          <button type="button" className="modal-close" onClick={tentarFechar} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {apiError && <div className="modal-error" role="alert">{apiError}</div>}

            {semCargos && !apiError && (
              <div className="modal-warning">
                Nenhum cargo habilitado abaixo do seu nível. Peça ao administrador para habilitar os cargos
                da equipe em Configurações.
              </div>
            )}

            <div className="modal-form-section">
              <h3 className="modal-form-section-title">Acesso</h3>
            <div className="modal-form-grid">
              <div className="input-wrapper modal-form-span-2">
                <label className="input-label" htmlFor="usuario-nome">Nome completo *</label>
                <input
                  id="usuario-nome"
                  type="text"
                  className={`input-field${erros.nome ? ' input-field--erro' : ''}`}
                  placeholder="Ex.: Mariana Souza"
                  value={form.nome}
                  onChange={e => atualizar('nome', e.target.value)}
                  maxLength={255}
                  disabled={loading}
                  autoFocus
                />
                {erros.nome && <span className="campo-erro">{erros.nome}</span>}
              </div>

              <div className="input-wrapper modal-form-span-2">
                <label className="input-label" htmlFor="usuario-email">E-mail *</label>
                <input
                  id="usuario-email"
                  type="email"
                  className={`input-field${erros.email ? ' input-field--erro' : ''}`}
                  placeholder="mariana@empresa.com"
                  value={form.email}
                  onChange={e => atualizar('email', e.target.value)}
                  maxLength={255}
                  disabled={loading}
                />
                {erros.email && <span className="campo-erro">{erros.email}</span>}
              </div>

              <div className="input-wrapper modal-form-span-2">
                <label className="input-label" htmlFor="usuario-papel">Cargo *</label>
                <select
                  id="usuario-papel"
                  className={`input-field${erros.papel ? ' input-field--erro' : ''}`}
                  value={form.papel}
                  onChange={e => atualizar('papel', e.target.value)}
                  disabled={loading || carregandoCargos || semCargos}
                >
                  {carregandoCargos && <option value="">Carregando cargos...</option>}
                  {cargos.map(c => (
                    <option key={c.cargo} value={c.cargo}>{rotuloDoCargo(c)}</option>
                  ))}
                </select>
                {erros.papel && <span className="campo-erro">{erros.papel}</span>}
                <span className="modal-field-hint">
                  Só aparecem cargos habilitados na empresa e abaixo do seu nível.
                </span>
              </div>

              <div className="input-wrapper">
                <label className="input-label" htmlFor="usuario-senha">Senha provisória *</label>
                <input
                  id="usuario-senha"
                  type="password"
                  className={`input-field${erros.senha ? ' input-field--erro' : ''}`}
                  placeholder="Mínimo 6 caracteres"
                  value={form.senha}
                  onChange={e => atualizar('senha', e.target.value)}
                  maxLength={128}
                  autoComplete="new-password"
                  disabled={loading}
                />
                {erros.senha && <span className="campo-erro">{erros.senha}</span>}
              </div>

              <div className="input-wrapper">
                <label className="input-label" htmlFor="usuario-confirmacao-senha">Confirmar senha *</label>
                <input
                  id="usuario-confirmacao-senha"
                  type="password"
                  className={`input-field${erros.confirmacaoSenha ? ' input-field--erro' : ''}`}
                  placeholder="Repita a senha"
                  value={form.confirmacaoSenha}
                  onChange={e => atualizar('confirmacaoSenha', e.target.value)}
                  maxLength={128}
                  autoComplete="new-password"
                  disabled={loading}
                />
                {erros.confirmacaoSenha && <span className="campo-erro">{erros.confirmacaoSenha}</span>}
              </div>
            </div>
            </div>

            <DadosCadastraisCampos
              prefixo="usuario"
              form={form}
              erros={erros}
              onChange={atualizar}
              disabled={loading}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={tentarFechar} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || carregandoCargos || semCargos}>
              {loading ? (<><Loader2 size={16} className="animate-spin" /> Criando...</>) : 'Criar usuário'}
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
