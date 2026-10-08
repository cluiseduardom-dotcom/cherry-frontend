import { useState } from 'react';
import { Check, Banknote } from 'lucide-react';
import { formatarMoeda } from '../utils/mascaras';
import {
  FORMAS_PAGAMENTO,
  calcularTroco,
  deCentavos,
  montarPagamento,
  paraCentavos,
  rotuloForma,
  sanitizarValorDigitado,
  textoValorExibido,
} from '../utils/pagamentoVenda';
import './PagamentoPDV.css';

const SEM_ERRO = { campo: '', mensagem: '' };

// Mensagem de validação colada ao campo responsável (role=alert para leitores
// de tela; ícone + texto, nunca só cor).
function CampoErro({ id, erro, campo }) {
  if (erro.campo !== campo) return null;
  return (
    <p id={id} className="pdv-pay-error" role="alert">
      <span aria-hidden="true">⚠</span> {erro.mensagem}
    </p>
  );
}

/**
 * Pagamento do PDV: o operador escolhe COMO o cliente paga (1 clique) e o
 * campo Valor já vem com o saldo restante — nunca é preciso redigitar o valor
 * nem clicar em "Usar saldo" para fechar a venda. Para pagamento parcial, basta
 * editar o valor antes de confirmar; depois da confirmação o campo volta a
 * sugerir o que falta.
 */
export default function PagamentoPDV({ resumo, pagamentos, temCliente, onConfirmar, onRemover }) {
  const [forma, setForma] = useState(null); // sempre escolhida pelo operador
  const [edicao, setEdicao] = useState(null); // { texto, base } — valor editado à mão
  const [recebido, setRecebido] = useState('');
  const [parcelas, setParcelas] = useState('1');
  const [mesesPrazo, setMesesPrazo] = useState('1');
  const [erro, setErro] = useState(SEM_ERRO);

  const { saldoCentavos } = resumo;
  const valorTexto = textoValorExibido(edicao, saldoCentavos);
  const valorCentavos = paraCentavos(valorTexto);
  const recebidoCentavos = paraCentavos(recebido);
  const troco = forma === 'dinheiro' ? calcularTroco(valorCentavos, recebidoCentavos) : 0;
  const temSaldo = saldoCentavos > 0;

  function escolherForma(valor) {
    setForma(valor);
    setErro(SEM_ERRO);
  }

  function confirmar() {
    const r = montarPagamento({
      forma,
      textoValor: valorTexto,
      saldoCentavos,
      textoRecebido: recebido,
      parcelas,
      mesesPrazo,
      temCliente,
    });
    if (r.erro) {
      setErro({ campo: r.campo, mensagem: r.erro });
      return;
    }
    onConfirmar(r.pagamento);
    // Próximo pagamento: valor volta a ser o saldo restante e a forma é
    // escolhida de novo (define a transação enviada ao TEF/gateway).
    setForma(null);
    setEdicao(null);
    setRecebido('');
    setParcelas('1');
    setErro(SEM_ERRO);
  }

  return (
    <section className="pdv-pay" aria-label="Pagamento">
      {pagamentos.length > 0 && (
        <ul className="pdv-pay-list" aria-label="Pagamentos lançados">
          {pagamentos.map((p, index) => {
            const trocoLinha = p.valor_recebido != null ? calcularTroco(paraCentavos(p.valor), paraCentavos(p.valor_recebido)) : 0;
            return (
              <li className="pdv-pay-item" key={index}>
                <span className="pdv-pay-item-check" aria-hidden="true"><Check size={14} strokeWidth={3} /></span>
                <span className="pdv-pay-item-forma">
                  {rotuloForma(p.forma_pagamento)}
                  {p.numero_parcelas > 1 && <small> · {p.numero_parcelas}x</small>}
                  {p.forma_pagamento === 'dinheiro' && p.valor_recebido != null && (
                    <small className="pdv-pay-item-detalhe">
                      Recebido {formatarMoeda(p.valor_recebido)}
                      {trocoLinha > 0 && ` · Troco ${formatarMoeda(deCentavos(trocoLinha))}`}
                    </small>
                  )}
                </span>
                <strong className="pdv-pay-item-valor">{formatarMoeda(p.valor)}</strong>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm pdv-pay-item-remove"
                  onClick={() => onRemover(index)}
                  aria-label={`Remover pagamento ${rotuloForma(p.forma_pagamento)} de ${formatarMoeda(p.valor)}`}
                >
                  Remover
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {temSaldo ? (
        <>
          <fieldset className="pdv-pay-formas">
            <legend className="input-label">Como o cliente vai pagar?</legend>
            <div className="pdv-pay-formas-grid">
              {FORMAS_PAGAMENTO.map(f => (
                <label key={f.valor} className={`pdv-pay-forma ${forma === f.valor ? 'pdv-pay-forma--ativa' : ''}`}>
                  <input
                    type="radio"
                    name="venda-forma-pagamento"
                    value={f.valor}
                    checked={forma === f.valor}
                    onChange={() => escolherForma(f.valor)}
                  />
                  <span>{f.rotulo}</span>
                </label>
              ))}
            </div>
            <CampoErro id="venda-erro-forma" erro={erro} campo="forma" />
          </fieldset>

          <div className="input-wrapper">
            <label className="input-label" htmlFor="venda-valor-pagamento">
              {pagamentos.length > 0 ? 'Valor do próximo pagamento (R$)' : 'Valor (R$)'}
            </label>
            <input
              id="venda-valor-pagamento"
              className="input-field pdv-pay-valor"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={valorTexto}
              aria-invalid={erro.campo === 'valor' || undefined}
              aria-describedby={erro.campo === 'valor' ? 'venda-erro-valor' : undefined}
              onFocus={e => e.target.select()}
              onChange={e => { setEdicao({ texto: sanitizarValorDigitado(e.target.value), base: saldoCentavos }); setErro(SEM_ERRO); }}
              onKeyDown={e => { if (e.key === 'Enter' && forma) { e.preventDefault(); confirmar(); } }}
            />
            <CampoErro id="venda-erro-valor" erro={erro} campo="valor" />
          </div>

          {forma === 'dinheiro' && (
            <div className="input-wrapper">
              <label className="input-label" htmlFor="venda-valor-recebido">
                <Banknote size={13} aria-hidden="true" /> Valor recebido do cliente (R$)
              </label>
              <input
                id="venda-valor-recebido"
                className="input-field pdv-pay-valor"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={recebido}
                placeholder={valorTexto}
                aria-invalid={erro.campo === 'recebido' || undefined}
                aria-describedby={erro.campo === 'recebido' ? 'venda-erro-recebido' : undefined}
                onChange={e => { setRecebido(sanitizarValorDigitado(e.target.value)); setErro(SEM_ERRO); }}
              />
              <CampoErro id="venda-erro-recebido" erro={erro} campo="recebido" />
              <dl className="pdv-pay-troco" aria-live="polite">
                <div><dt>Valor da venda</dt><dd>{formatarMoeda(deCentavos(valorCentavos ?? 0))}</dd></div>
                <div><dt>Recebido</dt><dd>{formatarMoeda(deCentavos(recebidoCentavos ?? valorCentavos ?? 0))}</dd></div>
                <div className="pdv-pay-troco-total"><dt>Troco</dt><dd>{formatarMoeda(deCentavos(troco))}</dd></div>
              </dl>
            </div>
          )}

          {(forma === 'credito' || forma === 'crediario') && (
            <div className="pdv-pay-row">
              <div className="input-wrapper">
                <label className="input-label" htmlFor="venda-parcelas">Parcelas</label>
                <input id="venda-parcelas" className="input-field" type="number" min="1" step="1" value={parcelas} onChange={e => setParcelas(e.target.value)} />
                <CampoErro id="venda-erro-parcelas" erro={erro} campo="parcelas" />
              </div>
              {forma === 'crediario' && (
                <div className="input-wrapper">
                  <label className="input-label" htmlFor="venda-meses-prazo">Prazo (meses)</label>
                  <input id="venda-meses-prazo" className="input-field" type="number" min="1" step="1" value={mesesPrazo} onChange={e => setMesesPrazo(e.target.value)} />
                  <CampoErro id="venda-erro-meses" erro={erro} campo="meses" />
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary btn-full pdv-pay-confirmar"
            onClick={confirmar}
            disabled={!forma}
          >
            <Check size={16} />
            {forma
              ? `Confirmar ${rotuloForma(forma)} · ${formatarMoeda(deCentavos(valorCentavos ?? 0))}`
              : 'Escolha a forma de pagamento'}
          </button>
        </>
      ) : null}
    </section>
  );
}
