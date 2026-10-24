import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { criarLocal } from '../services/locaisEstoque';
import { listarUsuarios } from '../services/usuarios';
import { listarClientes } from '../services/clientes';
import { FORM_LOCAL_VAZIO, validarNovoLocal, usuariosSemMaleta } from '../utils/locaisEstoque';
import { useConfirmarFechamentoModal } from '../hooks/useConfirmarFechamentoModal';
import { formularioAlterado } from '../utils/formularioAlterado';
import ConfirmarDescarteDialog from './ConfirmarDescarteDialog';
import './ProductModal.css';
import './usuarios/CamposFormulario.css';

export default function NovoLocalModal({ open, locais, onClose, onSaved }) {
  const [form, setForm] = useState(FORM_LOCAL_VAZIO);
  const [erros, setErros] = useState({});
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    let cancelado = false;
    setForm(FORM_LOCAL_VAZIO);
    setErros({});
    setApiError('');
    setSaving(false);
    setCarregando(true);

    Promise.all([listarUsuarios(), listarClientes()])
      .then(([listaUsuarios, listaClientes]) => {
        if (cancelado) return;
        setUsuarios(Array.isArray(listaUsuarios) ? listaUsuarios : []);
        setClientes(Array.isArray(listaClientes) ? listaClientes : []);
      })
      .catch(err => {
        if (!cancelado) setApiError(err?.message || 'Não foi possível carregar usuários e clientes.');
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => { cancelado = true; };
  }, [open]);

  const isDirty = formularioAlterado(form, FORM_LOCAL_VAZIO);
  const { confirmando, solicitarFechamento, confirmarDescarte, continuarEditando } =
    useConfirmarFechamentoModal({ open, isDirty, onClose });

  if (!open) return null;

  const candidatos = usuariosSemMaleta(usuarios, locais);

  function tentarFechar() {
    if (saving) return;
    solicitarFechamento();
  }

  function atualizar(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }));
    if (erros[campo]) setErros(prev => ({ ...prev, [campo]: undefined }));
    if (apiError) setApiError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;

    const validacao = validarNovoLocal(form);
    if (!validacao.valido) {
      setErros(validacao.erros);
      return;
    }

    setSaving(true);
    setApiError('');
    try {
      const criado = await criarLocal(validacao.dados);
      onSaved(criado);
    } catch (err) {
      setApiError(err?.message || 'Falha ao criar o local.');
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && tentarFechar()}>
      <div className="modal-panel card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="novo-local-titulo">
        <div className="modal-header">
          <h2 className="modal-title" id="novo-local-titulo">Novo local de estoque</h2>
          <button type="button" className="modal-close" onClick={tentarFechar} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {apiError && <div className="modal-error" role="alert">{apiError}</div>}

            <div className="modal-form-grid">
              <div className="input-wrapper modal-form-span-2">
                <label className="input-label" htmlFor="nl-tipo">Tipo *</label>
                <select
                  id="nl-tipo"
                  className="input-field"
                  value={form.tipo}
                  onChange={e => atualizar('tipo', e.target.value)}
                  disabled={saving}
                >
                  <option value="maleta">Maleta (estoque que fica com um vendedor)</option>
                  <option value="consignado">Consignado (mercadoria deixada com um parceiro)</option>
                </select>
              </div>

              {form.tipo === 'maleta' && (
                <div className="input-wrapper modal-form-span-2">
                  <label className="input-label" htmlFor="nl-usuario">Dono da maleta *</label>
                  <select
                    id="nl-usuario"
                    className={`input-field${erros.usuario_id ? ' input-field--erro' : ''}`}
                    value={form.usuario_id}
                    onChange={e => atualizar('usuario_id', e.target.value)}
                    disabled={saving || carregando}
                  >
                    <option value="">{carregando ? 'Carregando...' : 'Selecione o usuário'}</option>
                    {candidatos.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>
                  {erros.usuario_id && <span className="campo-erro">{erros.usuario_id}</span>}
                  {!carregando && candidatos.length === 0 && (
                    <span className="modal-field-hint">Todos os usuários ativos já têm uma maleta.</span>
                  )}
                </div>
              )}

              <div className="input-wrapper modal-form-span-2">
                <label className="input-label" htmlFor="nl-nome">
                  {form.tipo === 'consignado' ? 'Nome do consignatário *' : 'Nome da maleta (opcional)'}
                </label>
                <input
                  id="nl-nome"
                  type="text"
                  className={`input-field${erros.nome ? ' input-field--erro' : ''}`}
                  placeholder={form.tipo === 'consignado' ? 'Ex.: Loja da Maria' : 'Padrão: Maleta de + nome do usuário'}
                  value={form.nome}
                  onChange={e => atualizar('nome', e.target.value)}
                  maxLength={100}
                  disabled={saving}
                />
                {erros.nome && <span className="campo-erro">{erros.nome}</span>}
              </div>

              {form.tipo === 'consignado' && (
                <div className="input-wrapper modal-form-span-2">
                  <label className="input-label" htmlFor="nl-cliente">Cliente vinculado (opcional)</label>
                  <select
                    id="nl-cliente"
                    className="input-field"
                    value={form.cliente_id}
                    onChange={e => atualizar('cliente_id', e.target.value)}
                    disabled={saving || carregando}
                  >
                    <option value="">Sem vínculo</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={tentarFechar} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || carregando}>
              {saving ? 'Criando...' : 'Criar local'}
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
