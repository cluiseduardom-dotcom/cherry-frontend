import { useEffect, useState } from 'react';
import { TrendingUp, ShoppingBag, Package, Users, BarChart3, ArrowRight, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buscarResumoDashboard } from '../services/dashboard';
import './Dashboard.css';

const CURVA_BADGE = { A: 'badge-success', B: 'badge-warning', C: 'badge-info' };

function formatCurrency(v) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function initials(nome) {
  return nome.split(' ').slice(0, 2).map(w => w[0]).join('');
}

export default function Dashboard() {
  const [resumo, setResumo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await buscarResumoDashboard();
        if (!cancelled) setResumo(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const curvaAbc = resumo?.curva_abc ?? [];
  const giro = resumo?.giro ?? [];
  const cobertura = resumo?.cobertura ?? [];

  const coberturaPorId = new Map(cobertura.map(c => [c.id, c.cobertura_dias]));
  const giroCobertura = giro
    .map(g => ({ ...g, cobertura_dias: coberturaPorId.get(g.id) ?? null }))
    .sort((a, b) => (b.giro ?? -1) - (a.giro ?? -1));

  const produtosCurvaA = curvaAbc.filter(p => p.curva === 'A').length;

  const girosValidos = giro.map(g => g.giro).filter(v => v !== null && v !== undefined);
  const giroMedio = girosValidos.length
    ? (girosValidos.reduce((s, v) => s + Number(v), 0) / girosValidos.length).toFixed(2)
    : null;

  const coberturasValidas = cobertura.map(c => c.cobertura_dias).filter(v => v !== null && v !== undefined);
  const coberturaMedia = coberturasValidas.length
    ? Math.round(coberturasValidas.reduce((s, v) => s + Number(v), 0) / coberturasValidas.length)
    : null;

  const produtosEsgotados = giro.filter(g => g.estoque_atual === 0).length;

  const statCards = [
    { key: 'curvaA',    label: 'Produtos Curva A', icon: Star,        value: curvaAbc.length ? produtosCurvaA : '—' },
    { key: 'giro',      label: 'Giro médio',        icon: TrendingUp,  value: giroMedio !== null ? `${giroMedio}x` : '—' },
    { key: 'cobertura', label: 'Cobertura média',   icon: BarChart3,   value: coberturaMedia !== null ? `${coberturaMedia} dias` : '—' },
    { key: 'esgotados', label: 'Produtos esgotados', icon: Package,    value: produtosEsgotados, isAlert: produtosEsgotados > 0 },
  ];

  return (
    <div className="page-content">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Visão geral do negócio</p>
        </div>
        <Link to="/venda" className="btn btn-primary btn-lg">
          <ShoppingBag size={18} />
          Nova Venda
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="dashboard-quick-actions">
        <Link to="/venda" className="quick-action-card card card-padding">
          <div className="quick-action-icon"><ShoppingBag size={22} /></div>
          <div>
            <div className="quick-action-title">Nova Venda</div>
            <div className="quick-action-sub">Iniciar atendimento</div>
          </div>
          <ArrowRight size={16} className="quick-action-arrow" />
        </Link>
        <Link to="/produtos" className="quick-action-card card card-padding">
          <div className="quick-action-icon quick-action-icon--b"><Star size={22} /></div>
          <div>
            <div className="quick-action-title">Produtos</div>
            <div className="quick-action-sub">Gerenciar catálogo</div>
          </div>
          <ArrowRight size={16} className="quick-action-arrow" />
        </Link>
        <Link to="/clientes" className="quick-action-card card card-padding">
          <div className="quick-action-icon quick-action-icon--c"><Users size={22} /></div>
          <div>
            <div className="quick-action-title">Clientes</div>
            <div className="quick-action-sub">Base de clientes</div>
          </div>
          <ArrowRight size={16} className="quick-action-arrow" />
        </Link>
        <Link to="/relatorios" className="quick-action-card card card-padding">
          <div className="quick-action-icon quick-action-icon--d"><BarChart3 size={22} /></div>
          <div>
            <div className="quick-action-title">Relatórios</div>
            <div className="quick-action-sub">Análise de dados</div>
          </div>
          <ArrowRight size={16} className="quick-action-arrow" />
        </Link>
      </div>

      {loading && (
        <div className="empty-state">
          <p className="text-sm text-secondary">Carregando dashboard...</p>
        </div>
      )}

      {!loading && error && (
        <div className="empty-state">
          <div className="empty-state-title">Não foi possível carregar os dados do dashboard</div>
          <p className="text-sm text-secondary">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Stat Cards */}
          <div className="dashboard-stats">
            {statCards.map(({ key, label, icon: Icon, value, isAlert }) => (
              <div key={key} className={`stat-card card card-padding ${isAlert ? 'stat-card--alert' : ''}`}>
                <div className="stat-card-header">
                  <div className={`stat-card-icon-wrap ${isAlert ? 'stat-card-icon-wrap--alert' : ''}`}>
                    <Icon size={18} strokeWidth={2} />
                  </div>
                </div>
                <div className="stat-card-value">{value}</div>
                <div className="stat-card-footer">
                  <span className="stat-card-label">{label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Curva ABC + Giro/Cobertura */}
          <div className="dashboard-bottom">
            {/* Curva ABC */}
            <div className="card">
              <div className="card-padding" style={{ borderBottom: '1px solid var(--color-border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 className="section-title">Curva ABC</h2>
                <Link to="/produtos" className="btn btn-ghost btn-sm">Ver produtos</Link>
              </div>
              <div className="top-products-list">
                {curvaAbc.slice(0, 8).map((p, i) => (
                  <div key={p.id} className="top-product-item">
                    <div className="top-product-rank">{i + 1}</div>
                    <div className="top-product-info">
                      <div className="top-product-name">
                        {p.nome}{' '}
                        <span className={`badge ${CURVA_BADGE[p.curva] ?? 'badge-info'}`}>{p.curva}</span>
                      </div>
                      <div className="top-product-sku">{p.percentual_acumulado}% acumulado</div>
                    </div>
                    <div className="top-product-price">{formatCurrency(p.faturamento)}</div>
                  </div>
                ))}
              </div>
              {curvaAbc.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-title">Sem dados de faturamento</div>
                </div>
              )}
            </div>

            {/* Giro & Cobertura */}
            <div className="card">
              <div className="card-padding" style={{ borderBottom: '1px solid var(--color-border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 className="section-title">Giro &amp; Cobertura</h2>
                <Link to="/estoque" className="btn btn-ghost btn-sm">Ver estoque</Link>
              </div>
              <div className="recent-sales-list">
                {giroCobertura.slice(0, 8).map(p => (
                  <div key={p.id} className="recent-sale-item">
                    <div className="recent-sale-avatar">{initials(p.nome)}</div>
                    <div className="recent-sale-info">
                      <div className="recent-sale-customer">{p.nome}</div>
                      <div className="recent-sale-meta">
                        estoque: {p.estoque_atual} · vendido: {p.quantidade_vendida_periodo}
                      </div>
                    </div>
                    <div className="recent-sale-right">
                      <div className="recent-sale-value">{p.giro !== null ? `${p.giro}x` : '—'}</div>
                      <span className="badge badge-primary">
                        {p.cobertura_dias !== null ? `${p.cobertura_dias}d cobertura` : 'sem giro'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {giroCobertura.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-title">Sem dados de giro no período</div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
