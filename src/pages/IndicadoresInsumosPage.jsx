import IndicadoresInsumos from '../components/IndicadoresInsumos';

// Tela só de leitura: consumo, cobertura e reposição de insumos (também para quem não acessa a tela de Consumo).
export default function IndicadoresInsumosPage() {
  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Indicadores de insumos</h1>
      </div>
      <IndicadoresInsumos />
    </div>
  );
}
