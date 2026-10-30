import { useCallback, useEffect, useState } from 'react';
import { listarEmpresasComercial, listarPlanosComerciais } from '../services/plataforma';
import { formatarData, formatarPercentual, rotuloOrigem } from '../utils/plataforma';
import { useToast } from '../context/ToastContext';
import PlataformaComercialModal from '../components/PlataformaComercialModal';
import PlataformaHistoricoModal from '../components/PlataformaHistoricoModal';
import './PlataformaEmpresas.css';

const MENSAGEM_SUCESSO = {
  plano: 'Plano alterado.',
  condicao: 'Exceção de taxa registrada.',
  encerrar: 'Exceção de taxa encerrada.',
};

// Operador da plataforma: plano e exceção de taxa de cada empresa. Quem pode é decidido pelo backend.
export default function PlataformaEmpresas() {
  const toast = useToast();
  const [empresas, setEmpresas] = useState(null);
  const [planos, setPlanos] = useState([]);
  const [erro, setErro] = useState('');
  const [acao, setAcao] = useState(null); // { modo: 'plano' | 'condicao' | 'encerrar' | 'historico', empresa }

  const carregar = useCallback(async () => {
    setErro('');
    try {
      const [listaEmpresas, listaPlanos] = await Promise.all([listarEmpresasComercial(), listarPlanosComerciais()]);
      setEmpresas(listaEmpresas);
      setPlanos(listaPlanos);
    } catch (err) {
      setEmpresas(null);
      setErro(err?.message || 'Não foi possível carregar as empresas.');
    }
  }, []);

  useEffect(() => {
    let ativo = true;
    Promise.all([listarEmpresasComercial(), listarPlanosComerciais()])
      .then(([listaEmpresas, listaPlanos]) => {
        if (!ativo) return;
        setEmpresas(listaEmpresas);
        setPlanos(listaPlanos);
      })
      .catch(err => { if (ativo) setErro(err?.message || 'Não foi possível carregar as empresas.'); });
    return () => { ativo = false; };
  }, []);

  function aoSalvar(modo) {
    setAcao(null);
    toast.success(MENSAGEM_SUCESSO[modo]);
    carregar();
  }

  return (
    <div className="page-content plataforma-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Planos e condições</h1>
          <p className="page-subtitle">Vertumno · plano e exceção de taxa de cada empresa</p>
        </div>
      </div>

      {erro && <div className="plataforma-erro" role="alert">{erro}</div>}
      {!empresas && !erro && <p className="text-sm text-secondary">Carregando...</p>}

      {empresas && empresas.length === 0 && (
        <div className="card empty-state"><p className="empty-state-title">Nenhuma empresa cadastrada</p></div>
      )}

      {empresas && empresas.map(e => (
        <div className="card plataforma-empresa-card" key={e.empresa_id}>
          <div className="plataforma-empresa-topo">
            <div className="plataforma-empresa-info">
              <span className="plataforma-empresa-nome">{e.empresa_nome}</span>
              {e.status !== 'ativa' && <span className="plataforma-tag">{e.status}</span>}
            </div>
            <div className="plataforma-regra">
              {e.regra_efetiva.erro
                ? <span className="plataforma-estorno" role="alert">Configuração inválida: {e.regra_efetiva.erro}</span>
                : <><strong>{formatarPercentual(e.regra_efetiva.percentual)}</strong><span className="text-xs text-secondary"> sobre o Pix · {rotuloOrigem(e.regra_efetiva.origem)}</span></>}
            </div>
          </div>

          <dl className="plataforma-detalhes">
            <div>
              <dt>Plano</dt>
              <dd>
                {e.plano
                  ? <>{e.plano.nome} <span className="text-xs text-secondary">desde {formatarData(e.plano.vigencia_inicio)}{e.plano.tem_mensalidade ? '' : ' · sem mensalidade'}</span></>
                  : <span className="text-secondary">Sem plano (vale o padrão)</span>}
              </dd>
            </div>
            <div>
              <dt>Exceção</dt>
              <dd>
                {e.condicao
                  ? <>{formatarPercentual(e.condicao.percentual)} <span className="text-xs text-secondary">desde {formatarData(e.condicao.vigencia_inicio)}{e.condicao.vigencia_fim ? ` até ${formatarData(e.condicao.vigencia_fim)}` : ''}</span><span className="plataforma-hist-sub">{e.condicao.justificativa}</span></>
                  : <span className="text-secondary">Nenhuma</span>}
              </dd>
            </div>
          </dl>

          <div className="plataforma-acoes">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAcao({ modo: 'plano', empresa: e })}>Alterar plano</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAcao({ modo: 'condicao', empresa: e })}>
              {e.condicao ? 'Trocar exceção' : 'Definir exceção'}
            </button>
            {e.condicao && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAcao({ modo: 'encerrar', empresa: e })}>Encerrar exceção</button>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAcao({ modo: 'historico', empresa: e })}>Histórico</button>
          </div>
        </div>
      ))}

      <p className="plataforma-nota">
        A taxa incide só sobre a parte paga em Pix. A mudança vale a partir da data escolhida e nunca recalcula vendas já feitas.
        Quem alterou e a justificativa ficam registrados. Alterar o percentual de um plano ainda é feito fora desta tela.
      </p>

      {acao && acao.modo === 'historico' && (
        <PlataformaHistoricoModal empresa={acao.empresa} onClose={() => setAcao(null)} />
      )}
      {acao && acao.modo !== 'historico' && (
        <PlataformaComercialModal
          key={`${acao.modo}-${acao.empresa.empresa_id}`}
          modo={acao.modo}
          empresa={acao.empresa}
          planos={planos}
          onClose={() => setAcao(null)}
          onSaved={aoSalvar}
        />
      )}
    </div>
  );
}
