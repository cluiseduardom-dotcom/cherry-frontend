import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { obterHistoricoComercial } from '../services/plataforma';
import { formatarData, formatarPercentual } from '../utils/plataforma';
import './ProductModal.css';

function Encerramento({ item }) {
  if (!item.encerrado_por) return null;
  return (
    <span className="plataforma-hist-sub">
      {item.ativo ? 'Encerrado' : 'Cancelado'} por {item.encerrado_por}: {item.motivo_encerramento}
    </span>
  );
}

// Somente leitura: quem registrou cada plano/exceção, quando valeu e por quê.
export default function PlataformaHistoricoModal({ empresa, onClose }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let cancelado = false;
    obterHistoricoComercial(empresa.empresa_id)
      .then(d => { if (!cancelado) setDados(d); })
      .catch(err => { if (!cancelado) setErro(err?.message || 'Não foi possível carregar o histórico.'); });
    return () => { cancelado = true; };
  }, [empresa.empresa_id]);

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ph-titulo">
        <div className="modal-header">
          <h2 className="modal-title" id="ph-titulo">Histórico · {empresa.empresa_nome}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>
        <div className="modal-body">
          {erro && <div className="modal-error" role="alert">{erro}</div>}
          {!dados && !erro && <p className="text-sm text-secondary">Carregando...</p>}

          {dados && (
            <>
              <h3 className="plataforma-hist-titulo">Planos</h3>
              {dados.planos.length === 0 && <p className="text-sm text-secondary">Nenhum plano registrado (vale o padrão sem plano).</p>}
              <ul className="plataforma-hist-lista">
                {dados.planos.map(p => (
                  <li key={p.id} className={p.ativo ? '' : 'plataforma-hist-inativo'}>
                    <strong>{p.plano_nome}</strong> · {formatarData(p.vigencia_inicio)} até {p.vigencia_fim ? formatarData(p.vigencia_fim) : 'sem fim'}
                    <span className="plataforma-hist-sub">{p.justificativa} · {p.responsavel}</span>
                    <Encerramento item={p} />
                  </li>
                ))}
              </ul>

              <h3 className="plataforma-hist-titulo">Exceções de taxa</h3>
              {dados.condicoes.length === 0 && <p className="text-sm text-secondary">Nenhuma exceção registrada.</p>}
              <ul className="plataforma-hist-lista">
                {dados.condicoes.map(c => (
                  <li key={c.id} className={c.ativo ? '' : 'plataforma-hist-inativo'}>
                    <strong>{formatarPercentual(c.percentual)}</strong> · {formatarData(c.vigencia_inicio)} até {c.vigencia_fim ? formatarData(c.vigencia_fim) : 'sem fim'}
                    <span className="plataforma-hist-sub">{c.justificativa} · {c.responsavel}</span>
                    <Encerramento item={c} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}
