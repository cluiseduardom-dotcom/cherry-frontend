import { X } from 'lucide-react';
import { formatarMoeda } from '../utils/mascaras';
import { rotuloDaVariacao } from '../utils/gradePdv';
import './EscolherVariacaoModal.css';

// PDV: escolha da variação de uma grade (tamanho, cor...). Cada botão é um produto normal, com preço e estoque próprios.
export default function EscolherVariacaoModal({ grade, onEscolher, onClose }) {
  return (
    <div className="variacao-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="variacao-modal" role="dialog" aria-modal="true" aria-label={`Escolher variação de ${grade.name}`}>
        <div className="variacao-header">
          <h2>{grade.name}</h2>
          <button type="button" className="variacao-fechar" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
        </div>
        <p className="variacao-sub">Escolha a variação</p>
        <div className="variacao-lista">
          {grade.variacoes.map((v) => {
            const semEstoque = Number(v.stock) <= 0;
            const semPreco = v.price == null;
            return (
              <button
                key={v.id}
                type="button"
                className="variacao-opcao"
                disabled={semEstoque || semPreco}
                onClick={() => onEscolher(v)}
              >
                <strong>{rotuloDaVariacao(v)}</strong>
                <span>{semPreco ? 'Sem preço' : formatarMoeda(v.price)}</span>
                <small>{semEstoque ? 'Esgotado' : `${v.stock} em estoque`}</small>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
