import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { opcoesDeEntrada, paraUnidadeBase, formatarQuantidade } from '../utils/unidades';
import { validarQuantidadeDigitada } from '../utils/vendaPeso';

// Quantidade de um item vendido por peso/volume no carrinho: campo em kg/L (ex.: 0,35) com − e + de 50 g/ml.
// O carrinho guarda a quantidade INTEIRA na unidade-base; aqui só se converte. `onMais`/`onMenos` e `onDigitar(qtdBase)` vêm da tela.
export default function QuantidadePeso({ item, onMais, onMenos, onDigitar }) {
  const grande = opcoesDeEntrada(item.unidade)[1];
  const [texto, setTexto] = useState(null); // null = mostrando o valor do carrinho
  const [erro, setErro] = useState('');
  const mostrado = texto ?? String(item.qty / grande.fator).replace('.', ',');

  function confirmar() {
    if (texto === null) return;
    const conv = paraUnidadeBase(texto, item.unidade, 'grande');
    const checado = conv.erro ? conv : validarQuantidadeDigitada(conv.valor, item.stock, formatarQuantidade(item.stock, item.unidade));
    if (checado.erro) {
      setErro(checado.erro);
      return;
    }
    setErro('');
    setTexto(null);
    onDigitar(checado.valor);
  }

  return (
    <div className="cart-item-controls cart-item-controls--peso">
      <button type="button" className="cart-qty-btn" onClick={onMenos} aria-label="Diminuir 50"><Minus size={11} strokeWidth={3} /></button>
      <input
        className="cart-qty-input"
        inputMode="decimal"
        aria-label={`Quantidade em ${grande.rotulo}`}
        value={mostrado}
        onChange={(e) => { setTexto(e.target.value); setErro(''); }}
        onBlur={confirmar}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmar(); } if (e.key === 'Escape') { setTexto(null); setErro(''); } }}
      />
      <span className="cart-qty-unidade">{grande.rotulo}</span>
      <button type="button" className="cart-qty-btn" onClick={onMais} aria-label="Aumentar 50" disabled={item.qty >= item.stock}><Plus size={11} strokeWidth={3} /></button>
      {erro && <div className="cart-qty-erro" role="alert">{erro}</div>}
    </div>
  );
}
