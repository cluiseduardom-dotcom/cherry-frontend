import { useState } from 'react';
import { Search, Filter, Calendar } from 'lucide-react';
import { salesHistory } from '../data/mockData';
import './Historico.css';

export default function Historico() {
  const [search, setSearch] = useState('');

  const filtered = salesHistory.filter(s =>
    s.customer.toLowerCase().includes(search.toLowerCase()) ||
    s.id.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = salesHistory
    .filter(s => s.status === 'concluída')
    .reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Histórico de Vendas</h1>
          <p className="page-subtitle">{salesHistory.length} vendas registradas</p>
        </div>
        <button className="btn btn-ghost">
          <Calendar size={16} />
          Este mês
        </button>
      </div>

      {/* Summary */}
      <div className="historico-summary">
        <div className="card card-padding historico-stat">
          <div className="historico-stat-label">Faturamento total</div>
          <div className="historico-stat-value">
            {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
        </div>
        <div className="card card-padding historico-stat">
          <div className="historico-stat-label">Vendas concluídas</div>
          <div className="historico-stat-value">
            {salesHistory.filter(s => s.status === 'concluída').length}
          </div>
        </div>
        <div className="card card-padding historico-stat">
          <div className="historico-stat-label">Canceladas</div>
          <div className="historico-stat-value historico-stat-value--danger">
            {salesHistory.filter(s => s.status === 'cancelada').length}
          </div>
        </div>
        <div className="card card-padding historico-stat">
          <div className="historico-stat-label">Ticket médio</div>
          <div className="historico-stat-value">
            {(totalRevenue / salesHistory.filter(s => s.status === 'concluída').length)
              .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="historico-toolbar">
        <div className="input-icon-wrapper" style={{ flex: 1, maxWidth: 380 }}>
          <Search size={16} className="input-icon" />
          <input
            type="text"
            className="input-field"
            placeholder="Buscar venda ou cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-ghost">
          <Filter size={16} />
          Filtros
        </button>
      </div>

      {/* Table */}
      <div className="card">
        <table className="historico-table">
          <thead>
            <tr>
              <th>Nº Venda</th>
              <th>Data</th>
              <th>Cliente</th>
              <th>Itens</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(sale => (
              <tr key={sale.id} className="historico-row">
                <td>
                  <span className="historico-id">{sale.id}</span>
                </td>
                <td className="historico-date">
                  {new Date(sale.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                </td>
                <td>
                  <div className="historico-customer">
                    <div className="historico-avatar">
                      {sale.customer.split(' ').slice(0, 2).map(w => w[0]).join('')}
                    </div>
                    {sale.customer}
                  </div>
                </td>
                <td className="historico-items">{sale.items} {sale.items === 1 ? 'item' : 'itens'}</td>
                <td className="historico-total">
                  {sale.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td>
                  <span className={`badge ${sale.status === 'concluída' ? 'badge-success' : 'badge-danger'}`}>
                    {sale.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon"><Search size={24} /></div>
            <div className="empty-state-title">Nenhuma venda encontrada</div>
          </div>
        )}
      </div>
    </div>
  );
}
