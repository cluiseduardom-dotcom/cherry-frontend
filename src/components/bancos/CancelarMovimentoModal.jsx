import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cancelarMovimentoBancario } from '../../services/bancos';
import { formatarMoeda } from '../../utils/mascaras';
import '../ProductModal.css';

export default function CancelarMovimentoModal({ open, movimento, onClose, onCancelado }) {
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { if (open) { setMotivo(''); setErro(''); setSalvando(false); } }, [open, movimento]);
  if (!open || !movimento) return null;

  async function enviar(e) {
    e.preventDefault();
    if (motivo.trim().length < 3) { setErro('Informe o motivo (mínimo 3 letras)'); return; }
    setErro(''); setSalvando(true);
    try {
      onCancelado(await cancelarMovimentoBancario(movimento.id, motivo.trim()));
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && !salvando && onClose()}>
      <div className="modal-panel card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Cancelar movimento</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>
        <form onSubmit={enviar} noValidate>
          <div className="modal-body">
            {erro && <div className="modal-error">{erro}</div>}
            <p className="text-sm">
              {movimento.descricao} — <strong>{formatarMoeda(movimento.valor)}</strong>. O saldo da conta será recalculado;
              o registro continua no histórico como cancelado.
            </p>
            <div className="input-wrapper">
              <label className="input-label" htmlFor="cm-motivo">Motivo *</label>
              <input id="cm-motivo" className="input-field" autoFocus value={motivo} onChange={e => setMotivo(e.target.value)} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={salvando}>Voltar</button>
            <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? 'Cancelando...' : 'Cancelar movimento'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
