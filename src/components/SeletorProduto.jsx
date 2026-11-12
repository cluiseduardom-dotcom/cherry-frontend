import { useId, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { buscarProdutos, moverDestaque, rotuloDoProduto } from '../utils/buscaProduto';
import './SeletorProduto.css';

// Escolha de produto com busca por digitação (nome ou código), pensada para catálogos grandes.
// Controlado: `value` é o id do produto (string) e `onChange(id)` recebe o id escolhido ('' ao limpar).
// Teclado: setas movem, Enter escolhe, ESC fecha só a lista (não o modal). Enter com texto que bate exatamente
// com um código (ex.: leitor de etiqueta) escolhe o produto direto.
export default function SeletorProduto({ id, produtos, value, onChange, disabled = false, placeholder = 'Digite o nome ou o código do produto', mostrarEstoque = true }) {
  const idLista = useId();
  const [texto, setTexto] = useState('');
  const [editando, setEditando] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [destaque, setDestaque] = useState(0);

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
      <div className="seletor-produto-campo">
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
        <ul id={idLista} role="listbox" className="seletor-produto-lista">
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
                  Estoque: {p.estoque_atual}
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
