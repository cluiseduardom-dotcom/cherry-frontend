import { AlertTriangle } from 'lucide-react';
import { atalhosDePeriodo } from '../../utils/relatoriosGestao';

/** Datas início/fim com atalhos (7, 30, 90 dias, este mês). `erro` vem de validarPeriodo ('' = válido). */
export default function FiltroPeriodo({ idBase, inicio, fim, onChange, erro, children }) {
  return (
    <>
      <div className="rel-filtros">
        <div className="input-wrapper">
          <label className="input-label" htmlFor={`${idBase}-inicio`}>Data início</label>
          <input id={`${idBase}-inicio`} type="date" className="input-field" value={inicio} onChange={e => onChange({ inicio: e.target.value, fim })} />
        </div>
        <div className="input-wrapper">
          <label className="input-label" htmlFor={`${idBase}-fim`}>Data fim</label>
          <input id={`${idBase}-fim`} type="date" className="input-field" value={fim} onChange={e => onChange({ inicio, fim: e.target.value })} />
        </div>
        {children}
      </div>
      <div className="rel-atalhos" role="group" aria-label="Atalhos de período">
        {atalhosDePeriodo().map(atalho => (
          <button
            key={atalho.chave}
            type="button"
            className={`btn btn-ghost btn-sm${atalho.inicio === inicio && atalho.fim === fim ? ' rel-atalho--ativo' : ''}`}
            onClick={() => onChange({ inicio: atalho.inicio, fim: atalho.fim })}
          >
            {atalho.rotulo}
          </button>
        ))}
      </div>
      {erro && <p className="rel-inline-error"><AlertTriangle size={14} /> {erro}</p>}
    </>
  );
}
