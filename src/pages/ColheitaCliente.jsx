import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  cobrancaFiado, estornarLancamentoFiado, extratoFiado, lancarCompraFiado, lancarPagamentoFiado,
} from '../services/fiado';
import { formatarMoeda } from '../utils/mascaras';
import {
  FORMAS_PAGAMENTO, LIMITE_DESCRICAO, LIMITE_MOTIVO, dataBr, efeitoDoLancamento, lerValor, novaChave,
  tituloDoLancamento, validarCompra, validarMotivo, validarPagamento, valorParaCampo,
} from '../utils/fiado';
import './Colheita.css';

const POR_PAGINA = 20;

// Hoje no calendário local (AAAA-MM-DD), para limitar o campo de data sem passar por UTC.
function hojeLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Cliente da Colheita: saldo, lançar dívida, receber pagamento (parcial ou total), cobrar e o extrato. Só o admin estorna.
// Cada tentativa de lançamento tem uma Idempotency-Key: repetir o clique ou "tentar de novo" nunca lança em dobro, e a chave
// muda sempre que o usuário altera um campo (outro conteúdo = outra chave).
export default function ColheitaCliente() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const ehAdmin = user?.role === 'admin';

  const [extrato, setExtrato] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [recarga, setRecarga] = useState(0);
  const [acao, setAcao] = useState(null);
  const [form, setForm] = useState({ valor: '', descricao: '', data: '', forma: '' });
  const [problema, setProblema] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [estornando, setEstornando] = useState(null);
  const [motivo, setMotivo] = useState('');
  const chave = useRef(novaChave());

  const recarregar = () => { setCarregando(true); setRecarga((n) => n + 1); };

  useEffect(() => {
    let cancelado = false;

    extratoFiado(id, { pagina, limite: POR_PAGINA })
      .then((dados) => { if (!cancelado) { setExtrato(dados); setErro(''); } })
      .catch((e) => { if (!cancelado) setErro(e.message || 'Não foi possível carregar o cliente.'); })
      .finally(() => { if (!cancelado) setCarregando(false); });

    return () => { cancelado = true; };
  }, [id, pagina, recarga]);

  const saldo = extrato?.saldo ?? 0;

  function abrir(tipo) {
    chave.current = novaChave();
    setProblema('');
    setForm({ valor: '', descricao: '', data: '', forma: '' });
    setAcao(acao === tipo ? null : tipo);
  }

  const campo = (nome) => (e) => {
    chave.current = novaChave();
    setProblema('');
    setForm((atual) => ({ ...atual, [nome]: e.target.value }));
  };

  async function enviar(e) {
    e.preventDefault();

    const erroDeCampo = acao === 'compra' ? validarCompra(form) : validarPagamento(form, saldo);

    if (erroDeCampo) { setProblema(erroDeCampo); return; }

    setEnviando(true);

    try {
      const valor = lerValor(form.valor);

      if (acao === 'compra') {
        await lancarCompraFiado(id, { valor, descricao: form.descricao.trim(), data: form.data || undefined }, chave.current);
        toast?.success?.('Dívida lançada.');
      } else {
        await lancarPagamentoFiado(id, { valor, forma: form.forma || undefined, data: form.data || undefined }, chave.current);
        toast?.success?.('Pagamento registrado.');
      }

      chave.current = novaChave();
      setAcao(null);
      setForm({ valor: '', descricao: '', data: '', forma: '' });
      setPagina(1);
      recarregar();
    } catch (err) {
      setProblema(err.message || 'Não foi possível salvar.');
    } finally {
      setEnviando(false);
    }
  }

  async function confirmarEstorno(lancamento) {
    const invalido = validarMotivo(motivo);

    if (invalido) { toast?.error?.(invalido); return; }

    setEnviando(true);

    try {
      await estornarLancamentoFiado(lancamento.id, motivo.trim(), chave.current);
      toast?.success?.('Lançamento estornado. O histórico foi mantido.');
      chave.current = novaChave();
      setEstornando(null);
      setMotivo('');
      recarregar();
    } catch (err) {
      toast?.error?.(err.message || 'Não foi possível estornar.');
    } finally {
      setEnviando(false);
    }
  }

  async function cobrar() {
    try {
      const { link_whatsapp: link } = await cobrancaFiado(id);
      window.open(link, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast?.error?.(e.message || 'Não foi possível montar a cobrança.');
    }
  }

  if (erro) {
    return (
      <div className="page-content colheita-page">
        <Link to="/colheita" className="btn btn-ghost"><ArrowLeft size={16} /> Voltar</Link>
        <div className="colheita-erro" role="alert">{erro}</div>
      </div>
    );
  }

  if (!extrato) return <div className="page-content colheita-page"><div className="card card-padding" role="status"><span className="spinner" /> Carregando...</div></div>;

  const porId = new Map(extrato.lancamentos.map((l) => [l.id, l]));
  const totalPaginas = Math.max(1, Math.ceil(extrato.total_lancamentos / POR_PAGINA));
  const hoje = hojeLocal();

  return (
    <div className="page-content colheita-page">
      <div className="page-header">
        <div>
          <Link to="/colheita" className="colheita-voltar"><ArrowLeft size={14} /> Colheita</Link>
          <h1 className="page-title">{extrato.cliente.nome}</h1>
          {extrato.cliente.telefone && <p className="page-subtitle">{extrato.cliente.telefone}</p>}
        </div>
      </div>

      <section className="card card-padding colheita-saldo" aria-label="Saldo">
        <span className="colheita-numero-rotulo">Saldo devedor</span>
        <strong className={saldo > 0 ? 'deve' : ''}>{saldo > 0 ? formatarMoeda(saldo) : 'Em dia'}</strong>
      </section>

      <div className="colheita-acoes">
        <button type="button" className={`btn ${acao === 'compra' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => abrir('compra')}>Lançar dívida</button>
        <button type="button" className={`btn ${acao === 'pagamento' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => abrir('pagamento')} disabled={saldo <= 0}>Receber pagamento</button>
        <button type="button" className="btn btn-ghost" onClick={cobrar} disabled={saldo <= 0}><MessageCircle size={16} /> Cobrar no WhatsApp</button>
      </div>

      {acao && (
        <form noValidate className="card card-padding colheita-form" onSubmit={enviar}>
          <h2 className="colheita-form-titulo">{acao === 'compra' ? 'Lançar dívida' : 'Receber pagamento'}</h2>

          <label className="colheita-campo">
            <span>Valor (R$)</span>
            <input className="input" type="text" inputMode="decimal" value={form.valor} onChange={campo('valor')} placeholder="0,00" autoFocus />
          </label>
          {acao === 'pagamento' && (
            <button type="button" className="btn btn-ghost colheita-tudo" onClick={() => { chave.current = novaChave(); setProblema(''); setForm((a) => ({ ...a, valor: valorParaCampo(saldo) })); }}>
              Receber tudo ({formatarMoeda(saldo)})
            </button>
          )}
          {acao === 'compra' && (
            <label className="colheita-campo">
              <span>O que foi comprado</span>
              <input className="input" type="text" maxLength={LIMITE_DESCRICAO} value={form.descricao} onChange={campo('descricao')} placeholder="Ex.: compras do mês" />
            </label>
          )}
          {acao === 'pagamento' && (
            <label className="colheita-campo">
              <span>Como pagou (opcional)</span>
              <select className="input" value={form.forma} onChange={campo('forma')}>
                {FORMAS_PAGAMENTO.map((f) => <option key={f.valor} value={f.valor}>{f.rotulo}</option>)}
              </select>
            </label>
          )}
          <label className="colheita-campo">
            <span>Data (opcional; em branco = hoje)</span>
            <input className="input" type="date" max={hoje} value={form.data} onChange={campo('data')} />
          </label>

          {problema && <p className="colheita-erro" role="alert">{problema}</p>}
          <div className="colheita-form-acoes">
            <button type="submit" className="btn btn-primary" disabled={enviando}>{enviando ? 'Salvando...' : 'Salvar'}</button>
            <button type="button" className="btn btn-ghost" onClick={() => setAcao(null)} disabled={enviando}>Cancelar</button>
          </div>
        </form>
      )}

      {extrato.crediario.parcelas.length > 0 && (
        <section className="card card-padding colheita-crediario" aria-label="Crediário do PDV">
          <h2 className="colheita-form-titulo">Crediário (vendas parceladas): {formatarMoeda(extrato.crediario.total)} a receber</h2>
          <p className="text-sm text-secondary">Só para consulta. Para receber uma parcela, use <Link to="/contas-receber">Contas a Receber</Link>.</p>
          <ul className="colheita-extrato">
            {extrato.crediario.parcelas.map((p) => (
              <li key={p.id}>
                <span>{p.descricao} · vence {dataBr(p.data_vencimento)}{p.valor_restante !== undefined && p.valor_restante < p.valor ? ` · já recebido ${formatarMoeda(p.valor - p.valor_restante)} de ${formatarMoeda(p.valor)}` : ''}</span>
                <strong>{formatarMoeda(p.valor_restante ?? p.valor)}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Extrato">
        <h2 className="colheita-form-titulo">Extrato</h2>
        {carregando && <div className="card card-padding" role="status"><span className="spinner" /> Carregando...</div>}
        {!carregando && extrato.lancamentos.length === 0 && <div className="card card-padding colheita-vazio"><p>Nenhum lançamento ainda.</p></div>}

        <ul className="colheita-extrato">
          {extrato.lancamentos.map((l) => {
            const efeito = efeitoDoLancamento(l, porId);

            return (
              <li key={l.id} className={`card card-padding colheita-lancamento${l.estornado ? ' estornado' : ''}`}>
                <div className="colheita-lancamento-topo">
                  <div>
                    <strong>{tituloDoLancamento(l)}</strong>
                    {l.estornado && <span className="colheita-selo">Estornado</span>}
                    <div className="colheita-lancamento-info">{dataBr(l.data_lancamento)}{l.descricao ? ` · ${l.descricao}` : ''}{l.motivo ? ` · Motivo: ${l.motivo}` : ''}</div>
                  </div>
                  <strong className={`colheita-valor ${efeito}`}>{efeito === 'reduz' ? '−' : efeito === 'aumenta' ? '+' : ''}{formatarMoeda(l.valor)}</strong>
                </div>

                {ehAdmin && l.tipo !== 'estorno' && !l.estornado && estornando !== l.id && (
                  <button type="button" className="btn btn-ghost colheita-estornar" onClick={() => { chave.current = novaChave(); setMotivo(''); setEstornando(l.id); }}>Estornar</button>
                )}
                {estornando === l.id && (
                  <div className="colheita-estorno">
                    <label className="colheita-campo">
                      <span>Motivo do estorno</span>
                      <input className="input" type="text" maxLength={LIMITE_MOTIVO} value={motivo} onChange={(e) => { chave.current = novaChave(); setMotivo(e.target.value); }} autoFocus />
                    </label>
                    <div className="colheita-form-acoes">
                      <button type="button" className="btn btn-primary" onClick={() => confirmarEstorno(l)} disabled={enviando}>Confirmar estorno</button>
                      <button type="button" className="btn btn-ghost" onClick={() => setEstornando(null)} disabled={enviando}>Cancelar</button>
                    </div>
                    <p className="text-sm text-secondary">O lançamento não é apagado: nasce um estorno e o histórico fica.</p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {totalPaginas > 1 && (
          <div className="colheita-paginacao">
            <button type="button" className="btn btn-ghost" disabled={pagina <= 1} onClick={() => { setCarregando(true); setPagina(pagina - 1); }}><ChevronLeft size={16} /> Anteriores</button>
            <span>Página {pagina} de {totalPaginas}</span>
            <button type="button" className="btn btn-ghost" disabled={pagina >= totalPaginas} onClick={() => { setCarregando(true); setPagina(pagina + 1); }}>Mais antigos <ChevronRight size={16} /></button>
          </div>
        )}
      </section>
    </div>
  );
}
