import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { criarContaBancaria, atualizarContaBancaria } from '../../services/bancos';
import { TIPOS_CONTA, corpoConta, validarConta } from '../../utils/bancos';
import { useConfirmarFechamentoModal } from '../../hooks/useConfirmarFechamentoModal';
import { formularioAlterado } from '../../utils/formularioAlterado';
import ConfirmarDescarteDialog from '../ConfirmarDescarteDialog';
import '../ProductModal.css';

const VAZIO = {
  nome: '', tipo: 'CONTA_CORRENTE', instituicao_nome: '', agencia: '', conta: '',
  saldo_inicial: '', data_saldo_inicial: '', observacao: '', principal: false,
};

function formDaConta(c) {
  if (!c) return VAZIO;
  return {
    nome: c.nome ?? '', tipo: c.tipo ?? 'CONTA_CORRENTE', instituicao_nome: c.instituicao_nome ?? '',
    agencia: c.agencia ?? '', conta: c.conta ?? '',
    saldo_inicial: c.saldo_inicial != null ? String(c.saldo_inicial).replace('.', ',') : '',
    data_saldo_inicial: c.data_saldo_inicial ? String(c.data_saldo_inicial).slice(0, 10) : '',
    observacao: c.observacao ?? '', principal: Boolean(c.principal),
  };
}

// O backend trava o saldo inicial depois do primeiro movimento e nas contas integradas.
export function saldoInicialEditavel(conta) {
  if (!conta) return true;
  if (conta.origem && conta.origem !== 'MANUAL') return false;
  return Number(conta.movimentos || 0) === 0;
}

export default function ContaBancariaModal({ open, conta, onClose, onSaved }) {
  const criando = !conta;
  const [form, setForm] = useState(VAZIO);
  const [inicial, setInicial] = useState(VAZIO);
  const [erros, setErros] = useState({});
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const saldoLivre = saldoInicialEditavel(conta);

  useEffect(() => {
    if (open) {
      const dados = formDaConta(conta);
      setForm(dados); setInicial(dados); setErros({}); setErro(''); setSalvando(false);
    }
  }, [open, conta]);

  const sujo = formularioAlterado(form, inicial);
  const { confirmando, solicitarFechamento, confirmarDescarte, continuarEditando } =
    useConfirmarFechamentoModal({ open, isDirty: sujo, onClose });

  if (!open) return null;

  const tentarFechar = () => { if (!salvando) solicitarFechamento(); };
  const set = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }));

  async function enviar(e) {
    e.preventDefault();
    const e2 = validarConta(form, { criando });
    setErros(e2);
    if (Object.keys(e2).length) return;
    setErro(''); setSalvando(true);
    try {
      const corpo = corpoConta(form, { criando, incluirSaldo: saldoLivre });
      const salva = criando ? await criarContaBancaria(corpo) : await atualizarContaBancaria(conta.id, corpo);
      onSaved(salva, criando);
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  const campo = (id, rotulo, extra = {}) => (
    <div className={`input-wrapper ${extra.wide ? 'modal-form-span-2' : ''}`}>
      <label className="input-label" htmlFor={`cb-${id}`}>{rotulo}</label>
      <input
        id={`cb-${id}`} className="input-field" type={extra.type ?? 'text'} value={form[id]}
        disabled={extra.disabled} inputMode={extra.inputMode} placeholder={extra.placeholder}
        onChange={e => set(id, e.target.value)}
      />
      {erros[id] && <span className="bancos-field-error">{erros[id]}</span>}
    </div>
  );

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && tentarFechar()}>
      <div className="modal-panel card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{criando ? 'Nova conta bancária' : 'Editar conta bancária'}</h2>
          <button type="button" className="modal-close" onClick={tentarFechar} aria-label="Fechar"><X size={18} /></button>
        </div>
        <form onSubmit={enviar} noValidate>
          <div className="modal-body">
            {erro && <div className="modal-error">{erro}</div>}
            <div className="modal-form-grid">
              {campo('nome', 'Nome da conta *', { wide: true, placeholder: 'Ex.: Itaú PJ, Caixa da loja' })}
              {criando && (
                <div className="input-wrapper">
                  <label className="input-label" htmlFor="cb-tipo">Tipo *</label>
                  <select id="cb-tipo" className="input-field" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                    {TIPOS_CONTA.map(t => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
                  </select>
                  {erros.tipo && <span className="bancos-field-error">{erros.tipo}</span>}
                </div>
              )}
              {campo('instituicao_nome', 'Instituição')}
              {campo('agencia', 'Agência')}
              {campo('conta', 'Conta')}
              {campo('saldo_inicial', 'Saldo inicial (R$)', { inputMode: 'decimal', placeholder: '0,00', disabled: !saldoLivre })}
              {campo('data_saldo_inicial', 'Saldo válido desde', { type: 'date', disabled: !saldoLivre })}
              {!saldoLivre && (
                <p className="text-sm text-secondary modal-form-span-2">
                  O saldo inicial não pode mais ser alterado: a conta já tem movimentos (ou é uma conta integrada).
                  Para corrigir, cancele o movimento errado e lance o certo.
                </p>
              )}
              {campo('observacao', 'Observação', { wide: true })}
              {criando && (
                <label className="modal-form-span-2" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="checkbox" checked={form.principal} onChange={e => set('principal', e.target.checked)} />
                  Conta principal
                </label>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={tentarFechar} disabled={salvando}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
        {confirmando && <ConfirmarDescarteDialog onContinuar={continuarEditando} onDescartar={confirmarDescarte} />}
      </div>
    </div>
  );
}
