import { useState } from 'react';
import { ShoppingBag, Package, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import RelatorioVendas from './relatorios/RelatorioVendas';
import RelatorioEstoque from './relatorios/RelatorioEstoque';
import RelatorioFinanceiro from './relatorios/RelatorioFinanceiro';
import './Relatorios.css';

const TABS = [
  { key: 'vendas', label: 'Vendas', icon: ShoppingBag },
  { key: 'estoque', label: 'Estoque', icon: Package },
  { key: 'financeiro', label: 'Financeiro', icon: DollarSign },
];

export default function Relatorios() {
  const { user } = useAuth();
  const [relatorioAtivo, setRelatorioAtivo] = useState('vendas');

  // A rota /relatorios já é admin-only via ProtectedRoute, mas o conteúdo
  // também não deve renderizar caso esse componente seja usado fora dela.
  if (user?.role !== 'admin') {
    return (
      <div className="page-content">
        <div className="empty-state">
          <div className="empty-state-title">Acesso restrito</div>
          <p className="text-sm text-secondary">Relatórios estão disponíveis apenas para administradores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Relatórios</h1>
          <p className="page-subtitle">Análise detalhada de vendas, estoque e financeiro</p>
        </div>
      </div>

      <div className="rel-tabs">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              className={`rel-tab ${relatorioAtivo === tab.key ? 'rel-tab--active' : ''}`}
              onClick={() => setRelatorioAtivo(tab.key)}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {relatorioAtivo === 'vendas' && <RelatorioVendas />}
      {relatorioAtivo === 'estoque' && <RelatorioEstoque />}
      {relatorioAtivo === 'financeiro' && <RelatorioFinanceiro />}
    </div>
  );
}
