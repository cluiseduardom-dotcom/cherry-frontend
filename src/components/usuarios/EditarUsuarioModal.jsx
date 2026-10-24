import { useState, useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { obterUsuario, editarDadosUsuario } from '../../services/usuarios';
import {
  validarDadosCadastrais,
  dadosAlterados,
  dadosParaFormulario,
  formatarCargo,
  DADOS_VAZIOS,
} from '../../utils/usuarios';
import { useConfirmarFechamentoModal } from '../../hooks/useConfirmarFechamentoModal';
import { formularioAlterado } from '../../utils/formularioAlterado';
import { useRolarParaErro } from '../../hooks/useRolarParaErro';
import ConfirmarDescarteDialog from '../ConfirmarDescarteDialog';
import DadosCadastraisCampos from './DadosCadastraisCampos';
import '../ProductModal.css';
import './CamposFormulario.css';

export default function EditarUsuarioModal({ open, usuario, onClose, onSuccess }) {
  const [form, setForm] = useState(DADOS_VAZIOS);
  const [inicial, setInicial] = useState(DADOS_VAZIOS);
  const [erros, setErros] = useState({});
  const [apiError, setApiError] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [carregado, setCarregado] = useState(false);
  const [loading, setLoading] = useState(false);
  const painelRef = useRef(null);
  const [falhasEnvio, setFalhasEnvio] = useState(0);

  // Carrega o detalhe (único endpoint que traz o CPF) toda vez que o modal abre.
  useEffect(() => {
    if (!open || !usuario) return undefined;

    let cancelado = false;
    setForm(DADOS_VAZIOS);
    setInicial(DADOS_VAZIOS);
    setErros({});
    setApiError('');
    setLoading(false);
    setCarregado(false);
    setCarregando(true);

    obterUsuario(usuario.id)
      .then(detalhe => {
        if (cancelado) return;
        const base = dadosParaFormulario(detalhe?.dados);
        setForm(base);
        setInicial(base);
        setCarregado(true);
      })
      .catch(err => {
        if (!cancelado) setApiError(err?.message || 'Não foi possível carregar os dados do usuário.');
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => { cancelado = true; };
  }, [open, usuario]);

  useRolarParaErro(painelRef, falhasEnvio);

  const isDirty = formularioAlterado(form, inicial);
  const { confirmando, solicitarFechamento, confirmarDescarte, continuarEditando } =
    useConfirmarFechamentoModal({ open: open && Boolean(usuario), isDirty, onClose });

  if (!open || !usuario) return null;

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
    if (loading || !carregado) return;

    const validacao = validarDadosCadastrais(form);
    if (!validacao.valido) {
      setErros(validacao.erros);
      setFalhasEnvio(n => n + 1);
      return;
    }

    const alteracoes = dadosAlterados(validacao.dados, inicial);
    if (Object.keys(alteracoes).length === 0) {
      setApiError('Nenhum dado foi alterado.');
      setFalhasEnvio(n => n + 1);
      return;
    }

    setLoading(true);
    setApiError('');

    let resultado;
    try {
      resultado = await editarDadosUsuario(usuario.id, alteracoes);
    } catch (err) {
      setFalhasEnvio(n => n + 1);
      setApiError(err?.message || 'Falha ao salvar os dados do usuário.');
      setLoading(false);
      return;
    }

    // Já gravou no backend: daqui em diante nada é "falha".
    setLoading(false);
    onClose();
    onSuccess?.({ ...resultado, usuario });
  }

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && tentarFechar()}>
      <div className="modal-panel card" ref={painelRef} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="editar-usuario-titulo">
        <div className="modal-header">
          <div>
            <h2 className="modal-title" id="editar-usuario-titulo">Editar dados do usuário</h2>
            <p className="modal-header-subtitulo">
              {usuario.nome} · {formatarCargo(usuario.cargo)} · {usuario.email}
            </p>
          </div>
          <button type="button" className="modal-close" onClick={tentarFechar} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {apiError && <div className="modal-error" role="alert">{apiError}</div>}

            {carregando ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto var(--space-2)' }} />
                <div>Carregando dados...</div>
              </div>
            ) : carregado ? (
              <>
                <span className="campo-dica" style={{ display: 'block', marginBottom: 'var(--space-3)' }}>
                  Nome, e-mail e cargo não são editados aqui. A alteração fica registrada na trilha de auditoria
                  (apenas quais campos mudaram, nunca os valores).
                </span>
                <DadosCadastraisCampos
                  prefixo="edit-usuario"
                  form={form}
                  erros={erros}
                  onChange={atualizar}
                  disabled={loading}
                />
              </>
            ) : null}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={tentarFechar} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !carregado || !isDirty}>
              {loading ? (<><Loader2 size={16} className="animate-spin" /> Salvando...</>) : 'Salvar alterações'}
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
