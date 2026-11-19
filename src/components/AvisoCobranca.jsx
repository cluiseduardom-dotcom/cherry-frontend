import { Clock, TriangleAlert } from 'lucide-react';
import { avisoCobranca } from '../utils/cobranca';
import './AvisoCobranca.css';

// Faixa no topo do conteúdo: fim do teste grátis chegando, pagamento perto de vencer ou conta somente para consulta.
// Só informa; quem barra a gravação é o backend. Sem aviso (isenta, sem regra, longe do prazo) não renderiza nada.
export default function AvisoCobranca({ cobranca, hoje }) {
  const aviso = avisoCobranca(cobranca, hoje);
  if (!aviso) return null;

  const erro = aviso.tom === 'erro';
  const Icone = erro ? TriangleAlert : Clock;

  return (
    <div className={`aviso-cobranca aviso-cobranca--${aviso.tom}`} role={erro ? 'alert' : 'status'}>
      <Icone size={18} aria-hidden="true" className="aviso-cobranca-icone" />
      <div className="aviso-cobranca-texto">
        <strong>{aviso.titulo}</strong>
        <span>{aviso.texto}</span>
      </div>
    </div>
  );
}
