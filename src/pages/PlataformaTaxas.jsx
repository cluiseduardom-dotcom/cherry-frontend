import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { obterTaxasPlataforma } from '../services/plataforma';
import { formatarMoeda } from '../utils/mascaras';
import { mesAtualBrasilia, deslocarMes, rotuloMes, formatarPercentuais } from '../utils/plataforma';
import './PlataformaTaxas.css';

export default function PlataformaTaxas() {
  const mesAtual = mesAtualBrasilia();
  const [mes, setMes] = useState(mesAtual);
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro('');
    obterTaxasPlataforma(mes)
      .then(d => { if (!cancelado) setDados(d); })
      .catch(err => { if (!cancelado) { setDados(null); setErro(err.message || 'Não foi possível carregar as taxas.'); } })
      .finally(() => { if (!cancelado) setCarregando(false); });
    return () => { cancelado = true; };
  }, [mes]);

  const items = dados?.items ?? [];
  const totais = dados?.totais;
  const semMovimento = !!dados && items.every(i => i.qtd_vendas === 0 && i.qtd_estornadas === 0);

  return (
    <div className="page-content plataforma-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Taxas a receber</h1>
          <p className="page-subtitle">Vertumno · taxa da plataforma apurada por loja</p>
        </div>
      </div>

      <div className="plataforma-mes">
        <button type="button" className="btn btn-secondary btn-sm" aria-label="Mês anterior" onClick={() => setMes(m => deslocarMes(m, -1))}>
          <ChevronLeft size={16} />
        </button>
        <span className="plataforma-mes-rotulo" aria-live="polite">{rotuloMes(mes)}</span>
        <button type="button" className="btn btn-secondary btn-sm" aria-label="Próximo mês" disabled={mes >= mesAtual} onClick={() => setMes(m => deslocarMes(m, 1))}>
          <ChevronRight size={16} />
        </button>
      </div>

      {erro && <div className="plataforma-erro" role="alert">{erro}</div>}

      {carregando && !dados && <p className="text-sm text-secondary">Carregando...</p>}

      {totais && (
        <div className="plataforma-resumo">
          <div className="card plataforma-resumo-item plataforma-resumo-item--destaque">
            <span className="text-xs text-secondary">Total a receber</span>
            <span className="plataforma-resumo-valor">{formatarMoeda(totais.total_taxa)}</span>
          </div>
          <div className="card plataforma-resumo-item">
            <span className="text-xs text-secondary">Vendas apuradas</span>
            <span className="plataforma-resumo-valor">{totais.qtd_vendas}</span>
          </div>
          <div className="card plataforma-resumo-item">
            <span className="text-xs text-secondary">Base das vendas</span>
            <span className="plataforma-resumo-valor">{formatarMoeda(totais.total_base)}</span>
          </div>
        </div>
      )}

      {dados && semMovimento && (
        <div className="card empty-state">
          <p className="empty-state-title">Nenhuma venda apurada em {rotuloMes(mes)}</p>
        </div>
      )}

      {dados && !semMovimento && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="tabela-plataforma">
            <thead>
              <tr>
                <th>Loja</th>
                <th className="plataforma-num">Vendas</th>
                <th className="plataforma-num">Base</th>
                <th>Percentual</th>
                <th className="plataforma-num">Taxa a receber</th>
              </tr>
            </thead>
            <tbody>
              {items.map(i => (
                <tr key={i.empresa_id}>
                  <td>
                    <span className="plataforma-empresa-nome">{i.empresa_nome}</span>
                    <span className="plataforma-linha-movel">
                      {i.qtd_vendas} venda(s) · base {formatarMoeda(i.total_base)} · {formatarPercentuais(i.percentuais)}
                    </span>
                    {i.qtd_estornadas > 0 && (
                      <span className="plataforma-estorno">
                        {i.qtd_estornadas} venda(s) cancelada(s) fora do total ({formatarMoeda(i.total_estornado)})
                      </span>
                    )}
                  </td>
                  <td className="plataforma-num plataforma-col-detalhe" data-label="Vendas">{i.qtd_vendas}</td>
                  <td className="plataforma-num plataforma-col-detalhe" data-label="Base">{formatarMoeda(i.total_base)}</td>
                  <td className="plataforma-col-detalhe" data-label="Percentual">{formatarPercentuais(i.percentuais)}</td>
                  <td className="plataforma-num plataforma-taxa">{formatarMoeda(i.total_taxa)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="plataforma-nota">
        Valores apurados no momento de cada venda, com o percentual vigente na data. Vendas canceladas não entram no total.
        O mês segue o horário de Brasília. A cobrança é consolidada e manual por enquanto.
      </p>
    </div>
  );
}
