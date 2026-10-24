import { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, Percent, Edit2 } from 'lucide-react';
import { obterPercentuais } from '../../services/comissoes';
import { formatarPercentual } from '../../utils/formatarComissao';
import { ROLE_LABEL } from '../../config/papeis';

export default function PercentuaisComissoesAba({ onEditar, refreshKey }) {
  const [padrao, setPadrao] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setError('');

    obterPercentuais()
      .then(res => {
        if (!cancelado) {
          setPadrao(res?.padrao ?? null);
          setUsuarios(res?.usuarios || []);
        }
      })
      .catch(err => {
        if (!cancelado) {
          setError(err.message || 'Erro ao carregar percentuais.');
        }
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [refreshKey]);

  return (
    <div className="comissoes-aba-conteudo">
      {/* Alerta de Vendas Futuras */}
      <div className="comissoes-alerta-info">
        <AlertTriangle size={20} className="text-warning flex-shrink-0" />
        <div className="text-sm">
          <strong>Regras de Configuração de Percentuais:</strong>
          <p>
            Alterar percentuais afeta exclusivamente as <strong>vendas futuras</strong>. Comissões de vendas já finalizadas continuam congeladas com o percentual da data da venda. O perfil <strong>administrador não herda</strong> o padrão da empresa automaticamente (exige percentual individual caso deseje comissionar).
          </p>
        </div>
      </div>

      {error && (
        <div className="comissoes-error-banner" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Card do Padrão da Empresa */}
      <div className="comissoes-padrao-card card card-padding">
        <div className="comissoes-padrao-info">
          <div className="comissoes-padrao-icon-box">
            <Percent size={24} className="text-primary" />
          </div>
          <div>
            <span className="comissoes-resumo-label">Comissão Padrão da Empresa</span>
            <div className="comissoes-padrao-valor">
              {padrao !== null ? (
                <span className="font-semibold text-2xl text-primary">
                  {formatarPercentual(padrao)}
                </span>
              ) : (
                <span className="text-secondary font-medium">
                  Não configurada (empresa sem padrão)
                </span>
              )}
            </div>
            <p className="text-xs text-secondary" style={{ marginTop: 'var(--space-1)' }}>
              Aplicada automaticamente a todos os vendedores que não possuírem percentual individual.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onEditar({ tipo: 'padrao', padraoAtual: padrao })}
        >
          <Edit2 size={16} />
          {padrao !== null ? 'Alterar padrão' : 'Definir padrão'}
        </button>
      </div>

      {/* Tabela de Usuários e Regras Individuais */}
      <div className="card">
        <div className="card-padding" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
          <h3 className="font-semibold text-base">Percentuais por Vendedor</h3>
          <p className="text-xs text-secondary">
            Percentuais próprios sobrepõem o padrão da empresa. Percentual 0% desativa a comissão do vendedor.
          </p>
        </div>

        {loading && (
          <div className="comissoes-loading-box">
            <span className="spinner" />
            <span>Carregando percentuais dos usuários...</span>
          </div>
        )}

        {!loading && usuarios.length === 0 && (
          <div className="empty-state">
            <Percent className="empty-state-icon" size={36} />
            <div className="empty-state-title">Nenhum vendedor encontrado</div>
            <p className="text-sm text-secondary">
              Não há usuários elegíveis a comissão cadastrados na empresa.
            </p>
          </div>
        )}

        {!loading && usuarios.length > 0 && (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Vendedor / Usuário</th>
                  <th>Cargo</th>
                  <th>Percentual Vigente</th>
                  <th>Origem da Regra</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => {
                  const temProprio = u.percentual !== null && u.percentual !== undefined;
                  const vigenteLabel = temProprio
                    ? formatarPercentual(u.percentual)
                    : u.usa_padrao && padrao !== null
                    ? `${formatarPercentual(padrao)} (Padrão)`
                    : 'Sem comissão';

                  const origemLabel = temProprio
                    ? 'Percentual próprio'
                    : u.usa_padrao
                    ? 'Herda padrão da empresa'
                    : 'Sem comissão (Perfil Admin)';

                  return (
                    <tr key={u.usuario_id}>
                      <td>
                        <strong>{u.nome}</strong>
                      </td>
                      <td>
                        <span className={`role-badge role-badge--${u.cargo}`}>
                          {ROLE_LABEL[u.cargo] || u.cargo}
                        </span>
                      </td>
                      <td>
                        <span className={temProprio ? 'font-semibold text-primary' : ''}>
                          {vigenteLabel}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-info">{origemLabel}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => onEditar({ tipo: 'usuario', usuario: u, padraoAtual: padrao })}
                        >
                          <Edit2 size={14} />
                          Editar regra
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
