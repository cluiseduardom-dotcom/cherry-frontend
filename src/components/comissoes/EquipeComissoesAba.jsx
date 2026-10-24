import { useEffect, useState } from 'react';
import { AlertCircle, Users } from 'lucide-react';
import { listarComissoesEquipe } from '../../services/comissoes';
import { formatarMoeda } from '../../utils/mascaras';
import { formatarPercentual } from '../../utils/formatarComissao';
import { ROLE_LABEL } from '../../config/papeis';

export default function EquipeComissoesAba({ dataInicio, dataFim }) {
  const [items, setItems] = useState([]);
  const [totais, setTotais] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setError('');

    listarComissoesEquipe({
      data_inicio: dataInicio || undefined,
      data_fim: dataFim || undefined,
    })
      .then(res => {
        if (!cancelado) {
          setItems(res?.items || []);
          setTotais(res?.totais || null);
        }
      })
      .catch(err => {
        if (!cancelado) {
          setError(err.message || 'Erro ao carregar comissões da equipe.');
        }
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [dataInicio, dataFim]);

  return (
    <div className="comissoes-aba-conteudo">
      {/* Cards de Resumo da Equipe */}
      {totais && (
        <div className="comissoes-cards-grid">
          <div className="comissoes-kpi-card card card-padding">
            <span className="comissoes-kpi-title">Base de Vendas (Equipe)</span>
            <span className="comissoes-kpi-value text-primary">
              {formatarMoeda(totais.total_base)}
            </span>
            <span className="comissoes-kpi-sub">Total faturado pela equipe</span>
          </div>

          <div className="comissoes-kpi-card card card-padding">
            <span className="comissoes-kpi-title">Comissão Total</span>
            <span className="comissoes-kpi-value">
              {formatarMoeda(totais.total_comissao)}
            </span>
            <span className="comissoes-kpi-sub">Liberado + Pendente</span>
          </div>

          <div className="comissoes-kpi-card card card-padding comissoes-kpi-card--success">
            <span className="comissoes-kpi-title">Liberado</span>
            <span className="comissoes-kpi-value text-success">
              {formatarMoeda(totais.total_liberado)}
            </span>
            <span className="comissoes-kpi-sub">Quitado pelos clientes</span>
          </div>

          <div className="comissoes-kpi-card card card-padding comissoes-kpi-card--warning">
            <span className="comissoes-kpi-title">Pendente</span>
            <span className="comissoes-kpi-value text-warning">
              {formatarMoeda(totais.total_pendente)}
            </span>
            <span className="comissoes-kpi-sub">Aguardando recebimentos</span>
          </div>

          <div className="comissoes-kpi-card card card-padding comissoes-kpi-card--danger">
            <span className="comissoes-kpi-title">Estornado</span>
            <span className="comissoes-kpi-value text-danger">
              {formatarMoeda(totais.total_estornado)}
            </span>
            <span className="comissoes-kpi-sub">Vendas canceladas</span>
          </div>

          <div className="comissoes-kpi-card card card-padding">
            <span className="comissoes-kpi-title">Dinheiro a Repassar</span>
            <span className="comissoes-kpi-value">
              {formatarMoeda(totais.dinheiro_a_repassar)}
            </span>
            <span className="comissoes-kpi-sub">Total retido com vendedores</span>
          </div>
        </div>
      )}

      {error && (
        <div className="comissoes-error-banner" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Tabela de Vendedores */}
      <div className="card">
        {loading && (
          <div className="comissoes-loading-box">
            <span className="spinner" />
            <span>Carregando dados da equipe...</span>
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="empty-state">
            <Users className="empty-state-icon" size={36} />
            <div className="empty-state-title">Nenhum registro para a equipe</div>
            <p className="text-sm text-secondary">
              Não encontramos vendedores com movimentação no período selecionado.
            </p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="table-scroll">
            <table className="tabela-gestao">
              <thead>
                <tr>
                  <th>Vendedor</th>
                  <th>Cargo</th>
                  <th>% Vigente</th>
                  <th>Vendas</th>
                  <th>Base Total</th>
                  <th>Comissão Total</th>
                  <th>Liberado</th>
                  <th>Pendente</th>
                  <th>Estornado</th>
                  <th>A Repassar</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.usuario_id}>
                    <td>
                      <strong>{item.nome}</strong>
                    </td>
                    <td>
                      <span className={`role-badge role-badge--${item.cargo}`}>
                        {ROLE_LABEL[item.cargo] || item.cargo}
                      </span>
                    </td>
                    <td>
                      {item.percentual ? (
                        formatarPercentual(item.percentual)
                      ) : (
                        <span className="text-secondary">Sem comissão</span>
                      )}
                    </td>
                    <td>{Number(item.quantidade_vendas || 0)}</td>
                    <td>{formatarMoeda(item.total_base)}</td>
                    <td>
                      <strong>{formatarMoeda(item.total_comissao)}</strong>
                    </td>
                    <td className="text-success font-medium">
                      {formatarMoeda(item.total_liberado)}
                    </td>
                    <td className="text-secondary font-medium">
                      {formatarMoeda(item.total_pendente)}
                    </td>
                    <td className="text-danger font-medium">
                      {formatarMoeda(item.total_estornado)}
                    </td>
                    <td className="font-semibold">
                      {formatarMoeda(item.dinheiro_a_repassar)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
