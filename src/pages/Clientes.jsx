import { useState } from 'react';
import { Search, Plus, Phone, Mail, Star, TrendingUp } from 'lucide-react';
import { customers } from '../data/mockData';
import './Clientes.css';

export default function Clientes() {
  const [search, setSearch] = useState('');

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">{customers.length} clientes cadastrados</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={16} />
          Novo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="input-icon-wrapper" style={{ maxWidth: 400, marginBottom: 'var(--space-5)' }}>
        <Search size={16} className="input-icon" />
        <input
          type="text"
          className="input-field"
          placeholder="Buscar cliente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Customer grid */}
      <div className="clientes-grid">
        {filtered.map(c => {
          const initials = c.name.split(' ').slice(0, 2).map(w => w[0]).join('');
          const isVip = c.totalSpent >= 1000;
          return (
            <div key={c.id} className="cliente-card card card-padding">
              <div className="cliente-card-header">
                <div className="cliente-avatar">
                  {initials}
                  {isVip && (
                    <div className="cliente-vip-badge">
                      <Star size={8} fill="currentColor" />
                    </div>
                  )}
                </div>
                <div className="cliente-info">
                  <div className="cliente-name">{c.name}</div>
                  {isVip && <span className="badge badge-warning">VIP</span>}
                </div>
              </div>

              <div className="cliente-contact">
                <div className="cliente-contact-item">
                  <Mail size={12} />
                  <span>{c.email}</span>
                </div>
                <div className="cliente-contact-item">
                  <Phone size={12} />
                  <span>{c.phone}</span>
                </div>
              </div>

              <div className="cliente-stats">
                <div className="cliente-stat">
                  <div className="cliente-stat-value">{c.purchases}</div>
                  <div className="cliente-stat-label">Compras</div>
                </div>
                <div className="cliente-stat-divider" />
                <div className="cliente-stat">
                  <div className="cliente-stat-value cliente-stat-value--price">
                    {c.totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <div className="cliente-stat-label">Total gasto</div>
                </div>
                <div className="cliente-stat-divider" />
                <div className="cliente-stat">
                  <div className="cliente-stat-value">
                    {(c.totalSpent / c.purchases).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <div className="cliente-stat-label">Ticket médio</div>
                </div>
              </div>

              <button className="btn btn-secondary btn-full" style={{ marginTop: 'var(--space-3)' }}>
                <TrendingUp size={14} />
                Ver histórico
              </button>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon"><Search size={24} /></div>
          <div className="empty-state-title">Nenhum cliente encontrado</div>
        </div>
      )}
    </div>
  );
}
