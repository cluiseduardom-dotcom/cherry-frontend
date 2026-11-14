import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MessageCircle, RefreshCw, Search } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { cobrancaFiado, listarClientesFiado, resumoFiado } from '../services/fiado';
import { formatarMoeda } from '../utils/mascaras';
import { dataBr } from '../utils/fiado';
import './Colheita.css';

const POR_PAGINA = 20;

// Colheita (fiado): quanto cada cliente deve, quanto já pagou e a cobrança pelo WhatsApp. Só admin e vendedor, só com a
// funcionalidade `fiado` ligada pela GiroNex; o backend decide de novo. O vendedor só vê os clientes que cadastrou.
export default function Colheita() {
  const toast = useToast();
  const [resumo, setResumo] = useState(null);
  const [dados, setDados] = useState({ itens: [], total: 0 });
  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [soDevedores, setSoDevedores] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [recarga, setRecarga] = useState(0);
  const [cobrando, setCobrando] = useState(0);
  const ultimaBusca = useRef('');

  const recarregar = () => { setCarregando(true); setRecarga((n) => n + 1); };

  // A busca só dispara depois de uma pausa na digitação.
  useEffect(() => {
    const espera = setTimeout(() => {
      const nova = busca.trim();

      if (nova === ultimaBusca.current) return;

      ultimaBusca.current = nova;
      setCarregando(true);
      setPagina(1);
      setBuscaAplicada(nova);
    }, 350);

    return () => clearTimeout(espera);
  }, [busca]);

  useEffect(() => {
    let cancelado = false;

    resumoFiado()
      .then((r) => { if (!cancelado) setResumo(r); })
      .catch(() => { if (!cancelado) setResumo(null); });

    return () => { cancelado = true; };
  }, [recarga]);

  useEffect(() => {
    let cancelado = false;

    listarClientesFiado({ busca: buscaAplicada, comSaldo: soDevedores, pagina, limite: POR_PAGINA })
      .then((resposta) => { if (!cancelado) { setDados(resposta); setErro(''); } })
      .catch((e) => { if (!cancelado) setErro(e.message || 'Não foi possível carregar os clientes.'); })
      .finally(() => { if (!cancelado) setCarregando(false); });

    return () => { cancelado = true; };
  }, [buscaAplicada, soDevedores, pagina, recarga]);

  async function cobrar(cliente) {
    setCobrando(cliente.id);

    try {
      const { link_whatsapp: link } = await cobrancaFiado(cliente.id);
      // O WhatsApp abre com a mensagem pronta; quem revisa e envia é o comerciante.
      window.open(link, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast?.error?.(e.message || 'Não foi possível montar a cobrança.');
    } finally {
      setCobrando(0);
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(dados.total / POR_PAGINA));

  return (
    <div className="page-content colheita-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Colheita</h1>
          <p className="page-subtitle">Fiado e cobranças: quem deve, quanto e desde quando.</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={recarregar} disabled={carregando}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>

      {resumo && (
        <section className="colheita-resumo" aria-label="Resumo">
          <div className="card card-padding colheita-numero destaque">
            <span className="colheita-numero-rotulo">A receber</span>
            <strong>{formatarMoeda(resumo.total_a_receber)}</strong>
            <small>{resumo.clientes_devedores} {resumo.clientes_devedores === 1 ? 'cliente' : 'clientes'} com saldo</small>
          </div>
          <div className="card card-padding colheita-numero">
            <span className="colheita-numero-rotulo">Dívidas lançadas</span>
            <strong>{formatarMoeda(resumo.periodo.compras)}</strong>
            <small>{dataBr(resumo.periodo.de)} a {dataBr(resumo.periodo.ate)}</small>
          </div>
          <div className="card card-padding colheita-numero">
            <span className="colheita-numero-rotulo">Recebido</span>
            <strong>{formatarMoeda(resumo.periodo.pagamentos)}</strong>
            <small>{dataBr(resumo.periodo.de)} a {dataBr(resumo.periodo.ate)}</small>
          </div>
        </section>
      )}

      {resumo && resumo.crediario_a_receber > 0 && (
        <p className="colheita-aviso">
          Além do fiado, há <strong>{formatarMoeda(resumo.crediario_a_receber)}</strong> a receber em vendas parceladas no crediário.
          {' '}Elas ficam em <Link to="/contas-receber">Contas a Receber</Link>.
        </p>
      )}

      <div className="colheita-filtros">
        <label className="colheita-busca">
          <Search size={16} aria-hidden="true" />
          <input
            className="input"
            type="search"
            placeholder="Buscar por nome ou telefone"
            aria-label="Buscar cliente por nome ou telefone"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            maxLength={60}
          />
        </label>
        <label className="colheita-so-devedores">
          <input type="checkbox" checked={soDevedores} onChange={(e) => { setCarregando(true); setPagina(1); setSoDevedores(e.target.checked); }} />
          Só quem deve
        </label>
      </div>

      {erro && <div className="colheita-erro" role="alert">{erro}</div>}
      {carregando && <div className="card card-padding" role="status"><span className="spinner" /> Carregando...</div>}

      {!carregando && !erro && dados.itens.length === 0 && (
        <div className="card card-padding colheita-vazio">
          {buscaAplicada || soDevedores
            ? <p>Nenhum cliente encontrado{soDevedores && !buscaAplicada ? ' com saldo devedor' : ''}. {soDevedores && <button type="button" className="btn btn-ghost" onClick={() => { setCarregando(true); setSoDevedores(false); }}>Ver todos os clientes</button>}</p>
            : <p>Você ainda não tem clientes. Cadastre em <Link to="/clientes">Clientes</Link> e volte aqui para lançar a primeira dívida.</p>}
        </div>
      )}

      {!carregando && dados.itens.length > 0 && (
        <ul className="colheita-lista">
          {dados.itens.map((c) => (
            <li key={c.id} className="card card-padding colheita-cliente">
              <Link to={`/colheita/${c.id}`} className="colheita-cliente-info">
                <span className="colheita-cliente-nome">{c.nome}</span>
                {c.telefone && <span className="colheita-cliente-fone">{c.telefone}</span>}
              </Link>
              <span className={`colheita-cliente-saldo${c.saldo > 0 ? ' deve' : ''}`}>{c.saldo > 0 ? formatarMoeda(c.saldo) : 'Em dia'}</span>
              {c.saldo > 0 && (
                <button type="button" className="btn btn-ghost colheita-cobrar" onClick={() => cobrar(c)} disabled={cobrando === c.id} aria-label={`Cobrar ${c.nome} pelo WhatsApp`}>
                  <MessageCircle size={16} /> {cobrando === c.id ? '...' : 'Cobrar'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!carregando && totalPaginas > 1 && (
        <div className="colheita-paginacao">
          <button type="button" className="btn btn-ghost" disabled={pagina <= 1} onClick={() => { setCarregando(true); setPagina(pagina - 1); }}><ChevronLeft size={16} /> Anterior</button>
          <span>Página {pagina} de {totalPaginas}</span>
          <button type="button" className="btn btn-ghost" disabled={pagina >= totalPaginas} onClick={() => { setCarregando(true); setPagina(pagina + 1); }}>Próxima <ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
}
