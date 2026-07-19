import { useState } from 'react';
import { TrendingUp, TrendingDown, ShoppingBag, Package, Users, BarChart3, ArrowRight, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { dashboardStats, sparklineData, salesHistory, products } from '../data/mockData';
import './Dashboard.css';

/* Mini Sparkline SVG */
function Sparkline({ data, positive }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const w = 80, h = 32;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * h;
    return `${x},${y}`;
  });
  const color = positive ? 'var(--color-success)' : 'var(--color-danger)';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="sparkline">
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points={`0,${h} ${pts.join(' ')} ${w},${h}`}
        fill={color}
        opacity="0.1"
        strokeWidth="0"
      />
    </svg>
  );
}

const statCards = [
  {
    key: 'salesToday',
    label: 'Vendas de hoje',
    icon: ShoppingBag,
    sparkKey: 'salesToday',
  },
  {
    key: 'itemsSold',
    label: 'Itens vendidos',
    icon: Package,
    sparkKey: 'itemsSold',
  },
  {
    key: 'avgTicket',
    label: 'Ticket médio',
    icon: BarChart3,
    sparkKey: 'avgTicket',
  },
  {
    key: 'lowStock',
    label: 'Estoque baixo',
    icon: Package,
    sparkKey: 'lowStock',
    isAlert: true,
  },
];

export default function Dashboard() {
  return (
    <div className="page-content">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Terça-feira, 15 de julho de 2026</p>
        </div>
        <Link to="/venda" className="btn btn-primary btn-lg">
          <ShoppingBag size={18} />
          Nova Venda
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="dashboard-stats">
        {statCards.map(({ key, label, icon: Icon, sparkKey, isAlert }) => {
          const stat = dashboardStats[key];
          const isPositive = stat.positive;
          return (
            <div key={key} className={`stat-card card card-padding ${isAlert ? 'stat-card--alert' : ''}`}>
              <div className="stat-card-header">
                <div className={`stat-card-icon-wrap ${isAlert ? 'stat-card-icon-wrap--alert' : ''}`}>
                  <Icon size={18} strokeWidth={2} />
                </div>
                <Sparkline data={sparklineData[sparkKey]} positive={!isAlert && isPositive} />
              </div>
              <div className="stat-card-value">{stat.value}</div>
              <div className="stat-card-footer">
                <span className="stat-card-label">{label}</span>
                <span className={`stat-card-change ${isPositive && !isAlert ? 'stat-card-change--up' : 'stat-card-change--down'}`}>
                  {isPositive && !isAlert ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {stat.change}
                </span>
              </div>
            </div>
          );
        })}
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

      {/* Recent Sales + Best Products */}
      <div className="dashboard-bottom">
        {/* Recent Sales */}
        <div className="card">
          <div className="card-padding" style={{ borderBottom: '1px solid var(--color-border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 className="section-title">Vendas Recentes</h2>
            <Link to="/historico" className="btn btn-ghost btn-sm">Ver todas</Link>
          </div>
          <div className="recent-sales-list">
            {salesHistory.slice(0, 5).map((sale) => (
              <div key={sale.id} className="recent-sale-item">
                <div className="recent-sale-avatar">
                  {sale.customer.split(' ').slice(0, 2).map(w => w[0]).join('')}
                </div>
                <div className="recent-sale-info">
                  <div className="recent-sale-customer">{sale.customer}</div>
                  <div className="recent-sale-meta">{sale.id} · {sale.items} {sale.items === 1 ? 'item' : 'itens'}</div>
                </div>
                <div className="recent-sale-right">
                  <div className="recent-sale-value">
                    {sale.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <span className={`badge ${sale.status === 'concluída' ? 'badge-success' : 'badge-danger'}`}>
                    {sale.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="card">
          <div className="card-padding" style={{ borderBottom: '1px solid var(--color-border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 className="section-title">Mais Vendidos</h2>
            <Link to="/produtos" className="btn btn-ghost btn-sm">Ver todos</Link>
          </div>
          <div className="top-products-list">
            {products.slice(0, 5).map((p, i) => (
              <div key={p.id} className="top-product-item">
                <div className="top-product-rank">{i + 1}</div>
                <div
                  className="top-product-color"
                  style={{ background: `linear-gradient(135deg, ${p.color}44, ${p.color}99)` }}
                />
                <div className="top-product-info">
                  <div className="top-product-name">{p.name}</div>
                  <div className="top-product-sku">{p.sku}</div>
                </div>
                <div className="top-product-price">
                  {p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
