import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Share2, X } from 'lucide-react';
import { garantirCodigosParaEtiqueta } from '../../services/produtosCodigos';
import { listarProdutos } from '../../services/produtos';
import { buscarTodasAsPaginas } from '../../pages/relatorios/relatoriosUtils';
import { useConfirmarFechamentoModal } from '../../hooks/useConfirmarFechamentoModal';
import { canvasParaBlob, gerarPdfFolha, renderizarEtiquetaPng } from '../../utils/etiquetaRender';
import { PRESET_FOLHA_A4, PRESET_NIMBOT_D110, validarFolha } from '../../utils/etiquetaProduto';
import '../compras/BarcodeScannerModal.css';
import './EtiquetasModal.css';

const FORMATO_NIMBOT = 'nimbot';
const FORMATO_A4 = 'a4';

function nomeDeArquivo(nome, codigo) {
  const limpo = String(nome ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return `etiqueta-${codigo}${limpo ? `-${limpo}` : ''}.png`;
}

function baixarBlob(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const numero = (valor) => (valor === '' ? NaN : Number(String(valor).replace(',', '.')));

// itens: [{ produto_id, nome, quantidade }] (ex.: itens de um recebimento). Gera/consulta o código de cada
// produto no backend e produz a etiqueta: PNG por produto (Nimbot D110, importado no app) ou PDF em folha A4.
export default function EtiquetasModal({ itens, onClose }) {
  const [linhas, setLinhas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [formato, setFormato] = useState(FORMATO_NIMBOT);
  const [nimbot, setNimbot] = useState({ larguraMm: String(PRESET_NIMBOT_D110.larguraMm), alturaMm: String(PRESET_NIMBOT_D110.alturaMm) });
  const [folha, setFolha] = useState(() => Object.fromEntries(Object.entries(PRESET_FOLHA_A4).map(([k, v]) => [k, String(v)])));
  const [mostrarPreco, setMostrarPreco] = useState(true);
  const [mensagem, setMensagem] = useState('');

  const { solicitarFechamento } = useConfirmarFechamentoModal({ open: true, isDirty: false, onClose });

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        const ids = [...new Set(itens.map((i) => i.produto_id).filter(Boolean))];
        const codigos = await garantirCodigosParaEtiqueta(ids);
        let precos = new Map();

        try {
          const produtos = await buscarTodasAsPaginas((params) => listarProdutos({ ...params, canal: 'loja_fisica' }));
          precos = new Map(produtos.map((p) => [p.id, p.preco_venda ?? p.price ?? null]));
        } catch {
          // Sem preço a etiqueta sai só com nome e código; não impede de imprimir.
        }

        if (cancelado) return;

        const porProduto = new Map(codigos.map((c) => [c.produto_id, c]));

        setLinhas(itens.filter((i) => porProduto.has(i.produto_id)).map((i) => ({
          produto_id: i.produto_id,
          nome: i.nome,
          codigo: porProduto.get(i.produto_id).codigo,
          preco: precos.get(i.produto_id) ?? null,
          copias: Math.max(1, Math.floor(Number(i.quantidade) || 1)),
        })));
      } catch (err) {
        if (!cancelado) setErro(err.message);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }

    carregar();
    return () => { cancelado = true; };
  }, [itens]);

  const tamanhoNimbot = useMemo(() => ({ larguraMm: numero(nimbot.larguraMm), alturaMm: numero(nimbot.alturaMm) }), [nimbot]);
  const cfgFolha = useMemo(() => ({
    larguraMm: numero(folha.larguraMm), alturaMm: numero(folha.alturaMm),
    colunas: numero(folha.colunas), linhas: numero(folha.linhas),
    margemEsquerdaMm: numero(folha.margemEsquerdaMm), margemTopoMm: numero(folha.margemTopoMm),
    espacoHorizontalMm: numero(folha.espacoHorizontalMm), espacoVerticalMm: numero(folha.espacoVerticalMm),
  }), [folha]);
  const erroFolha = formato === FORMATO_A4 ? validarFolha(cfgFolha) : '';
  const tamanhoAtivo = useMemo(
    () => (formato === FORMATO_A4 ? { larguraMm: cfgFolha.larguraMm, alturaMm: cfgFolha.alturaMm } : tamanhoNimbot),
    [formato, cfgFolha, tamanhoNimbot],
  );
  const tamanhoValido = tamanhoAtivo.larguraMm > 0 && tamanhoAtivo.alturaMm > 0;

  const primeira = linhas[0];

  // Prévia derivada (não é estado): desenha a primeira etiqueta com as medidas e a opção de preço atuais.
  const previa = useMemo(() => {
    if (!primeira || !tamanhoValido) return { url: '', aviso: '' };

    try {
      const { canvas, plano } = renderizarEtiquetaPng({ ...primeira, preco: mostrarPreco ? primeira.preco : null }, tamanhoAtivo);

      return {
        url: canvas.toDataURL('image/png'),
        aviso: plano.pequenaDemais ? 'As barras ficaram muito finas para esta etiqueta: o leitor pode falhar, principalmente no celular. Use uma etiqueta maior.' : '',
      };
    } catch (err) {
      return { url: '', aviso: err.message };
    }
  }, [primeira, mostrarPreco, tamanhoAtivo, tamanhoValido]);

  function alterarCopias(produtoId, valor) {
    setLinhas((atual) => atual.map((l) => (l.produto_id === produtoId ? { ...l, copias: valor } : l)));
  }

  const dadosDe = (linha) => ({ codigo: linha.codigo, nome: linha.nome, preco: mostrarPreco ? linha.preco : null });

  async function baixarPng(linha) {
    setMensagem('');
    try {
      const { canvas } = renderizarEtiquetaPng(dadosDe(linha), tamanhoNimbot);

      baixarBlob(await canvasParaBlob(canvas), nomeDeArquivo(linha.nome, linha.codigo));
    } catch (err) {
      setMensagem(err.message);
    }
  }

  async function compartilharPng(linha) {
    setMensagem('');
    try {
      const { canvas } = renderizarEtiquetaPng(dadosDe(linha), tamanhoNimbot);
      const arquivo = new File([await canvasParaBlob(canvas)], nomeDeArquivo(linha.nome, linha.codigo), { type: 'image/png' });

      await navigator.share({ files: [arquivo], title: 'Etiqueta' });
    } catch (err) {
      if (err?.name !== 'AbortError') setMensagem(err.message);
    }
  }

  function baixarPdf() {
    setMensagem('');
    try {
      const doc = gerarPdfFolha(linhas.map((l) => ({ ...dadosDe(l), copias: Number(l.copias) })), cfgFolha);

      doc.save('etiquetas.pdf');
    } catch (err) {
      setMensagem(err.message);
    }
  }

  const podeCompartilhar = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function'
    && typeof File !== 'undefined' && navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] });
  const totalEtiquetas = linhas.reduce((acc, l) => acc + (Number(l.copias) || 0), 0);

  return (
    <div className="compra-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && solicitarFechamento()}>
      <div className="compra-modal etiquetas-modal">
        <div className="compra-modal-header">
          <h2>Etiquetas com código de barras</h2>
          <button type="button" className="produto-action-btn" onClick={solicitarFechamento} aria-label="Fechar"><X size={16} /></button>
        </div>

        {carregando && <p className="text-sm text-secondary">Gerando códigos…</p>}
        {erro && <div className="compra-alert error">{erro}</div>}

        {!carregando && !erro && (
          <>
            <div className="etiquetas-formatos" role="radiogroup" aria-label="Onde imprimir">
              <label><input type="radio" name="etq-formato" checked={formato === FORMATO_NIMBOT} onChange={() => setFormato(FORMATO_NIMBOT)} /> Nimbot D110 (imagem PNG)</label>
              <label><input type="radio" name="etq-formato" checked={formato === FORMATO_A4} onChange={() => setFormato(FORMATO_A4)} /> Folha A4 (PDF, Epson)</label>
            </div>

            {formato === FORMATO_NIMBOT ? (
              <div className="etiquetas-medidas">
                <label>Largura (mm)<input className="input-field" inputMode="decimal" value={nimbot.larguraMm} onChange={(e) => setNimbot({ ...nimbot, larguraMm: e.target.value })} /></label>
                <label>Altura (mm)<input className="input-field" inputMode="decimal" value={nimbot.alturaMm} onChange={(e) => setNimbot({ ...nimbot, alturaMm: e.target.value })} /></label>
                <p className="text-sm text-secondary etiquetas-dica">Rolo 15×30 mm: largura 30 e altura 15. Baixe a imagem e abra no app da Nimbot; as cópias você escolhe lá.</p>
              </div>
            ) : (
              <div className="etiquetas-medidas">
                {[
                  ['larguraMm', 'Largura da etiqueta (mm)'], ['alturaMm', 'Altura da etiqueta (mm)'],
                  ['colunas', 'Colunas'], ['linhas', 'Linhas'],
                  ['margemEsquerdaMm', 'Margem esquerda (mm)'], ['margemTopoMm', 'Margem do topo (mm)'],
                  ['espacoHorizontalMm', 'Espaço entre colunas (mm)'], ['espacoVerticalMm', 'Espaço entre linhas (mm)'],
                ].map(([campo, rotulo]) => (
                  <label key={campo}>{rotulo}
                    <input className="input-field" inputMode="decimal" value={folha[campo]} onChange={(e) => setFolha({ ...folha, [campo]: e.target.value })} />
                  </label>
                ))}
                <p className="text-sm text-secondary etiquetas-dica">Medidas padrão de exemplo: ajuste às da sua folha adesiva e imprima antes uma folha comum para conferir o alinhamento. No Epson, imprima em tamanho real (100%, sem “ajustar à página”).</p>
                {erroFolha && <div className="compra-alert error">{erroFolha}</div>}
              </div>
            )}

            <label className="etiquetas-preco">
              <input type="checkbox" checked={mostrarPreco} onChange={(e) => setMostrarPreco(e.target.checked)} /> Mostrar preço na etiqueta
            </label>

            {previa.url && <img className="etiquetas-previa" src={previa.url} alt="Prévia da etiqueta" />}
            {previa.aviso && <div className="compra-alert error">{previa.aviso}</div>}

            <table className="etiquetas-tabela">
              <thead><tr><th>Produto</th><th>Código</th><th className="numeric">Cópias</th>{formato === FORMATO_NIMBOT && <th />}</tr></thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.produto_id}>
                    <td>{l.nome}</td>
                    <td>{l.codigo}</td>
                    <td className="numeric">
                      <input className="input-field etiquetas-copias" inputMode="numeric" value={l.copias} aria-label={`Cópias de ${l.nome}`}
                        onChange={(e) => alterarCopias(l.produto_id, e.target.value.replace(/\D/g, '').slice(0, 3))} />
                    </td>
                    {formato === FORMATO_NIMBOT && (
                      <td className="etiquetas-acoes">
                        <button type="button" className="btn btn-secondary" disabled={!tamanhoValido} onClick={() => baixarPng(l)}><Download size={14} /> PNG</button>
                        {podeCompartilhar && <button type="button" className="btn btn-ghost" disabled={!tamanhoValido} onClick={() => compartilharPng(l)}><Share2 size={14} /></button>}
                      </td>
                    )}
                  </tr>
                ))}
                {linhas.length === 0 && <tr><td colSpan={4}>Nenhum produto para etiquetar.</td></tr>}
              </tbody>
            </table>

            {mensagem && <div className="compra-alert error">{mensagem}</div>}

            {formato === FORMATO_A4 && (
              <button type="button" className="btn btn-primary" disabled={Boolean(erroFolha) || totalEtiquetas === 0} onClick={baixarPdf}>
                <FileText size={16} /> Baixar PDF ({totalEtiquetas} etiquetas)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
