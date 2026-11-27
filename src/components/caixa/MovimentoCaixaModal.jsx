import { useRef, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { lancarMovimento } from '../../services/caixa';
import { novaChave } from '../../utils/fiado';
import { LIMITE_MOTIVO, TIPOS_MOVIMENTO, validarMovimento } from '../../utils/caixa';
import { formatarMoeda } from '../../utils/mascaras';
import { lerValor } from '../../utils/fiado';
import '../ProductModal.css';

// Suprimento (entra dinheiro) ou sangria (sai dinheiro) da gaveta. Cada tentativa tem uma Idempotency-Key: o clique repetido ou o
// "tentar de novo" nunca lança o dinheiro em dobro; a chave muda quando o usuário altera um campo. O pai monta este modal só
// quando há sessão escolhida (e usa `key`), então cada abertura começa limpa.
export default function MovimentoCaixaModal({ sessaoId, tipoInicial = 'suprimento', dinheiroEmCaixa, onClose, onSuccess }) {
  const [tipo, setTipo] = useState(tipoInicial);
  const [valor, setValor] = useState('');
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const chave = useRef(novaChave());

  const mudou = (setter) => (e) => { chave.current = novaChave(); setErro(''); setter(e.target.value); };

  async function enviar(e) {
    e.preventDefault();

    if (salvando) return;

    const problema = validarMovimento({ tipo, valor, motivo }, dinheiroEmCaixa);

    if (problema) { setErro(problema); return; }

    setSalvando(true);
    setErro('');

    try {
      const movimento = await lancarMovimento(sessaoId, { tipo, valor: lerValor(valor), motivo: motivo.trim() }, chave.current);

      onSuccess?.(movimento);
      onClose();
    } catch (err) {
      setErro(err.message || 'Não foi possível registrar o movimento.');
    } finally {
      setSalvando(false);
    }
  }

  const dica = TIPOS_MOVIMENTO.find((t) => t.valor === tipo)?.dica;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="mov-caixa-titulo">
      <div className="modal-panel card">
        <div className="modal-header">
          <h2 id="mov-caixa-titulo">Movimento de caixa</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>
        <form onSubmit={enviar} className="caixa-form">
          <div className="caixa-tipos" role="radiogroup" aria-label="Tipo de movimento">
            {TIPOS_MOVIMENTO.map((t) => (
              <label key={t.valor} className={`caixa-tipo${tipo === t.valor ? ' ativo' : ''}`}>
                <input type="radio" name="tipo" value={t.valor} checked={tipo === t.valor} onChange={mudou(setTipo)} /> {t.rotulo}
              </label>
            ))}
          </div>
          {dica && <p className="caixa-dica">{dica}</p>}
          {typeof dinheiroEmCaixa === 'number' && <p className="caixa-dica">Dinheiro em caixa agora: <strong>{formatarMoeda(dinheiroEmCaixa)}</strong></p>}
          <label className="caixa-campo">
            <span>Valor (R$)</span>
            <input className="input" inputMode="decimal" value={valor} onChange={mudou(setValor)} placeholder="0,00" autoFocus />
          </label>
          <label className="caixa-campo">
            <span>Motivo</span>
            <input className="input" value={motivo} onChange={mudou(setMotivo)} maxLength={LIMITE_MOTIVO} placeholder="Ex.: troco para o dia / levado ao cofre" />
          </label>
          {erro && <p className="caixa-erro" role="alert"><AlertCircle size={16} /> {erro}</p>}
          <div className="caixa-acoes">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={salvando}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? 'Registrando...' : 'Registrar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
