import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, PackageCheck, RefreshCw } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { listarPedidosLoja, marcarEntregaCombinada } from '../services/pedidosLoja';
import { formatarMoeda } from '../utils/mascaras';
import { esperaCritica, formatarTelefone, linkWhatsApp, resumoDosItens, tempoDesde } from '../utils/pedidosLoja';
import './PedidosLoja.css';

const POR_PAGINA = 20;
const ABAS = [
  { id: 'a_combinar', rotulo: 'A combinar' },
  { id: 'combinadas', rotulo: 'Combinadas' },
];

// Pedidos da loja online já pagos: a entrega (frete e endereço) é combinada com a cliente por contato humano.
// Quem tem acesso (admin e vendedor, com a funcionalidade ligada) vê o contato da cliente; o backend decide de novo.
export default function PedidosLoja() {
  const toast = useToast();
  const [aba, setAba] = useState('a_combinar');
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState({ itens: [], total: 0 });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [observacoes, setObservacoes] = useState({});
  const [marcando, setMarcando] = useState('');

  const [recarga, setRecarga] = useState(0);

  // "Carregando" é ligado nos eventos (trocar aba/página, atualizar); o efeito só busca e guarda o resultado.
  const recarregar = () => { setCarregando(true); setRecarga((n) => n + 1); };
  const mudarAba = (id) => { setCarregando(true); setAba(id); setPagina(1); };
  const irParaPagina = (n) => { setCarregando(true); setPagina(n); };

  useEffect(() => {
    let cancelado = false;

    listarPedidosLoja({ situacao: aba, pagina, limite: POR_PAGINA })
      .then((resposta) => { if (!cancelado) { setDados(resposta); setErro(''); } })
      .catch((e) => { if (!cancelado) setErro(e.message || 'Não foi possível carregar os pedidos da loja.'); })
      .finally(() => { if (!cancelado) setCarregando(false); });

    return () => { cancelado = true; };
  }, [aba, pagina, recarga]);

  async function marcar(pedido) {
    setMarcando(pedido.codigo);

    try {
      await marcarEntregaCombinada(pedido.codigo, observacoes[pedido.codigo]);
      toast?.success?.(`Entrega do pedido ${pedido.codigo_curto} marcada como combinada.`);
      setObservacoes((atual) => ({ ...atual, [pedido.codigo]: '' }));
      recarregar();
    } catch (e) {
      toast?.error?.(e.message || 'Não foi possível marcar a entrega.');
    } finally {
      setMarcando('');
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(dados.total / POR_PAGINA));

  return (
    <div className="page-content pedidos-loja-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pedidos da loja</h1>
          <p className="page-subtitle">Pedidos pagos na loja online. Combine o frete e a entrega com a cliente.</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={recarregar} disabled={carregando}>
          <RefreshCw size={16} />
          Atualizar
        </button>
      </div>

      <div className="pedidos-loja-abas" role="tablist" aria-label="Situação dos pedidos">
        {ABAS.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={aba === a.id}
            className={`btn ${aba === a.id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => mudarAba(a.id)}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      {aba === 'a_combinar' && (
        <p className="pedidos-loja-aviso">
          Estes pedidos já foram pagos. Fale com a cliente para combinar o frete e o endereço e depois marque como combinado.
          Pedido pago e sem contato há mais de 24 horas aparece em destaque.
        </p>
      )}

      {erro && <div className="pedidos-loja-erro" role="alert">{erro}</div>}

      {carregando && (
        <div className="card card-padding" role="status">
          <span className="spinner" /> Carregando pedidos...
        </div>
      )}

      {!carregando && !erro && dados.itens.length === 0 && (
        <div className="card empty-state">
          <PackageCheck className="empty-state-icon" size={36} />
          <div className="empty-state-title">{aba === 'a_combinar' ? 'Nenhum pedido esperando contato' : 'Nenhuma entrega combinada ainda'}</div>
          <p className="text-sm text-secondary">
            {aba === 'a_combinar' ? 'Quando uma cliente pagar na loja online, o pedido aparece aqui e no sino de avisos.' : 'Os pedidos marcados como combinados aparecem aqui.'}
          </p>
        </div>
      )}

      {!carregando && dados.itens.length > 0 && (
        <ul className="pedidos-loja-lista">
          {dados.itens.map((p) => {
            const whatsapp = linkWhatsApp(p.cliente.telefone, p.codigo_curto);
            const critico = aba === 'a_combinar' && esperaCritica(p.pago_em);

            return (
              <li key={p.codigo} className={`pedidos-loja-item card card-padding${critico ? ' critico' : ''}`}>
                <div className="pedidos-loja-topo">
                  <div>
                    <div className="pedidos-loja-cliente">{p.cliente.nome}</div>
                    <div className="pedidos-loja-codigo">Pedido {p.codigo_curto}</div>
                  </div>
                  <div className="pedidos-loja-total">{formatarMoeda(p.total)}</div>
                </div>

                <div className="pedidos-loja-contato">
                  {p.cliente.telefone && <a href={`tel:${String(p.cliente.telefone).replace(/\D/g, '')}`}>{formatarTelefone(p.cliente.telefone)}</a>}
                  {whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer">Chamar no WhatsApp</a>}
                  {p.cliente.email && <a href={`mailto:${p.cliente.email}`}>{p.cliente.email}</a>}
                </div>

                <p className="pedidos-loja-itens">{resumoDosItens(p.itens)}</p>
                <p className={`pedidos-loja-quando${critico ? ' critico' : ''}`}>
                  Pago {tempoDesde(p.pago_em)}
                  {p.entrega_combinada_em && ` · entrega combinada ${tempoDesde(p.entrega_combinada_em)}`}
                </p>

                {aba === 'a_combinar' && (
                  <div className="pedidos-loja-acao">
                    <input
                      className="input"
                      type="text"
                      maxLength={500}
                      placeholder="Observação (opcional): ex. retira na loja, enviar pelos Correios"
                      aria-label={`Observação do pedido ${p.codigo_curto}`}
                      value={observacoes[p.codigo] ?? ''}
                      onChange={(e) => setObservacoes((atual) => ({ ...atual, [p.codigo]: e.target.value }))}
                    />
                    <button type="button" className="btn btn-primary" disabled={marcando === p.codigo} onClick={() => marcar(p)}>
                      {marcando === p.codigo ? 'Salvando...' : 'Entrega combinada'}
                    </button>
                  </div>
                )}

                {aba === 'combinadas' && p.entrega_observacao && <p className="pedidos-loja-obs">Observação: {p.entrega_observacao}</p>}
              </li>
            );
          })}
        </ul>
      )}

      {totalPaginas > 1 && (
        <div className="pedidos-loja-paginacao">
          <button type="button" className="btn btn-ghost" disabled={pagina <= 1 || carregando} onClick={() => irParaPagina(pagina - 1)}>
            <ChevronLeft size={16} /> Anterior
          </button>
          <span className="text-sm text-secondary">Página {pagina} de {totalPaginas}</span>
          <button type="button" className="btn btn-ghost" disabled={pagina >= totalPaginas || carregando} onClick={() => irParaPagina(pagina + 1)}>
            Próxima <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
