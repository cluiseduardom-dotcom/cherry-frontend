import { useCallback, useEffect, useState } from 'react';
import { Banknote, ChevronLeft, ChevronRight, Minus, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  abrirSessao, alterarAtivoCaixa, criarCaixa, detalharSessao, listarCaixas, listarSessoes, sessaoAtual,
} from '../services/caixa';
import { horaBr, podeGerirCaixas, podeOperarCaixa, rotuloForma, rotuloTipo, validarAbertura } from '../utils/caixa';
import { lerValor } from '../utils/fiado';
import { formatarMoeda } from '../utils/mascaras';
import MovimentoCaixaModal from '../components/caixa/MovimentoCaixaModal';
import FecharCaixaModal from '../components/caixa/FecharCaixaModal';
import './Caixa.css';

const POR_PAGINA = 15;

function PainelSessao({ detalhe, podeAgir, onMovimento, onFechar }) {
  const { sessao, movimentos, resumo, esperado, por_forma: porForma, conferencias } = detalhe;
  const aberta = sessao.status === 'aberta';

  return (
    <div className="card card-padding caixa-painel">
      <div className="caixa-painel-topo">
        <div>
          <strong>{sessao.caixa_nome}</strong>
          <span className={`caixa-selo ${aberta ? 'aberto' : 'fechado'}`}>{aberta ? 'Aberto' : 'Fechado'}</span>
          <small>{sessao.operador_nome} · aberto em {horaBr(sessao.aberta_em)}{sessao.fechada_em ? ` · fechado em ${horaBr(sessao.fechada_em)}` : ''}</small>
        </div>
        {aberta && podeAgir && (
          <div className="caixa-botoes">
            <button type="button" className="btn btn-ghost" onClick={() => onMovimento('suprimento')}><Plus size={16} /> Suprimento</button>
            <button type="button" className="btn btn-ghost" onClick={() => onMovimento('sangria')}><Minus size={16} /> Sangria</button>
            <button type="button" className="btn btn-primary" onClick={onFechar}>Fechar caixa</button>
          </div>
        )}
      </div>

      <div className="caixa-numeros">
        <div><span>Troco inicial</span><strong>{formatarMoeda(resumo.saldo_inicial)}</strong></div>
        <div><span>Suprimentos</span><strong>{formatarMoeda(resumo.suprimentos)}</strong></div>
        <div><span>Sangrias</span><strong>{formatarMoeda(resumo.sangrias)}</strong></div>
        <div className="destaque"><span>Dinheiro em caixa</span><strong>{formatarMoeda(esperado.dinheiro ?? 0)}</strong></div>
      </div>

      <table className="caixa-tabela">
        <thead><tr><th>Forma</th><th>Vendas</th><th>Recebimentos</th><th>Estornos</th><th>Esperado</th></tr></thead>
        <tbody>
          {Object.entries(porForma).map(([forma, x]) => (
            <tr key={forma}>
              <td>{rotuloForma(forma)}</td>
              <td>{formatarMoeda(x.vendas)}</td>
              <td>{formatarMoeda(x.recebimentos)}</td>
              <td>{formatarMoeda(x.estornos)}</td>
              <td><strong>{formatarMoeda(x.esperado)}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>

      {movimentos.length > 0 && (
        <ul className="caixa-movimentos">
          {movimentos.map((m) => (
            <li key={m.id}>
              <span>{rotuloTipo(m.tipo)} · {m.motivo}</span>
              <span className={m.tipo === 'sangria' ? 'sai' : 'entra'}>{m.tipo === 'sangria' ? '−' : '+'} {formatarMoeda(m.valor)}</span>
            </li>
          ))}
        </ul>
      )}

      {conferencias.length > 0 && (
        <div className="caixa-conferido">
          <strong>Conferência do fechamento</strong>
          <ul>
            {conferencias.map((c) => (
              <li key={c.forma}>
                {rotuloForma(c.forma)}: esperado {formatarMoeda(c.esperado)}, contado {formatarMoeda(c.informado)}
                {c.diferenca !== 0 && <span className={c.diferenca < 0 ? 'sai' : 'entra'}> ({c.diferenca < 0 ? 'falta' : 'sobra'} {formatarMoeda(Math.abs(c.diferenca))})</span>}
              </li>
            ))}
          </ul>
          {sessao.justificativa_divergencia && <p>Justificativa: {sessao.justificativa_divergencia}</p>}
        </div>
      )}
    </div>
  );
}

// Caixa do PDV: abrir, sangria/suprimento e fechamento com conferência (quem opera) e gestão de caixas e sessões (quem gere).
// Só com a funcionalidade `caixa` ligada pela GiroNex; o backend decide de novo cada ação e o esperado é sempre calculado lá.
export default function Caixa() {
  const { user } = useAuth();
  const toast = useToast();
  const opera = podeOperarCaixa(user);
  const gere = podeGerirCaixas(user);

  const [caixas, setCaixas] = useState([]);
  const [minha, setMinha] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [recarga, setRecarga] = useState(0);

  const [caixaId, setCaixaId] = useState('');
  const [saldo, setSaldo] = useState('');
  const [abrindo, setAbrindo] = useState(false);
  const [erroAbrir, setErroAbrir] = useState('');

  const [modalMov, setModalMov] = useState(null); // { sessaoId, tipo, dinheiro }
  const [modalFechar, setModalFechar] = useState(null); // detalhe

  const [novoNome, setNovoNome] = useState('');
  const [criando, setCriando] = useState(false);
  const [sessoes, setSessoes] = useState({ itens: [], total: 0 });
  const [filtroStatus, setFiltroStatus] = useState('');
  const [pagina, setPagina] = useState(1);
  const [escolhida, setEscolhida] = useState(null); // detalhe de outra sessão

  const recarregar = useCallback(() => { setCarregando(true); setRecarga((n) => n + 1); }, []);

  useEffect(() => {
    let cancelado = false;

    Promise.all([listarCaixas(), opera ? sessaoAtual() : Promise.resolve(null)])
      .then(([lista, atual]) => { if (!cancelado) { setCaixas(lista); setMinha(atual); setErro(''); } })
      .catch((e) => { if (!cancelado) setErro(e.message || 'Não foi possível carregar o caixa.'); })
      .finally(() => { if (!cancelado) setCarregando(false); });

    return () => { cancelado = true; };
  }, [opera, recarga]);

  useEffect(() => {
    if (!gere) return undefined;

    let cancelado = false;

    listarSessoes({ status: filtroStatus, pagina, limite: POR_PAGINA })
      .then((r) => { if (!cancelado) setSessoes(r); })
      .catch(() => { if (!cancelado) setSessoes({ itens: [], total: 0 }); });

    return () => { cancelado = true; };
  }, [gere, filtroStatus, pagina, recarga]);

  async function abrir(e) {
    e.preventDefault();

    if (abrindo) return;

    const problema = validarAbertura({ caixaId, saldo });

    if (problema) { setErroAbrir(problema); return; }

    setAbrindo(true);
    setErroAbrir('');

    try {
      await abrirSessao({ caixaId: Number(caixaId), saldoInicial: lerValor(saldo) });
      setCaixaId('');
      setSaldo('');
      toast?.success?.('Caixa aberto.');
      recarregar();
    } catch (err) {
      setErroAbrir(err.message || 'Não foi possível abrir o caixa.');
    } finally {
      setAbrindo(false);
    }
  }

  async function criar(e) {
    e.preventDefault();

    const nome = novoNome.trim();

    if (nome.length < 2 || criando) return;

    setCriando(true);

    try {
      await criarCaixa(nome);
      setNovoNome('');
      recarregar();
    } catch (err) {
      toast?.error?.(err.message || 'Não foi possível criar o caixa.');
    } finally {
      setCriando(false);
    }
  }

  async function alternar(caixa) {
    try {
      await alterarAtivoCaixa(caixa.id, !caixa.ativo);
      recarregar();
    } catch (err) {
      toast?.error?.(err.message || 'Não foi possível alterar o caixa.');
    }
  }

  async function verSessao(id) {
    try {
      setEscolhida(await detalharSessao(id));
    } catch (err) {
      toast?.error?.(err.message || 'Não foi possível abrir a sessão.');
    }
  }

  function depoisDoMovimento() {
    toast?.success?.('Movimento registrado.');
    setEscolhida(null);
    recarregar();
  }

  function depoisDoFechamento(resultado) {
    if (resultado.divergente) toast?.warning?.(resultado.aviso || 'Caixa fechado com diferença.');
    else toast?.success?.('Caixa fechado sem diferença.');

    setEscolhida(null);
    recarregar();
  }

  const livres = caixas.filter((c) => c.ativo && !c.sessao_id);
  const totalPaginas = Math.max(1, Math.ceil(sessoes.total / POR_PAGINA));
  const abrirMov = (detalhe) => (tipo) => setModalMov({ sessaoId: detalhe.sessao.id, tipo, dinheiro: detalhe.esperado.dinheiro ?? 0 });

  return (
    <div className="page-content caixa-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Caixa</h1>
          <p className="page-subtitle">Abertura, sangria e suprimento, e fechamento com conferência.</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={recarregar} disabled={carregando}><RefreshCw size={16} /> Atualizar</button>
      </div>

      {erro && <div className="caixa-erro-pagina" role="alert">{erro}</div>}
      {carregando && <div className="card card-padding" role="status"><span className="spinner" /> Carregando...</div>}

      {!carregando && opera && (
        <section aria-label="Meu caixa">
          <h2 className="caixa-secao">Meu caixa</h2>
          {minha
            ? <PainelSessao detalhe={minha} podeAgir onMovimento={abrirMov(minha)} onFechar={() => setModalFechar(minha)} />
            : (
              <form className="card card-padding caixa-abrir" onSubmit={abrir}>
                <p><Banknote size={16} /> Você não tem caixa aberto. Abra um para vender.</p>
                {livres.length === 0
                  ? <p className="caixa-dica">Nenhum caixa livre. {gere ? 'Cadastre um caixa abaixo.' : 'Peça a um gestor para cadastrar um caixa.'}</p>
                  : (
                    <div className="caixa-abrir-campos">
                      <label className="caixa-campo">
                        <span>Caixa</span>
                        <select className="input" value={caixaId} onChange={(e) => { setErroAbrir(''); setCaixaId(e.target.value); }}>
                          <option value="">Escolha...</option>
                          {livres.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                      </label>
                      <label className="caixa-campo">
                        <span>Troco inicial (R$)</span>
                        <input className="input" inputMode="decimal" value={saldo} onChange={(e) => { setErroAbrir(''); setSaldo(e.target.value); }} placeholder="0,00" />
                      </label>
                      <button type="submit" className="btn btn-primary" disabled={abrindo}>{abrindo ? 'Abrindo...' : 'Abrir caixa'}</button>
                    </div>
                  )}
                {erroAbrir && <p className="caixa-erro" role="alert">{erroAbrir}</p>}
              </form>
            )}
        </section>
      )}

      {!carregando && gere && (
        <>
          <section aria-label="Caixas">
            <h2 className="caixa-secao">Caixas</h2>
            <form className="caixa-novo" onSubmit={criar}>
              <input className="input" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome do novo caixa (ex.: Balcão 1)" maxLength={60} aria-label="Nome do novo caixa" />
              <button type="submit" className="btn btn-primary" disabled={criando || novoNome.trim().length < 2}>Cadastrar</button>
            </form>
            <ul className="caixa-lista">
              {caixas.map((c) => (
                <li key={c.id} className="card card-padding">
                  <div>
                    <strong>{c.nome}</strong>
                    <small>{!c.ativo ? 'Desativado' : c.sessao_id ? `Aberto por ${c.operador_nome}` : 'Livre'}</small>
                  </div>
                  <button type="button" className="btn btn-ghost" onClick={() => alternar(c)} disabled={Boolean(c.sessao_id)} title={c.sessao_id ? 'Feche o caixa antes de desativar' : undefined}>
                    {c.ativo ? 'Desativar' : 'Reativar'}
                  </button>
                </li>
              ))}
              {caixas.length === 0 && <li className="card card-padding">Nenhum caixa cadastrado.</li>}
            </ul>
          </section>

          <section aria-label="Sessões">
            <h2 className="caixa-secao">Sessões</h2>
            <select className="input caixa-filtro" value={filtroStatus} onChange={(e) => { setPagina(1); setFiltroStatus(e.target.value); }} aria-label="Filtrar sessões por situação">
              <option value="">Todas</option>
              <option value="aberta">Abertas</option>
              <option value="fechada">Fechadas</option>
            </select>
            <ul className="caixa-lista">
              {sessoes.itens.map((s) => (
                <li key={s.id} className="card card-padding">
                  <div>
                    <strong>{s.caixa_nome}</strong>
                    <small>{s.operador_nome} · {horaBr(s.aberta_em)} · {s.status === 'aberta' ? 'aberta' : 'fechada'}</small>
                  </div>
                  <button type="button" className="btn btn-ghost" onClick={() => verSessao(s.id)}>Ver</button>
                </li>
              ))}
              {sessoes.itens.length === 0 && <li className="card card-padding">Nenhuma sessão encontrada.</li>}
            </ul>
            {totalPaginas > 1 && (
              <div className="caixa-paginacao">
                <button type="button" className="btn btn-ghost" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}><ChevronLeft size={16} /> Anterior</button>
                <span>Página {pagina} de {totalPaginas}</span>
                <button type="button" className="btn btn-ghost" disabled={pagina >= totalPaginas} onClick={() => setPagina(pagina + 1)}>Próxima <ChevronRight size={16} /></button>
              </div>
            )}
            {escolhida && (
              <div className="caixa-escolhida">
                <PainelSessao detalhe={escolhida} podeAgir onMovimento={abrirMov(escolhida)} onFechar={() => setModalFechar(escolhida)} />
                <button type="button" className="btn btn-ghost" onClick={() => setEscolhida(null)}>Esconder</button>
              </div>
            )}
          </section>
        </>
      )}

      {modalMov && (
        <MovimentoCaixaModal
          key={`${modalMov.sessaoId}-${modalMov.tipo}`}
          sessaoId={modalMov.sessaoId}
          tipoInicial={modalMov.tipo}
          dinheiroEmCaixa={modalMov.dinheiro}
          onClose={() => setModalMov(null)}
          onSuccess={depoisDoMovimento}
        />
      )}
      {modalFechar && <FecharCaixaModal key={modalFechar.sessao.id} detalhe={modalFechar} onClose={() => setModalFechar(null)} onSuccess={depoisDoFechamento} />}
    </div>
  );
}
