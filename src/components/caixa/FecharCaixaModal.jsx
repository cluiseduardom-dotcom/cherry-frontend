import { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { fecharSessao } from '../../services/caixa';
import { LIMITE_JUSTIFICATIVA, corpoFechamento, montarConferencia, rotuloForma, temDiferenca, validarFechamento } from '../../utils/caixa';
import { formatarMoeda } from '../../utils/mascaras';
import '../ProductModal.css';

// Fechamento com conferência: o usuário informa quanto contou em cada forma; o servidor calcula o esperado e grava a diferença.
// Com diferença, a justificativa é obrigatória, mas o caixa fecha mesmo assim (decisão do PO: sem aprovação de gerente).
// Fechar é uma única chamada: se a resposta se perder, repetir devolve "já fechada" (409) e a tela recarrega o estado.
export default function FecharCaixaModal({ detalhe, onClose, onSuccess }) {
  const [informados, setInformados] = useState({});
  const [justificativa, setJustificativa] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const linhas = montarConferencia(detalhe.esperado, informados);
  const divergente = temDiferenca(linhas);

  async function enviar(e) {
    e.preventDefault();

    if (salvando) return;

    const problema = validarFechamento(linhas, justificativa);

    if (problema) { setErro(problema); return; }

    setSalvando(true);
    setErro('');

    try {
      const resultado = await fecharSessao(detalhe.sessao.id, corpoFechamento(linhas, justificativa));

      onSuccess?.(resultado);
      onClose();
    } catch (err) {
      setErro(err.message || 'Não foi possível fechar o caixa.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="fechar-caixa-titulo">
      <div className="modal-panel card">
        <div className="modal-header">
          <h2 id="fechar-caixa-titulo">Fechar {detalhe.sessao.caixa_nome}</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="Fechar janela"><X size={18} /></button>
        </div>
        <form onSubmit={enviar} className="caixa-form">
          <p className="caixa-dica">Conte o que há em cada forma de pagamento e informe abaixo. Use 0 quando não houver nada.</p>
          <ul className="caixa-conferencia">
            {linhas.map((l) => (
              <li key={l.forma}>
                <label className="caixa-campo">
                  <span>{rotuloForma(l.forma)} <small>esperado {formatarMoeda(l.esperado)}</small></span>
                  <input
                    className="input"
                    inputMode="decimal"
                    value={informados[l.forma] ?? ''}
                    onChange={(e) => { setErro(''); setInformados((atual) => ({ ...atual, [l.forma]: e.target.value })); }}
                    placeholder="0,00"
                    aria-label={`Contado em ${rotuloForma(l.forma)}`}
                  />
                </label>
                {!l.invalido && l.diferenca !== 0 && (
                  <span className={`caixa-diferenca ${l.diferenca < 0 ? 'falta' : 'sobra'}`}>
                    {l.diferenca < 0 ? 'Falta' : 'Sobra'} {formatarMoeda(Math.abs(l.diferenca))}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {divergente && (
            <label className="caixa-campo">
              <span>Justificativa da diferença</span>
              <textarea className="input" rows={3} value={justificativa} maxLength={LIMITE_JUSTIFICATIVA} onChange={(e) => { setErro(''); setJustificativa(e.target.value); }} />
            </label>
          )}
          {erro && <p className="caixa-erro" role="alert"><AlertCircle size={16} /> {erro}</p>}
          <div className="caixa-acoes">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={salvando}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? 'Fechando...' : 'Fechar caixa'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
