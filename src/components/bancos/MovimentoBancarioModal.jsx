import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { lancarMovimentoBancario } from '../../services/bancos';
import { corpoMovimento, hojeBrasilia, validarMovimento } from '../../utils/bancos';
import { useConfirmarFechamentoModal } from '../../hooks/useConfirmarFechamentoModal';
import { formularioAlterado } from '../../utils/formularioAlterado';
import ConfirmarDescarteDialog from '../ConfirmarDescarteDialog';
import '../ProductModal.css';

const formVazio = contaId => ({
  conta_bancaria_id: contaId ? String(contaId) : '', tipo: 'ENTRADA', valor: '',
  data_movimento: hojeBrasilia(), descricao: '', observacao: '',
});

export default function MovimentoBancarioModal({ open, contas, contaInicialId, onClose, onSaved }) {
  const [form, setForm] = useState(formVazio());
  const [inicial, setInicial] = useState(formVazio());
  const [erros, setErros] = useState({});
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open) {
      const f = formVazio(contaInicialId);
      setForm(f); setInicial(f); setErros({}); setErro(''); setSalvando(false);
    }
  }, [open, contaInicialId]);

  const { confirmando, solicitarFechamento, confirmarDescarte, continuarEditando } =
    useConfirmarFechamentoModal({ open, isDirty: formularioAlterado(form, inicial), onClose });

  if (!open) return null;
  const tentarFechar = () => { if (!salvando) solicitarFechamento(); };
  const set = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }));

  async function enviar(e) {
    e.preventDefault();
    const e2 = validarMovimento(form);
    setErros(e2);
    if (Object.keys(e2).length) return;
    setErro(''); setSalvando(true);
    try {
      onSaved(await lancarMovimentoBancario(corpoMovimento(form)));
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  const ativas = (contas ?? []).filter(c => c.status === 'ATIVA');

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && tentarFechar()}>
      <div className="modal-panel card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Lançamento manual</h2>
          <button type="button" className="modal-close" onClick={tentarFechar} aria-label="Fechar"><X size={18} /></button>
        </div>
        <form onSubmit={enviar} noValidate>
          <div className="modal-body">
            {erro && <div className="modal-error">{erro}</div>}
            <div className="modal-form-grid">
              <div className="input-wrapper modal-form-span-2">
                <label className="input-label" htmlFor="mb-conta">Conta *</label>
                <select id="mb-conta" className="input-field" value={form.conta_bancaria_id} onChange={e => set('conta_bancaria_id', e.target.value)}>
                  <option value="">Selecione...</option>
                  {ativas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                {erros.conta_bancaria_id && <span className="bancos-field-error">{erros.conta_bancaria_id}</span>}
              </div>
              <div className="input-wrapper">
                <label className="input-label" htmlFor="mb-tipo">Tipo *</label>
                <select id="mb-tipo" className="input-field" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                  <option value="ENTRADA">Entrada (dinheiro entrou)</option>
                  <option value="SAIDA">Saída (dinheiro saiu)</option>
                </select>
              </div>
              <div className="input-wrapper">
                <label className="input-label" htmlFor="mb-valor">Valor (R$) *</label>
                <input id="mb-valor" className="input-field" inputMode="decimal" placeholder="0,00" value={form.valor} onChange={e => set('valor', e.target.value)} />
                {erros.valor && <span className="bancos-field-error">{erros.valor}</span>}
              </div>
              <div className="input-wrapper">
                <label className="input-label" htmlFor="mb-data">Data *</label>
                <input id="mb-data" type="date" className="input-field" max={hojeBrasilia()} value={form.data_movimento} onChange={e => set('data_movimento', e.target.value)} />
                {erros.data_movimento && <span className="bancos-field-error">{erros.data_movimento}</span>}
              </div>
              <div className="input-wrapper modal-form-span-2">
                <label className="input-label" htmlFor="mb-desc">Descrição *</label>
                <input id="mb-desc" className="input-field" value={form.descricao} onChange={e => set('descricao', e.target.value)} />
                {erros.descricao && <span className="bancos-field-error">{erros.descricao}</span>}
              </div>
              <div className="input-wrapper modal-form-span-2">
                <label className="input-label" htmlFor="mb-obs">Observação</label>
                <input id="mb-obs" className="input-field" value={form.observacao} onChange={e => set('observacao', e.target.value)} />
              </div>
              <p className="text-sm text-secondary modal-form-span-2">
                Um lançamento não pode ser editado nem apagado. Se errar, cancele informando o motivo.
              </p>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={tentarFechar} disabled={salvando}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? 'Lançando...' : 'Lançar'}</button>
          </div>
        </form>
        {confirmando && <ConfirmarDescarteDialog onContinuar={continuarEditando} onDescartar={confirmarDescarte} />}
      </div>
    </div>
  );
}
