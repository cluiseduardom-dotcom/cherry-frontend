import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Circle } from 'lucide-react';
import { obterProntidao } from '../../services/fiscal';
import { pendenciasObrigatorias, textoDoItem } from '../../utils/fiscal';

// Checklist do que falta para a emissão de nota. "Pronto" = cadastro completo, não garante aceite da SEFAZ.
export default function ProntidaoFiscal({ versao, onIr }) {
  const [estado, setEstado] = useState({ versao: null, dados: null, erro: '' });

  useEffect(() => {
    let cancelado = false;
    obterProntidao()
      .then(dados => { if (!cancelado) setEstado({ versao, dados, erro: '' }); })
      .catch(err => { if (!cancelado) setEstado({ versao, dados: null, erro: err.message }); });
    return () => { cancelado = true; };
  }, [versao]);

  if (estado.versao !== versao) return <div className="empty-state"><p className="text-sm text-secondary">Carregando...</p></div>;
  if (estado.erro) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Não foi possível carregar a prontidão</div>
        <p className="text-sm text-secondary">{estado.erro}</p>
      </div>
    );
  }

  const { dados } = estado;
  const pendentes = pendenciasObrigatorias(dados);

  return (
    <div>
      <div className={`card card-padding fiscal-resumo${dados.pronto ? ' fiscal-resumo--ok' : ''}`}>
        <h2 className="section-title">
          {dados.pronto ? 'Cadastro completo para a emissão' : `${pendentes.length} ${pendentes.length === 1 ? 'pendência obrigatória' : 'pendências obrigatórias'}`}
        </h2>
        <p className="text-sm text-secondary">
          {dados.resumo.ok} de {dados.resumo.obrigatorios} itens obrigatórios em dia. Esta tela só confere o cadastro: nenhuma nota é emitida por aqui.
        </p>
      </div>

      {dados.grupos.map(grupo => (
        <div key={grupo.id} className="card card-padding fiscal-grupo">
          <h3 className="section-title">{grupo.titulo}</h3>
          <ul className="fiscal-itens">
            {grupo.itens.map(item => (
              <li key={item.id} className={`fiscal-item${item.ok ? ' fiscal-item--ok' : ''}`}>
                <span className="fiscal-item-marca" aria-hidden="true">{item.ok ? <CheckCircle2 size={16} /> : <Circle size={16} />}</span>
                <span className="fiscal-item-texto">
                  <strong>{item.rotulo}</strong>{!item.obrigatorio && <span className="badge fiscal-item-opcional">Recomendado</span>}
                  <span className="fiscal-item-detalhe">{textoDoItem(item)}</span>
                </span>
                {!item.ok && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => onIr(grupo.id === 'produtos' ? 'produtos' : item.id === 'cnpj' || item.id === 'razao_social' || item.id === 'endereco' ? 'cadastro' : 'empresa')}>
                    Corrigir
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {dados.produtos_pendentes.length > 0 && (
        <div className="card card-padding fiscal-grupo">
          <h3 className="section-title">Produtos pendentes (primeiros {dados.produtos_pendentes.length})</h3>
          <ul className="fiscal-itens">
            {dados.produtos_pendentes.map(p => (
              <li key={p.id} className="fiscal-item">
                <span className="fiscal-item-marca" aria-hidden="true"><Circle size={16} /></span>
                <span className="fiscal-item-texto">
                  <strong>{p.nome}</strong>
                  <span className="fiscal-item-detalhe">{p.sku ?? 'sem SKU'} · falta {p.falta.map(f => (f === 'ncm' ? 'NCM' : 'origem')).join(' e ')}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="fiscal-avisos">
        {dados.avisos.map(aviso => (
          <p key={aviso} className="text-sm text-secondary"><AlertTriangle size={13} aria-hidden="true" /> {aviso}</p>
        ))}
      </div>
    </div>
  );
}
