import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Mail, MapPin, Phone, Search, X } from 'lucide-react';
import { buscarHistoricoCliente } from '../services/clientes';
import { ApiError } from '../services/api';
import { useConfirmarFechamentoModal } from '../hooks/useConfirmarFechamentoModal';
import { formatarMoeda, aplicarMascaraTelefone, aplicarMascaraCpfCnpj } from '../utils/mascaras';
import { formatarData } from '../utils/formatarData';
import { agruparHistoricoPorVenda } from '../utils/agruparHistoricoPorVenda';
import './ProductModal.css';
import '../pages/Historico.css';
import '../pages/Clientes.css';

function formatarEndereco(cliente) {
  const partes = [];
  if (cliente.endereco) partes.push(cliente.numero ? `${cliente.endereco}, ${cliente.numero}` : cliente.endereco);
  if (cliente.complemento) partes.push(cliente.complemento);
  if (cliente.bairro) partes.push(cliente.bairro);
  const cidadeUf = [cliente.cidade, cliente.uf].filter(Boolean).join('/');
  if (cidadeUf) partes.push(cidadeUf);
  return partes.join(' — ') || null;
}

export default function ClienteHistoricoModal({ open, cliente, onClose }) {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [vendaSelecionada, setVendaSelecionada] = useState(null);

  useEffect(() => {
    if (!open || !cliente) return;

    let cancelled = false;
    setVendaSelecionada(null);

    async function load() {
      setLoading(true);
      setError('');
      setRegistros([]);
      try {
        const dados = await buscarHistoricoCliente(cliente.id);
        if (!cancelled) setRegistros(dados);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setRegistros([]);
        } else {
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [open, cliente]);

  // Modal só de leitura (histórico) — sem dados a proteger, então isDirty é
  // sempre falso. Usa o hook compartilhado só para padronizar o ESC (Issue
  // #42) em vez de reimplementar o mesmo listener aqui.
  const { solicitarFechamento } = useConfirmarFechamentoModal({ open, isDirty: false, onClose });

  // Issue #45: a primeira camada agrupa por venda (não por item) — a mesma
  // função pura que faz isso também dá, de graça, a data da compra mais
  // recente (a query já vem ordenada por v.data DESC).
  const vendasAgrupadas = useMemo(() => agruparHistoricoPorVenda(registros), [registros]);
  const ultimaCompra = vendasAgrupadas[0]?.data ?? null;

  if (!open || !cliente) return null;

  const endereco = formatarEndereco(cliente);

  return (
    <div className="modal-overlay" onClick={solicitarFechamento}>
      <div className="modal-panel card" style={{ maxWidth: 760 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{cliente.nome}</h2>
          <button type="button" className="modal-close" onClick={solicitarFechamento} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ paddingBottom: 0 }}>
          <div className="cliente-detalhe-cadastro">
            {cliente.telefone && (
              <span className="cliente-detalhe-info"><Phone size={13} /> {aplicarMascaraTelefone(cliente.telefone)}</span>
            )}
            {cliente.email && (
              <span className="cliente-detalhe-info"><Mail size={13} /> {cliente.email}</span>
            )}
            {cliente.cpf_cnpj && (
              <span className="cliente-detalhe-info">{aplicarMascaraCpfCnpj(cliente.cpf_cnpj)}</span>
            )}
            {endereco && (
              <span className="cliente-detalhe-info"><MapPin size={13} /> {endereco}</span>
            )}
            {cliente.cep && <span className="cliente-detalhe-info">CEP {cliente.cep}</span>}
          </div>

          <div className="cliente-detalhe-kpis">
            <div className="cliente-detalhe-kpi">
              <div className="cliente-detalhe-kpi-value">{cliente.total_compras ?? 0}</div>
              <div className="cliente-detalhe-kpi-label">Compras</div>
            </div>
            <div className="cliente-detalhe-kpi">
              <div className="cliente-detalhe-kpi-value">{formatarMoeda(cliente.total_gasto)}</div>
              <div className="cliente-detalhe-kpi-label">Total gasto</div>
            </div>
            <div className="cliente-detalhe-kpi">
              <div className="cliente-detalhe-kpi-value">{formatarMoeda(cliente.ticket_medio)}</div>
              <div className="cliente-detalhe-kpi-label">Ticket médio</div>
            </div>
            <div className="cliente-detalhe-kpi">
              <div className="cliente-detalhe-kpi-value">{ultimaCompra ? formatarData(ultimaCompra) : 'Não informada'}</div>
              <div className="cliente-detalhe-kpi-label">Última compra</div>
            </div>
          </div>
        </div>

        <div className="modal-body" style={{ padding: 0 }}>
          {loading && (
            <div className="empty-state">
              <p className="text-sm text-secondary">Carregando histórico...</p>
            </div>
          )}

          {!loading && error && (
            <div className="empty-state">
              <div className="empty-state-title">Não foi possível carregar o histórico</div>
              <p className="text-sm text-secondary">{error}</p>
            </div>
          )}

          {!loading && !error && vendasAgrupadas.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon"><Search size={24} /></div>
              <div className="empty-state-title">Nenhuma compra registrada</div>
              <p className="text-sm text-secondary">Este cliente ainda não tem vendas.</p>
            </div>
          )}

          {!loading && !error && vendasAgrupadas.length > 0 && !vendaSelecionada && (
            <table className="historico-table">
              <thead>
                <tr>
                  <th>Venda</th>
                  <th>Data</th>
                  <th>Itens</th>
                  <th className="numeric">Total da venda</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {vendasAgrupadas.map(venda => (
                  <tr
                    key={venda.venda_id}
                    className="historico-row cliente-detalhe-venda-row"
                    onClick={() => setVendaSelecionada(venda)}
                  >
                    <td><span className="historico-id">#{venda.venda_id}</span></td>
                    <td className="historico-date">{formatarData(venda.data)}</td>
                    <td>{venda.quantidadeItens} {venda.quantidadeItens === 1 ? 'item' : 'itens'}</td>
                    <td className="historico-total numeric">{formatarMoeda(venda.totalVenda)}</td>
                    <td><button type="button" className="btn btn-ghost btn-sm">Ver itens</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!loading && !error && vendaSelecionada && (
            <>
              <button
                type="button"
                className="cliente-detalhe-voltar"
                onClick={() => setVendaSelecionada(null)}
              >
                <ArrowLeft size={14} /> Voltar para as vendas
              </button>
              <table className="historico-table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Qtd</th>
                    <th>Preço unit.</th>
                    <th className="numeric">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {vendaSelecionada.itens.map((item, i) => (
                    <tr key={`${item.venda_id}-${i}`} className="historico-row">
                      <td>{item.produto}</td>
                      <td>{item.quantidade}</td>
                      <td>{formatarMoeda(item.preco_unitario)}</td>
                      <td className="historico-total numeric">{formatarMoeda(item.total_item)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={solicitarFechamento}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
