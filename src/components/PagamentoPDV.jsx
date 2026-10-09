import { useEffect, useRef, useState } from 'react';
import {
  Banknote, Check, Clock, CreditCard, HandCoins, QrCode, Wallet, X, XCircle,
} from 'lucide-react';
import { formatarMoeda } from '../utils/mascaras';
import {
  FORMAS_PAGAMENTO,
  MAX_PARCELAS,
  OPCOES_PARCELAS,
  STATUS_PAGAMENTO,
  calcularTroco,
  deCentavos,
  descreverParcelas,
  montarPagamento,
  paraCentavos,
  rotuloForma,
  rotuloStatusPagamento,
  sanitizarValorDigitado,
  textoValorExibido,
  vencimentoParcela,
  vencimentosCrediario,
} from '../utils/pagamentoVenda';
import './PagamentoPDV.css';

const SEM_ERRO = { campo: '', mensagem: '' };

const ICONE_FORMA = {
  pix: QrCode,
  debito: Wallet,
  credito: CreditCard,
  dinheiro: Banknote,
  crediario: HandCoins,
};

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
 * Pagamento do PDV, comandado pelo SALDO RESTANTE.
 *
 *  TOTAL / RESTANTE  ->  VALOR do próximo pagamento (já = o que falta)  ->
 *  FORMAS (cards grandes)  ->  PAGAMENTOS realizados.
 *
 * Tocar em PIX ou Débito já registra o pagamento com o valor que está no
 * campo — sem "adicionar", sem redigitar. Dinheiro, Crédito e Crediário abrem
 * um passo curto na própria tela (valor recebido / parcelas). PIX nasce
 * "Aguardando pagamento": só reduz o Restante depois que o operador confirma o
 * recebimento. Para dividir a venda, basta editar o valor antes de tocar na
 * forma; depois de cada pagamento o campo volta sozinho ao que ainda falta.
 */
export default function PagamentoPDV({
  resumo,
  pagamentos,
  temCliente,
  onAdicionar,
  onConfirmarPendente,
  onRecusarPendente,
  onRemover,
  passoInicial = null, // só para testes de renderização: abre o passo de uma forma
  parcelasIniciais = '1',
}) {
  const [edicao, setEdicao] = useState(null); // { texto, base } — valor editado à mão
  const [passo, setPasso] = useState(passoInicial); // forma que pede um detalhe antes de registrar
  const [recebido, setRecebido] = useState('');
  const [parcelas, setParcelas] = useState(parcelasIniciais);
  const [mesesPrazo, setMesesPrazo] = useState('1');
  const [erroBruto, setErro] = useState(SEM_ERRO);
  const passoRef = useRef(null);

  // O passo abre abaixo dos cards: em telas baixas/estreitas ele pode ficar fora
  // da área visível do carrinho, então traz para a vista ao abrir.
  useEffect(() => {
    if (passo) passoRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [passo]);

  // "Crediário exige um cliente" não deve sobreviver depois de escolher o cliente.
  const erro = erroBruto.campo === 'forma' && temCliente ? SEM_ERRO : erroBruto;

  const { saldoCentavos, alocavelCentavos, completo, excedente } = resumo;
  // O campo sempre sugere o que ainda pode ser alocado (restante menos o que
  // está reservado em PIX aguardando).
  const valorTexto = textoValorExibido(edicao, alocavelCentavos);
  const valorCentavos = paraCentavos(valorTexto);
  const recebidoCentavos = paraCentavos(recebido);
  const podePagar = alocavelCentavos > 0;

  function limparEntrada() {
    setEdicao(null);
    setPasso(null);
    setRecebido('');
    setParcelas('1');
    setMesesPrazo('1');
    setErro(SEM_ERRO);
  }

  function registrar(forma) {
    const r = montarPagamento({
      forma,
      textoValor: valorTexto,
      saldoCentavos: alocavelCentavos,
      textoRecebido: recebido,
      parcelas,
      mesesPrazo,
      temCliente,
    });
    if (r.erro) {
      setErro({ campo: r.campo, mensagem: r.erro });
      return false;
    }
    onAdicionar(r.pagamento);
    limparEntrada(); // próximo valor = o que ainda falta, sem redigitar
    return true;
  }

  function tocarForma(f) {
    setErro(SEM_ERRO);
    if (f.detalhe) {
      setPasso(passo === f.valor ? null : f.valor);
      return;
    }
    setPasso(null);
    registrar(f.valor);
  }

  const formaDoPasso = FORMAS_PAGAMENTO.find(f => f.valor === passo);
  const trocoPasso = calcularTroco(valorCentavos, recebidoCentavos);

  // Resumo das parcelas ("3x de R$ 23,33") só quando os dados são válidos.
  const nParcelasPasso = Number(parcelas);
  const parcelasValidas = Number.isInteger(nParcelasPasso) && nParcelasPasso >= 1 && nParcelasPasso <= MAX_PARCELAS
    && valorCentavos !== null && valorCentavos >= nParcelasPasso;
  const nMesesPasso = Number(mesesPrazo);
  const mesesValidos = Number.isInteger(nMesesPasso) && nMesesPasso >= 1;

  const estadoRestante = excedente ? 'excesso' : completo ? 'ok' : 'falta';

  // Índices originais são preservados: onConfirmar/onRecusar/onRemover agem por índice.
  const itens = pagamentos.map((p, index) => ({ p, index }));
  const pendentes = itens.filter(({ p }) => p.status === STATUS_PAGAMENTO.PENDENTE);
  const realizados = itens.filter(({ p }) => p.status !== STATUS_PAGAMENTO.PENDENTE);

  function renderItem({ p, index }) {
    const status = p.status ?? STATUS_PAGAMENTO.CONFIRMADO;
    const trocoLinha = p.valor_recebido != null ? calcularTroco(paraCentavos(p.valor), paraCentavos(p.valor_recebido)) : 0;
    const nome = rotuloForma(p.forma_pagamento);
    return (
      <li className={`pdv-pay-item pdv-pay-item--${status}`} key={index}>
        <div className="pdv-pay-item-linha">
          <span className="pdv-pay-item-icone" aria-hidden="true">
            {status === STATUS_PAGAMENTO.CONFIRMADO && <Check size={14} strokeWidth={3} />}
            {status === STATUS_PAGAMENTO.PENDENTE && <Clock size={14} strokeWidth={2.5} />}
            {status === STATUS_PAGAMENTO.RECUSADO && <XCircle size={14} strokeWidth={2.5} />}
          </span>
          <span className="pdv-pay-item-forma">
            <span className="pdv-pay-item-nome">
              {nome}
              {p.numero_parcelas > 1 && (
                <small> · {descreverParcelas(paraCentavos(p.valor), p.numero_parcelas)}</small>
              )}
            </span>
            <small className="pdv-pay-item-status">
              {rotuloStatusPagamento(p)}
              {p.forma_pagamento === 'crediario' && status === STATUS_PAGAMENTO.CONFIRMADO && (
                <> · 1º venc. {vencimentoParcela(p.meses_prazo ?? 1)}</>
              )}
              {p.forma_pagamento === 'dinheiro' && p.valor_recebido != null && (
                <> · Recebido {formatarMoeda(p.valor_recebido)}{trocoLinha > 0 && ` · Troco ${formatarMoeda(deCentavos(trocoLinha))}`}</>
              )}
            </small>
          </span>
          <strong className="pdv-pay-item-valor">{formatarMoeda(p.valor)}</strong>
          <button
            type="button"
            className="pdv-pay-item-remove"
            onClick={() => onRemover(index)}
            aria-label={`Remover pagamento ${nome} de ${formatarMoeda(p.valor)}`}
            title="Remover pagamento"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        {status === STATUS_PAGAMENTO.PENDENTE && (
          <div className="pdv-pay-item-acoes">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => onConfirmarPendente(index)}>
              <Check size={14} /> Confirmar recebimento
            </button>
            <button type="button" className="btn btn-ghost btn-sm pdv-pay-item-recusar" onClick={() => onRecusarPendente(index)}>
              Recusado
            </button>
          </div>
        )}
      </li>
    );
  }

  return (
    <section className="pdv-pay" aria-label="Pagamento">
      {/* 1. TOTAL -> RESTANTE */}
      <div className={`pdv-pay-hero pdv-pay-hero--${estadoRestante}`} role="status" aria-live="polite">
        <div className="pdv-pay-hero-total">
          <span>Total</span>
          <strong>{formatarMoeda(deCentavos(resumo.totalCentavos))}</strong>
        </div>
        <div className="pdv-pay-hero-restante">
          <span>{excedente ? 'Excedente' : completo ? 'Pagamento completo' : 'Restante'}</span>
          <strong>{formatarMoeda(deCentavos(Math.abs(saldoCentavos)))}</strong>
        </div>
      </div>

      {/* Pagamentos aguardando confirmação: logo abaixo do Restante, para o
          "Confirmar recebimento" estar sempre à vista (não conta como pago ainda) */}
      {pendentes.length > 0 && (
        <div className="pdv-pay-lista-bloco pdv-pay-lista-bloco--pendentes">
          <h3 className="pdv-pay-subtitulo">Aguardando confirmação · ainda não conta como pago</h3>
          <ul className="pdv-pay-list" aria-label="Pagamentos aguardando confirmação">
            {pendentes.map(renderItem)}
          </ul>
        </div>
      )}

      {/* 2 e 3. VALOR do próximo pagamento -> FORMAS */}
      {podePagar && (
        <div className="pdv-pay-entrada">
          <div className="input-wrapper">
            <label className="input-label" htmlFor="venda-valor-pagamento">
              {pagamentos.length > 0 ? 'Valor do próximo pagamento' : 'Valor do pagamento'}
            </label>
            <div className="pdv-pay-valor-wrap">
              <span className="pdv-pay-valor-prefixo" aria-hidden="true">R$</span>
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
                onChange={e => {
                  setEdicao({ texto: sanitizarValorDigitado(e.target.value), base: alocavelCentavos });
                  setErro(SEM_ERRO);
                }}
              />
            </div>
            <CampoErro id="venda-erro-valor" erro={erro} campo="valor" />
          </div>

          <fieldset className="pdv-pay-formas">
            <legend className="input-label">Como o cliente vai pagar?</legend>
            <div className="pdv-pay-formas-grid">
              {FORMAS_PAGAMENTO.map(f => {
                const Icone = ICONE_FORMA[f.valor];
                return (
                  <button
                    key={f.valor}
                    type="button"
                    className={`pdv-pay-forma pdv-pay-forma--${f.valor} ${passo === f.valor ? 'pdv-pay-forma--ativa' : ''}`}
                    aria-pressed={passo === f.valor}
                    onClick={() => tocarForma(f)}
                  >
                    <Icone size={20} aria-hidden="true" />
                    <span>{f.rotulo}</span>
                  </button>
                );
              })}
            </div>
            <CampoErro id="venda-erro-forma" erro={erro} campo="forma" />
          </fieldset>

          {formaDoPasso && (
            <div className="pdv-pay-passo" ref={passoRef}>
              {formaDoPasso.detalhe === 'recebido' && (
                <div className="input-wrapper">
                  <label className="input-label" htmlFor="venda-valor-recebido">Valor recebido do cliente</label>
                  <div className="pdv-pay-valor-wrap">
                    <span className="pdv-pay-valor-prefixo" aria-hidden="true">R$</span>
                    <input
                      id="venda-valor-recebido"
                      className="input-field pdv-pay-valor"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      autoFocus
                      value={recebido}
                      placeholder={valorTexto}
                      aria-invalid={erro.campo === 'recebido' || undefined}
                      aria-describedby={erro.campo === 'recebido' ? 'venda-erro-recebido' : undefined}
                      onChange={e => { setRecebido(sanitizarValorDigitado(e.target.value)); setErro(SEM_ERRO); }}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); registrar('dinheiro'); } }}
                    />
                  </div>
                  <CampoErro id="venda-erro-recebido" erro={erro} campo="recebido" />
                  <dl className="pdv-pay-troco" aria-live="polite">
                    <div><dt>Valor da venda</dt><dd>{formatarMoeda(deCentavos(valorCentavos ?? 0))}</dd></div>
                    <div><dt>Recebido</dt><dd>{formatarMoeda(deCentavos(recebidoCentavos ?? valorCentavos ?? 0))}</dd></div>
                    <div className="pdv-pay-troco-total"><dt>Troco</dt><dd>{formatarMoeda(deCentavos(trocoPasso))}</dd></div>
                  </dl>
                </div>
              )}

              {(formaDoPasso.detalhe === 'parcelas' || formaDoPasso.detalhe === 'crediario') && (
                <div className="pdv-pay-parcelamento">
                  <div role="group" aria-label="Número de parcelas" className="pdv-pay-parcelas-chips">
                    {OPCOES_PARCELAS.map(n => (
                      <button
                        key={n}
                        type="button"
                        className={`pdv-pay-chip ${Number(parcelas) === n ? 'pdv-pay-chip--ativo' : ''}`}
                        aria-pressed={Number(parcelas) === n}
                        onClick={() => { setParcelas(String(n)); setErro(SEM_ERRO); }}
                      >
                        {n}x
                      </button>
                    ))}
                  </div>
                  <div className="pdv-pay-row">
                    <div className="input-wrapper">
                      <label className="input-label" htmlFor="venda-parcelas">Outro nº (máx. {MAX_PARCELAS})</label>
                      <input
                        id="venda-parcelas"
                        className="input-field"
                        type="number"
                        min="1"
                        max={MAX_PARCELAS}
                        step="1"
                        value={parcelas}
                        aria-invalid={erro.campo === 'parcelas' || undefined}
                        aria-describedby={erro.campo === 'parcelas' ? 'venda-erro-parcelas' : undefined}
                        onChange={e => { setParcelas(e.target.value); setErro(SEM_ERRO); }}
                      />
                    </div>
                    {formaDoPasso.detalhe === 'crediario' && (
                      <div className="input-wrapper">
                        <label className="input-label" htmlFor="venda-meses-prazo">Prazo (meses)</label>
                        <input
                          id="venda-meses-prazo"
                          className="input-field"
                          type="number"
                          min="1"
                          step="1"
                          value={mesesPrazo}
                          aria-invalid={erro.campo === 'meses' || undefined}
                          aria-describedby={erro.campo === 'meses' ? 'venda-erro-meses' : undefined}
                          onChange={e => { setMesesPrazo(e.target.value); setErro(SEM_ERRO); }}
                        />
                      </div>
                    )}
                  </div>
                  <CampoErro id="venda-erro-parcelas" erro={erro} campo="parcelas" />
                  <CampoErro id="venda-erro-meses" erro={erro} campo="meses" />
                  {parcelasValidas && (
                    <p className="pdv-pay-parcelas-resumo" aria-live="polite">
                      <strong>{descreverParcelas(valorCentavos, nParcelasPasso)}</strong>
                      {formaDoPasso.detalhe === 'crediario' && mesesValidos && (() => {
                        const v = vencimentosCrediario(nParcelasPasso, nMesesPasso);
                        return <small>A receber · 1º venc. {v.primeiro}{nParcelasPasso > 1 && ` · último ${v.ultimo}`}</small>;
                      })()}
                    </p>
                  )}
                </div>
              )}

              <div className="pdv-pay-passo-acoes">
                <button type="button" className="btn btn-ghost" onClick={() => { setPasso(null); setErro(SEM_ERRO); }}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-primary pdv-pay-confirmar" onClick={() => registrar(formaDoPasso.valor)}>
                  <Check size={16} />
                  <span>Confirmar {formaDoPasso.rotulo} · {formatarMoeda(deCentavos(valorCentavos ?? 0))}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. PAGAMENTOS realizados (pagos e recusados; os aguardando ficam no topo) */}
      {realizados.length > 0 && (
        <div className="pdv-pay-lista-bloco">
          <h3 className="pdv-pay-subtitulo">Pagamentos realizados</h3>
          <ul className="pdv-pay-list" aria-label="Pagamentos lançados">
            {realizados.map(renderItem)}
          </ul>
        </div>
      )}
    </section>
  );
}
