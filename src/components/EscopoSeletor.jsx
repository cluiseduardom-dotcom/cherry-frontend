import './EscopoSeletor.css';

const ESCOPOS = [
  { valor: 'produto', rotulo: 'Produtos' },
  { valor: 'insumo', rotulo: 'Insumos' },
];

// Seletor "Produtos | Insumos" usado nas telas de categorias e de padrões de SKU.
export default function EscopoSeletor({ value, onChange, disabled = false }) {
  return (
    <div className="escopo-seletor" role="tablist" aria-label="Tipo de item">
      {ESCOPOS.map(({ valor, rotulo }) => (
        <button
          key={valor}
          type="button"
          role="tab"
          aria-selected={value === valor}
          disabled={disabled}
          className={`escopo-seletor-btn ${value === valor ? 'escopo-seletor-btn--active' : ''}`}
          onClick={() => value !== valor && onChange(valor)}
        >
          {rotulo}
        </button>
      ))}
    </div>
  );
}
