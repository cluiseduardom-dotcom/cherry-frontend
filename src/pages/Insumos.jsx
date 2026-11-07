import Produtos from './Produtos';

// Cadastro de insumos (embalagem, tag, material): mesma tela de Produtos, filtrada por tipo.
export default function Insumos() {
  return <Produtos tipo="insumo" />;
}
