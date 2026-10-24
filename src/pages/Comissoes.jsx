import { useMemo, useState } from 'react';
import {
  BadgePercent,
  Users,
  HandCoins,
  Percent,
  Calendar,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import MinhasComissoesAba from '../components/comissoes/MinhasComissoesAba';
import EquipeComissoesAba from '../components/comissoes/EquipeComissoesAba';
import RepassesComissoesAba from '../components/comissoes/RepassesComissoesAba';
import PercentuaisComissoesAba from '../components/comissoes/PercentuaisComissoesAba';
import HistoricoComissaoModal from '../components/comissoes/HistoricoComissaoModal';
import ConfirmarRepasseModal from '../components/comissoes/ConfirmarRepasseModal';
import EditarPercentualModal from '../components/comissoes/EditarPercentualModal';
import { inicioMesISO, fimMesISO, obterAbasPermitidas } from '../utils/formatarComissao';
import './Comissoes.css';
import '../components/TabelaGestao.css';

const TAB_ICONS = {
  minhas: BadgePercent,
  equipe: Users,
  repasses: HandCoins,
  percentuais: Percent,
};

export default function Comissoes() {
  const { user, temCapacidade } = useAuth();
  const toast = useToast();

  const [abaAtiva, setAbaAtiva] = useState('minhas');
  const [dataInicio, setDataInicio] = useState(inicioMesISO);
  const [dataFim, setDataFim] = useState(fimMesISO);

  // Modais
  const [historicoComissaoId, setHistoricoComissaoId] = useState(null);
  const [repasseParaConfirmar, setRepasseParaConfirmar] = useState(null);
  const [alvoEditarPercentual, setAlvoEditarPercentual] = useState(null);

  // Chaves para recarregar abas secundárias
  const [repassesRefreshKey, setRepassesRefreshKey] = useState(0);
  const [percentuaisRefreshKey, setPercentuaisRefreshKey] = useState(0);

  const podeVerEquipe = user?.role === 'admin' || temCapacidade('ver_vendas_de_todos');
  const podeGerirPercentuais = user?.role === 'admin';

  const abasDisponiveis = useMemo(() => {
    return obterAbasPermitidas({ user, temCapacidade }).map(tab => ({
      ...tab,
      icon: TAB_ICONS[tab.key] || BadgePercent,
    }));
  }, [user, temCapacidade]);

  function handleRedefinirPeriodo() {
    setDataInicio(inicioMesISO());
    setDataFim(fimMesISO());
  }

  function handleRepasseConfirmado() {
    if (toast?.success) {
      toast.success('Recebimento de repasse confirmado com sucesso!');
    } else if (toast?.show) {
      toast.show('Recebimento de repasse confirmado com sucesso!');
    }
    setRepassesRefreshKey(k => k + 1);
  }

  function handlePercentualAtualizado() {
    if (toast?.success) {
      toast.success('Percentual de comissão atualizado com sucesso!');
    } else if (toast?.show) {
      toast.show('Percentual de comissão atualizado com sucesso!');
    }
    setPercentuaisRefreshKey(k => k + 1);
  }

  const exibeFiltroPeriodo = abaAtiva === 'minhas' || abaAtiva === 'equipe';

  return (
    <div className="page-content comissoes-page">
      {/* Header */}
      <div className="page-header comissoes-header">
        <div>
          <h1 className="page-title">Comissões</h1>
          <p className="page-subtitle">
            Acompanhamento de vendas, liberação por pagamento e gestão de repasses
          </p>
        </div>

        {/* Filtro de Período (para abas com filtro de data) */}
        {exibeFiltroPeriodo && (
          <div className="comissoes-filtros-periodo">
            <div className="comissoes-campo-data">
              <label htmlFor="data-inicio-filtro" className="comissoes-data-label">
                De
              </label>
              <div className="input-icon-wrapper">
                <input
                  id="data-inicio-filtro"
                  type="date"
                  className="input-field comissoes-input-data"
                  value={dataInicio}
                  onChange={e => setDataInicio(e.target.value)}
                />
                <Calendar size={14} className="input-icon" />
              </div>
            </div>

            <div className="comissoes-campo-data">
              <label htmlFor="data-fim-filtro" className="comissoes-data-label">
                Até
              </label>
              <div className="input-icon-wrapper">
                <input
                  id="data-fim-filtro"
                  type="date"
                  className="input-field comissoes-input-data"
                  value={dataFim}
                  onChange={e => setDataFim(e.target.value)}
                />
                <Calendar size={14} className="input-icon" />
              </div>
            </div>

            <button
              type="button"
              className="btn btn-sm btn-ghost comissoes-btn-reset-data"
              onClick={handleRedefinirPeriodo}
              title="Redefinir para o mês atual"
            >
              <RotateCcw size={14} />
              <span>Mês atual</span>
            </button>
          </div>
        )}
      </div>

      {/* Navegação por Abas */}
      <div className="comissoes-tabs">
        {abasDisponiveis.map(tab => {
          const Icon = tab.icon;
          const isActive = abaAtiva === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              className={`comissoes-tab ${isActive ? 'comissoes-tab--active' : ''}`}
              onClick={() => setAbaAtiva(tab.key)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Conteúdo da Aba Ativa */}
      {abaAtiva === 'minhas' && (
        <MinhasComissoesAba
          dataInicio={dataInicio}
          dataFim={dataFim}
          onVerHistorico={id => setHistoricoComissaoId(id)}
          onIrParaRepasses={() => setAbaAtiva('repasses')}
        />
      )}

      {abaAtiva === 'equipe' && podeVerEquipe && (
        <EquipeComissoesAba
          dataInicio={dataInicio}
          dataFim={dataFim}
        />
      )}

      {abaAtiva === 'repasses' && (
        <RepassesComissoesAba
          user={user}
          temCapacidadeVerTodos={podeVerEquipe}
          onConfirmar={repasse => setRepasseParaConfirmar(repasse)}
          refreshKey={repassesRefreshKey}
        />
      )}

      {abaAtiva === 'percentuais' && podeGerirPercentuais && (
        <PercentuaisComissoesAba
          onEditar={alvo => setAlvoEditarPercentual(alvo)}
          refreshKey={percentuaisRefreshKey}
        />
      )}

      {/* Modal de Linha do Tempo / Histórico da Comissão */}
      <HistoricoComissaoModal
        comissaoId={historicoComissaoId}
        open={Boolean(historicoComissaoId)}
        onClose={() => setHistoricoComissaoId(null)}
      />

      {/* Modal de Confirmação de Repasse */}
      <ConfirmarRepasseModal
        repasse={repasseParaConfirmar}
        open={Boolean(repasseParaConfirmar)}
        onClose={() => setRepasseParaConfirmar(null)}
        onSuccess={handleRepasseConfirmado}
      />

      {/* Modal de Edição de Percentual */}
      <EditarPercentualModal
        alvo={alvoEditarPercentual}
        open={Boolean(alvoEditarPercentual)}
        onClose={() => setAlvoEditarPercentual(null)}
        onSuccess={handlePercentualAtualizado}
      />
    </div>
  );
}
