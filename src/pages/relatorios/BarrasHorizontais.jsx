import { larguraDaBarra, maximoDasBarras } from '../../utils/relatoriosGestao';

/** Lista de barras horizontais simples (sem biblioteca): `itens` = [{ chave, rotulo, valor, detalhe }]. */
export default function BarrasHorizontais({ itens, formatar }) {
  const maximo = maximoDasBarras(itens, 'valor');

  if (itens.length === 0) return <p className="text-sm text-secondary">Sem dados para o período.</p>;

  return (
    <ul className="rel-barras">
      {itens.map(item => (
        <li key={item.chave} className="rel-barras-item">
          <div className="rel-barras-topo">
            <span className="rel-barras-rotulo">{item.rotulo}</span>
            <span className="rel-barras-valor">{formatar(item.valor)}</span>
          </div>
          <div className="rel-barras-trilha">
            <div className="rel-barras-preenchimento" style={{ width: `${larguraDaBarra(item.valor, maximo)}%` }} />
          </div>
          {item.detalhe && <span className="rel-barras-detalhe">{item.detalhe}</span>}
        </li>
      ))}
    </ul>
  );
}
