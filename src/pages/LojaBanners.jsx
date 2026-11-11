import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, RefreshCw } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { atualizarBanner, criarBanner, enviarImagemDoBanner, listarBanners, removerBanner, removerImagemDoBanner } from '../services/lojaBanners';
import { formDoBanner, FUNDOS, LIMITES_BANNER, MAX_BANNERS, montarCorpoBanner, situacaoDoBanner, temConteudo, validarBanner } from '../utils/lojaBanners';
import { prepararFotoRetrato } from '../utils/prepararFotoRetrato';
import './LojaProdutos.css';
import './LojaRetratos.css';
import './LojaBanners.css';

const ALTURA_IMAGEM = 1000;
const LADOS = [
  { id: 'esquerda', rotulo: 'Imagem da esquerda', ajuda: 'Na primeira faixa, use o retrato do dia (abaixo) e deixe esta vazia.' },
  { id: 'direita', rotulo: 'Imagem da direita', ajuda: 'Ex.: as joias que a modelo está usando, ou a foto dos itens da promoção.' },
];

function Imagem({ banner, lado, aoMudar }) {
  const toast = useToast();
  const entrada = useRef(null);
  const [ocupado, setOcupado] = useState(false);
  const [escolha, setEscolha] = useState(null);
  const url = banner[`imagem_${lado.id}`];

  async function subir(arquivo) {
    setOcupado(true);

    try {
      aoMudar(await enviarImagemDoBanner(banner.id, lado.id, arquivo));
      toast?.success?.('Imagem enviada.');
    } catch (e) {
      toast?.error?.(e.message || 'Não foi possível enviar a imagem.');
    } finally {
      setOcupado(false);
    }
  }

  function fechar() {
    if (escolha) { URL.revokeObjectURL(escolha.urlOriginal); URL.revokeObjectURL(escolha.urlSemFundo); }
    setEscolha(null);
  }

  async function aoEscolher(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';

    if (!arquivo) return;

    setOcupado(true);

    try {
      const pronto = await prepararFotoRetrato(arquivo, { alturaMaxima: ALTURA_IMAGEM });

      if (pronto.semFundo) {
        setEscolha({ ...pronto, urlOriginal: URL.createObjectURL(pronto.arquivo), urlSemFundo: URL.createObjectURL(pronto.semFundo) });
        setOcupado(false);
        return;
      }

      await subir(pronto.arquivo);
    } catch (err) {
      toast?.error?.(err.message || 'Não foi possível preparar a imagem.');
      setOcupado(false);
    }
  }

  async function tirar() {
    if (!window.confirm('Tirar esta imagem da faixa?')) return;

    setOcupado(true);

    try {
      aoMudar(await removerImagemDoBanner(banner.id, lado.id));
      toast?.success?.('Imagem removida.');
    } catch (e) {
      toast?.error?.(e.message || 'Não foi possível remover a imagem.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="loja-banners-imagem">
      <p className="loja-banners-imagem-titulo">{lado.rotulo}</p>
      <div className="loja-banners-miniatura loja-retratos-xadrez-fundo">{url ? <img src={url} alt={lado.rotulo} /> : <span>sem imagem</span>}</div>
      <input ref={entrada} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={aoEscolher} />
      <div className="loja-produtos-acoes">
        <button type="button" className="btn btn-ghost" disabled={ocupado} onClick={() => entrada.current?.click()}>{url ? 'Trocar' : 'Enviar'}</button>
        {url && <button type="button" className="btn btn-ghost" disabled={ocupado} onClick={tirar}>Tirar</button>}
      </div>
      <p className="text-sm text-secondary">{lado.ajuda}</p>

      {escolha && (
        <div className="loja-retratos-escolha" role="group" aria-label="Escolher a versão da imagem">
          <p><strong>Tiramos o fundo da imagem.</strong> Confira e escolha:</p>
          <div className="loja-retratos-escolha-fotos">
            <figure><img className="loja-retratos-xadrez" src={escolha.urlSemFundo} alt="Imagem com o fundo removido" /><figcaption>Sem fundo</figcaption></figure>
            <figure><img src={escolha.urlOriginal} alt="Imagem original" /><figcaption>Original</figcaption></figure>
          </div>
          <div className="loja-produtos-acoes">
            <button type="button" className="btn btn-primary" onClick={() => { const a = escolha.semFundo; fechar(); subir(a); }}>Usar sem fundo</button>
            <button type="button" className="btn btn-ghost" onClick={() => { const a = escolha.arquivo; fechar(); subir(a); }}>Enviar a original</button>
            <button type="button" className="btn btn-ghost" onClick={fechar}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Cartao({ banner, indice, total, aoMudar, aoRemover, aoMover }) {
  const toast = useToast();
  const [form, setForm] = useState(() => formDoBanner(banner));
  const [ocupado, setOcupado] = useState(false);
  const situacao = situacaoDoBanner(banner);
  const campo = (nome) => (e) => setForm((a) => ({ ...a, [nome]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function agir(extra, mensagem) {
    const problema = validarBanner(form);

    if (problema) { toast?.error?.(problema); return; }

    setOcupado(true);

    try {
      // Sempre junto com o que está digitado: o botão libera com o campo preenchido, então o servidor recebe esse texto na mesma ação.
      const salvo = await atualizarBanner(banner.id, { ...montarCorpoBanner(form), ...extra });
      aoMudar(salvo);
      setForm(formDoBanner(salvo));
      if (mensagem) toast?.success?.(mensagem);
    } catch (e) {
      toast?.error?.(e.message || 'Não foi possível salvar.');
    } finally {
      setOcupado(false);
    }
  }

  async function remover() {
    if (!window.confirm('Remover esta faixa? Ela sai da Home e as imagens são apagadas.')) return;

    setOcupado(true);

    try {
      await removerBanner(banner.id);
      aoRemover(banner.id);
      toast?.success?.('Faixa removida.');
    } catch (e) {
      toast?.error?.(e.message || 'Não foi possível remover.');
      setOcupado(false);
    }
  }

  const podeAtivar = temConteudo(form, banner);
  const texto = (nome, rotulo, extra = {}) => (
    <label className="loja-produtos-campo">
      <span>{rotulo}</span>
      <input className="input" type="text" maxLength={LIMITES_BANNER[nome]} value={form[nome]} onChange={campo(nome)} {...extra} />
    </label>
  );

  return (
    <li className="loja-produtos-item card card-padding">
      <div className="loja-produtos-topo">
        <div className="loja-produtos-nome">Faixa {indice + 1}{banner.titulo ? ` · ${banner.titulo}` : ''}</div>
        <span className={`loja-produtos-selo ${situacao.tom}`}>{situacao.rotulo}</span>
      </div>

      <div className="loja-banners-grade">
        {texto('rotulo', 'Etiqueta pequena (ex.: COMEÇOU)')}
        {texto('titulo', 'Título')}
        {texto('destaque', 'Destaque grande (ex.: até 50% off)')}
        {texto('subtitulo', 'Subtítulo')}
        {texto('botao_texto', 'Texto do botão (ex.: comprar)')}
        {texto('link', 'Link do botão e da faixa (ex.: /produtos ou https://...)', { inputMode: 'url' })}
        {texto('rodape_texto', 'Nota pequena (ex.: *Consulte o regulamento)')}
        <label className="loja-produtos-campo">
          <span>Cor de fundo</span>
          <select className="input" value={form.fundo} onChange={campo('fundo')}>{FUNDOS.map((f) => <option key={f.id} value={f.id}>{f.rotulo}</option>)}</select>
        </label>
        <label className="loja-produtos-campo">
          <span>Aparece a partir de (opcional)</span>
          <input className="input" type="datetime-local" value={form.inicio_em} onChange={campo('inicio_em')} />
        </label>
        <label className="loja-produtos-campo">
          <span>Deixa de aparecer em (opcional)</span>
          <input className="input" type="datetime-local" value={form.fim_em} onChange={campo('fim_em')} />
        </label>
      </div>

      <label className="loja-banners-retrato">
        <input type="checkbox" checked={form.usa_retrato} onChange={campo('usa_retrato')} />
        <span>Mostrar o <strong>retrato do dia</strong> à esquerda (a pessoa da tela &quot;Retratos da Home&quot;, só com a autorização confirmada)</span>
      </label>

      <div className="loja-banners-imagens">
        {LADOS.map((l) => <Imagem key={l.id} banner={banner} lado={l} aoMudar={aoMudar} />)}
      </div>

      {!podeAtivar && !banner.ativo && <p className="loja-produtos-avisos">Para ligar a faixa, preencha ao menos um texto ou envie uma imagem.</p>}

      <div className="loja-produtos-acoes">
        <button type="button" className={`btn ${banner.ativo ? 'btn-ghost' : 'btn-primary'}`} disabled={ocupado || (!banner.ativo && !podeAtivar)} onClick={() => agir({ ativo: !banner.ativo }, banner.ativo ? 'Faixa desligada.' : 'Faixa na Home.')}>
          {banner.ativo ? 'Desligar' : 'Ligar na Home'}
        </button>
        <button type="button" className="btn btn-ghost" disabled={ocupado} onClick={() => agir({}, 'Faixa salva.')}>Salvar</button>
        <button type="button" className="btn btn-ghost" disabled={ocupado || indice === 0} onClick={() => aoMover(indice, -1)} aria-label="Subir uma posição"><ArrowUp size={16} /></button>
        <button type="button" className="btn btn-ghost" disabled={ocupado || indice === total - 1} onClick={() => aoMover(indice, 1)} aria-label="Descer uma posição"><ArrowDown size={16} /></button>
        <button type="button" className="btn btn-ghost" disabled={ocupado} onClick={remover}>Remover</button>
      </div>
    </li>
  );
}

// Faixas rotativas da Home da loja online (como o banner do site de referência): promoções, recados e fotos. Só admin, só com a
// funcionalidade `loja_online`; o backend decide de novo. Nada é preenchido pelo sistema: sem faixa ligada, a Home usa a abertura de sempre.
export default function LojaBanners() {
  const toast = useToast();
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [recarga, setRecarga] = useState(0);
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    let cancelado = false;

    listarBanners()
      .then((lista) => { if (!cancelado) { setItens(lista); setErro(''); } })
      .catch((e) => { if (!cancelado) setErro(e.message || 'Não foi possível carregar as faixas.'); })
      .finally(() => { if (!cancelado) setCarregando(false); });

    return () => { cancelado = true; };
  }, [recarga]);

  async function nova() {
    setCriando(true);

    try {
      const criada = await criarBanner({});
      setItens((a) => [...a, criada]);
      toast?.success?.('Faixa criada (desligada). Preencha e ligue na Home.');
    } catch (e) {
      toast?.error?.(e.message || 'Não foi possível criar a faixa.');
    } finally {
      setCriando(false);
    }
  }

  const trocar = (atualizado) => setItens((l) => l.map((b) => (b.id === atualizado.id ? atualizado : b)));
  const tirar = (id) => setItens((l) => l.filter((b) => b.id !== id));

  // Troca de lugar com a vizinha: regrava a ordem das duas (números sequenciais).
  async function mover(indice, delta) {
    const outra = indice + delta;
    const lista = [...itens];
    [lista[indice], lista[outra]] = [lista[outra], lista[indice]];

    try {
      const atualizadas = await Promise.all(lista.map((b, i) => (b.ordem === i ? b : atualizarBanner(b.id, { ordem: i }))));
      setItens(atualizadas);
    } catch (e) {
      toast?.error?.(e.message || 'Não foi possível mudar a ordem.');
      setRecarga((n) => n + 1);
    }
  }

  return (
    <div className="page-content loja-produtos-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Faixas da Home</h1>
          <p className="page-subtitle">As faixas que se alternam no topo da página inicial: promoções, recados e fotos de peças.</p>
        </div>
        <div className="loja-produtos-cabecalho-acoes">
          <button type="button" className="btn btn-primary" disabled={criando || itens.length >= MAX_BANNERS} onClick={nova}>
            <Plus size={16} /> {criando ? 'Criando...' : 'Nova faixa'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => { setCarregando(true); setRecarga((n) => n + 1); }} disabled={carregando}>
            <RefreshCw size={16} /> Atualizar
          </button>
        </div>
      </div>

      <p className="loja-produtos-aviso">
        <strong>Como funciona:</strong> até {MAX_BANNERS} faixas, que trocam sozinhas a cada poucos segundos na Home (o cliente também pode passar com as setas). A ordem aqui é a ordem no site.
        A faixa nasce desligada; só aparece depois de &quot;Ligar na Home&quot; e dentro das datas, se você marcar. <strong>Sem nenhuma faixa ligada, a Home usa a abertura de sempre.</strong>
        Os textos de promoção são decididos pela loja: nada é preenchido pelo sistema.
      </p>
      <p className="loja-produtos-aviso">
        <strong>Sugestão de uso:</strong> faixa 1 com o <em>retrato do dia</em> à esquerda e a foto das joias que a modelo usa na direita; faixas 2 a 4 com a foto dos itens e o texto da promoção ou do recado.
        Prefira imagens <strong>sem fundo</strong> (a tela tira sozinha o fundo liso, e você confere antes de enviar), com a peça bem visível.
      </p>

      {erro && <div className="loja-produtos-erro" role="alert">{erro}</div>}
      {carregando && <div className="card card-padding" role="status"><span className="spinner" /> Carregando faixas...</div>}

      {!carregando && !erro && itens.length === 0 && (
        <div className="card empty-state">
          <div className="empty-state-title">Nenhuma faixa criada</div>
          <p className="text-sm text-secondary">Use &quot;Nova faixa&quot;. Enquanto não houver faixa ligada, a Home mostra a abertura de sempre.</p>
        </div>
      )}

      {!carregando && itens.length > 0 && (
        <ul className="loja-produtos-lista">
          {itens.map((b, i) => <Cartao key={b.id} banner={b} indice={i} total={itens.length} aoMudar={trocar} aoRemover={tirar} aoMover={mover} />)}
        </ul>
      )}
    </div>
  );
}
