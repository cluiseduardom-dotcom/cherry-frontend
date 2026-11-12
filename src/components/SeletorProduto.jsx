import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { buscarProdutos, moverDestaque, rotuloDoProduto } from '../utils/buscaProduto';
import './SeletorProduto.css';

// Escolha de produto com busca por digitação (nome ou código), pensada para catálogos grandes.
// Controlado: `value` é o id do produto (string) e `onChange(id)` recebe o id escolhido ('' ao limpar).
// Teclado: setas movem, Enter escolhe, ESC fecha só a lista (não o modal). Enter com texto que bate exatamente
// com um código (ex.: leitor de etiqueta) escolhe o produto direto.
export default function SeletorProduto({ id, produtos, value, onChange, disabled = false, placeholder = 'Digite o nome ou o código do produto', mostrarEstoque = true, rotuloEstoque = 'Estoque' }) {
  const idLista = useId();
  const [texto, setTexto] = useState('');
  const [editando, setEditando] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [destaque, setDestaque] = useState(0);

  const campoRef = useRef(null);
  const [posicao, setPosicao] = useState(null);

  // A lista usa posição fixa (calculada a partir do campo) para não ser cortada pela rolagem do modal que a contém.
  // Abre para baixo; se faltar espaço e houver mais em cima, abre para cima.
  useLayoutEffect(() => {
    if (!aberto || disabled) return undefined;
    const calcular = () => {
      const r = campoRef.current?.getBoundingClientRect();
      if (!r) return;
      const abaixo = window.innerHeight - r.bottom - 12;
      const acima = r.top - 12;
      const paraCima = abaixo < 200 && acima > abaixo;
      const maxHeight = Math.max(120, Math.min(280, paraCima ? acima : abaixo));
      setPosicao({ left: r.left, width: r.width, maxHeight, ...(paraCima ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }) });
    };
    calcular();
    window.addEventListener('resize', calcular);
    window.addEventListener('scroll', calcular, true);
    return () => { window.removeEventListener('resize', calcular); window.removeEventListener('scroll', calcular, true); };
  }, [aberto, disabled]);

  // Opção destacada sempre visível ao navegar com as setas.
  useEffect(() => {
    if (aberto) document.getElementById(`${idLista}-${itens[destaque]?.id}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [aberto, destaque]); // eslint-disable-line react-hooks/exhaustive-deps

  const selecionado = useMemo(() => (produtos ?? []).find((p) => String(p.id) === String(value)) ?? null, [produtos, value]);
  const { itens, total } = useMemo(() => buscarProdutos(produtos, editando ? texto : ''), [produtos, texto, editando]);

  const valorDoCampo = editando ? texto : rotuloDoProduto(selecionado);

  function escolher(p) {
    onChange(String(p.id));
    setEditando(false);
    setTexto('');
    setAberto(false);
  }

  function limpar() {
    onChange('');
    setEditando(true);
    setTexto('');
    setDestaque(0);
    setAberto(true);
  }

  function aoDigitar(e) {
    setEditando(true);
    setTexto(e.target.value);
    setDestaque(0);
    setAberto(true);
  }

  function aoTeclar(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setAberto(true);
      setDestaque((d) => moverDestaque(d, itens.length, e.key === 'ArrowDown' ? 1 : -1));
    } else if (e.key === 'Enter') {
      // Dentro de um formulário, Enter no campo não deve enviar o formulário.
      e.preventDefault();
      if (aberto && itens[destaque]) escolher(itens[destaque]);
    } else if (e.key === 'Escape' && aberto) {
      // Fecha só a lista: sem isto o ESC também fecharia o modal que contém o campo.
      e.nativeEvent.stopImmediatePropagation();
      setAberto(false);
      setEditando(false);
      setTexto('');
    }
  }

  const opcaoAtiva = aberto && itens[destaque] ? `${idLista}-${itens[destaque].id}` : undefined;

  return (
    <div className="seletor-produto">
      <div className="seletor-produto-campo" ref={campoRef}>
        <input
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          className="input-field"
          placeholder={placeholder}
          disabled={disabled}
          value={valorDoCampo}
          aria-expanded={aberto}
          aria-controls={idLista}
          aria-autocomplete="list"
          aria-activedescendant={opcaoAtiva}
          onChange={aoDigitar}
          onKeyDown={aoTeclar}
          onFocus={(e) => { setAberto(true); if (selecionado) e.target.select(); }}
          onBlur={() => { setAberto(false); setEditando(false); setTexto(''); }}
        />
        {selecionado && !disabled && (
          <button type="button" className="seletor-produto-limpar" aria-label="Trocar produto" onMouseDown={(e) => e.preventDefault()} onClick={limpar}>
            <X size={16} />
          </button>
        )}
      </div>

      {aberto && !disabled && (
        <ul id={idLista} role="listbox" className="seletor-produto-lista" style={posicao ?? { visibility: 'hidden' }}>
          {itens.length === 0 && <li className="seletor-produto-vazio" role="presentation">Nenhum produto encontrado para &quot;{texto}&quot;.</li>}
          {itens.map((p, i) => (
            <li
              key={p.id}
              id={`${idLista}-${p.id}`}
              role="option"
              aria-selected={i === destaque}
              className="seletor-produto-opcao"
              // mouseDown (e não click): o campo perderia o foco antes e a lista fecharia sem escolher.
              onMouseDown={(e) => { e.preventDefault(); escolher(p); }}
              onMouseEnter={() => setDestaque(i)}
            >
              <span>
                <span className="seletor-produto-opcao-nome">{p.nome}</span>
                {p.sku && <span className="seletor-produto-opcao-sku">{p.sku}</span>}
              </span>
              {mostrarEstoque && (
                <span className={`seletor-produto-opcao-estoque${Number(p.estoque_atual) === 0 ? ' zerado' : ''}`}>
                  {rotuloEstoque}: {p.estoque_atual}
                </span>
              )}
            </li>
          ))}
          {total > itens.length && (
            <li className="seletor-produto-rodape" role="presentation">Mostrando {itens.length} de {total}. Digite mais para refinar a busca.</li>
          )}
        </ul>
      )}
    </div>
  );
}
