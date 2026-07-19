import { BarChart2, TrendingUp, TrendingDown, Download, Calendar } from 'lucide-react';
import { dashboardStats, sparklineData } from '../data/mockData';
import './Relatorios.css';

/* Simple bar chart using divs */
function BarChart({ data, label }) {
  const max = Math.max(...data);
  return (
    <div className="bar-chart">
      {data.map((v, i) => (
        <div key={i} className="bar-chart-bar-wrap">
          <div
            className="bar-chart-bar"
            style={{ height: `${(v / max) * 100}%` }}
            title={`${v}`}
          />
        </div>
      ))}
    </div>
  );
}

const weekLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const weekSales  = [1240, 1847, 980, 2100, 1650, 890, 320];
const monthData  = [14200, 18900, 12800, 22100, 19400, 24800, 21300, 28900, 25100, 31200, 29800, 35600];

export default function Relatorios() {
  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Relatórios</h1>
          <p className="page-subtitle">Análise detalhada de desempenho</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost">
            <Calendar size={16} />
            Julho 2026
          </button>
          <button className="btn btn-primary">
            <Download size={16} />
            Exportar
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="relatorios-kpis">
        {[
          { label: 'Receita total',    value: 'R$ 47.820,00', change: '+18.3%', up: true },
          { label: 'Pedidos',          value: '412',           change: '+9.7%',  up: true },
          { label: 'Clientes novos',   value: '28',            change: '+4.2%',  up: true },
          { label: 'Taxa de conversão',value: '64.8%',         change: '-1.2%',  up: false },
        ].map((kpi, i) => (
          <div key={i} className="relatorio-kpi card card-padding">
            <div className="relatorio-kpi-value">{kpi.value}</div>
            <div className="relatorio-kpi-footer">
              <span className="relatorio-kpi-label">{kpi.label}</span>
              <span className={`relatorio-kpi-change ${kpi.up ? 'relatorio-kpi-change--up' : 'relatorio-kpi-change--down'}`}>
                {kpi.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {kpi.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="relatorios-charts">
        {/* Weekly sales */}
        <div className="card card-padding relatorio-chart-card">
          <div className="relatorio-chart-header">
            <h2 className="section-title">Vendas por Dia (Semana)</h2>
            <BarChart2 size={16} style={{ color: 'var(--color-text-muted)' }} />
          </div>
          <div className="relatorio-week-chart">
            {weekSales.map((v, i) => (
              <div key={i} className="relatorio-week-bar-wrap">
                <div className="relatorio-week-bar-track">
                  <div
                    className="relatorio-week-bar-fill"
                    style={{ height: `${(v / Math.max(...weekSales)) * 100}%` }}
                  />
                </div>
                <div className="relatorio-week-value">
                  R$ {(v / 1000).toFixed(1)}k
                </div>
                <div className="relatorio-week-label">{weekLabels[i]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Category distribution */}
        <div className="card card-padding relatorio-chart-card">
          <div className="relatorio-chart-header">
            <h2 className="section-title">Vendas por Categoria</h2>
          </div>
          <div className="relatorio-categories">
            {[
              { cat: 'Anéis',        pct: 38, color: 'var(--color-primary)' },
              { cat: 'Brincos',      pct: 27, color: '#D4AF37' },
              { cat: 'Colares',      pct: 20, color: '#C0C0C0' },
              { cat: 'Pulseiras',    pct: 15, color: 'var(--cherry-300)' },
            ].map(item => (
              <div key={item.cat} className="relatorio-cat-row">
                <div className="relatorio-cat-info">
                  <span className="relatorio-cat-dot" style={{ background: item.color }} />
                  <span className="relatorio-cat-name">{item.cat}</span>
                  <span className="relatorio-cat-pct">{item.pct}%</span>
                </div>
                <div className="relatorio-cat-bar-track">
                  <div
                    className="relatorio-cat-bar-fill"
                    style={{ width: `${item.pct}%`, background: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly trend */}
      <div className="card card-padding">
        <div className="relatorio-chart-header">
          <h2 className="section-title">Faturamento Mensal (2026)</h2>
          <span className="badge badge-success"><TrendingUp size={11} /> +24.2% vs 2025</span>
        </div>
        <div className="relatorio-monthly">
          {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((m, i) => {
            const v = monthData[i];
            const max = Math.max(...monthData);
            const isCurrent = i === 6;
            return (
              <div key={m} className="relatorio-monthly-col">
                <div className="relatorio-monthly-track">
                  <div
                    className={`relatorio-monthly-fill ${isCurrent ? 'relatorio-monthly-fill--active' : ''}`}
                    style={{ height: `${(v / max) * 100}%` }}
                    title={`R$ ${(v / 1000).toFixed(1)}k`}
                  />
                </div>
                <div className="relatorio-monthly-label">{m}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
