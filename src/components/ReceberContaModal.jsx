import { useRef, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { receberContaReceber } from '../services/contasReceber';
import { formatarMoeda } from '../utils/mascaras';
import { novaChave, valorParaCampo } from '../utils/fiado';
import {
  FORMAS_RECEBIMENTO, LIMITE_OBSERVACAO, recebidoDaConta, restanteDaConta, soPorInteiro, validarRecebimento, valorDoRecebimento,
} from '../utils/contasReceber';
import './ProductModal.css';

// Receber uma conta (total ou parcialmente). Valor em branco = o restante todo (o servidor calcula). Cada tentativa tem uma
// Idempotency-Key: o clique repetido ou o "tentar de novo" nunca lança o dinheiro em dobro, e a chave muda quando o usuário
// altera um campo (outro conteúdo = outra chave). Conta antiga (sem parcela) só admite recebimento por inteiro.
// O pai só monta este modal quando há uma conta escolhida (e usa `key={conta.id}`): cada abertura começa limpa, com chave nova.
export default function ReceberContaModal({ conta, nomeCliente, onClose, onSuccess }) {
  const [valor, setValor] = useState('');
  const [forma, setForma] = useState('dinheiro');
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const chave = useRef(novaChave());

  const restante = restanteDaConta(conta);
  const recebido = recebidoDaConta(conta);
  const inteiro = soPorInteiro(conta);

  const mudou = (setter) => (e) => {
    chave.current = novaChave();
    setErro('');
    setter(e.target.value);
  };

  async function enviar(e) {
    e.preventDefault();

    if (salvando) return;

    const problema = validarRecebimento({ valor: inteiro ? '' : valor, observacao }, restante);

    if (problema) { setErro(problema); return; }

    setSalvando(true);
    setErro('');

    try {
      const resultado = await receberContaReceber(conta.id, {
        valor: inteiro ? undefined : valorDoRecebimento(valor),
        forma_pagamento: forma,
        observacao: observacao.trim() || undefined,
      }, chave.current);

      onSuccess?.(resultado.conta);
      onClose();
    } catch (err) {
      setErro(err.message || 'Não foi possível registrar o recebimento.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && !salvando && onClose()}>
      <div className="modal-panel card" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="receber-conta-titulo">
        <div className="modal-header">
          <h2 className="modal-title" id="receber-conta-titulo">Receber conta</h2>
          <button type="button" className="modal-close" onClick={onClose} disabled={salvando} aria-label="Fechar"><X size={18} /></button>
        </div>

        <form onSubmit={enviar} noValidate>
          <div className="modal-body">
            <p style={{ margin: '0 0 var(--space-3)' }}>
              <strong>{conta.descricao}</strong>
              {nomeCliente ? <><br /><span className="text-sm text-secondary">{nomeCliente}</span></> : null}
            </p>

            <div className="receber-conta-resumo" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <div><span className="text-sm text-secondary">Valor</span><br /><strong>{formatarMoeda(conta.valor)}</strong></div>
              <div><span className="text-sm text-secondary">Já recebido</span><br /><strong>{formatarMoeda(recebido)}</strong></div>
              <div><span className="text-sm text-secondary">Falta receber</span><br /><strong>{formatarMoeda(restante)}</strong></div>
            </div>

            {erro && (
              <div className="modal-error" role="alert">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><AlertCircle size={16} /><span>{erro}</span></div>
              </div>
            )}

            {inteiro ? (
              <p className="text-sm text-secondary">Esta conta é de uma venda antiga e só pode ser recebida por inteiro ({formatarMoeda(restante)}).</p>
            ) : (
              <div className="input-wrapper">
                <label className="input-label" htmlFor="receber-conta-valor">Valor recebido (R$)</label>
                <input id="receber-conta-valor" className="input-field" type="text" inputMode="decimal" placeholder={`Em branco = tudo (${valorParaCampo(restante)})`} value={valor} onChange={mudou(setValor)} disabled={salvando} autoFocus />
                <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 'var(--space-2)' }} onClick={() => { chave.current = novaChave(); setErro(''); setValor(valorParaCampo(restante)); }} disabled={salvando}>
                  Receber tudo ({formatarMoeda(restante)})
                </button>
              </div>
            )}

            <div className="input-wrapper" style={{ marginTop: 'var(--space-3)' }}>
              <label className="input-label" htmlFor="receber-conta-forma">Como foi pago</label>
              <select id="receber-conta-forma" className="input-field" value={forma} onChange={mudou(setForma)} disabled={salvando}>
                {FORMAS_RECEBIMENTO.map((f) => <option key={f.valor} value={f.valor}>{f.rotulo}</option>)}
              </select>
            </div>

            <div className="input-wrapper" style={{ marginTop: 'var(--space-3)' }}>
              <label className="input-label" htmlFor="receber-conta-obs">Observação (opcional)</label>
              <input id="receber-conta-obs" className="input-field" type="text" maxLength={LIMITE_OBSERVACAO} value={observacao} onChange={mudou(setObservacao)} disabled={salvando} />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={salvando}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? 'Registrando...' : 'Registrar recebimento'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
