import { useEffect, useRef, useState } from 'react';
import { ImagePlus, RefreshCw } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { atualizarRetrato, enviarRetrato, listarRetratos, removerRetrato } from '../services/lojaRetratos';
import { avisoDeProporcao, dataBr, LIMITES_RETRATO, pendenciasDoRetrato, situacaoDoRetrato, validarTextos } from '../utils/lojaRetratos';
import { prepararFotoRetrato } from '../utils/prepararFotoRetrato';

const MENSAGEM_FUNDO = {
  fundo_complexo: 'O fundo desta foto não é liso, então não consegui tirá-lo sozinha: na Home ela aparece como um retângulo. Para ficar sem fundo, envie uma foto já recortada (PNG ou WebP com transparência).',
  sem_fundo: 'Não encontrei fundo para tirar nesta foto: na Home ela aparece como um retângulo, se tiver fundo.',
  excessivo: 'O fundo parece ter a mesma cor da pessoa e não deu para tirá-lo sozinha. Envie uma foto já recortada (PNG ou WebP com transparência).',
};
import './LojaProdutos.css';
import './LojaRetratos.css';

const TEXTO_CONFIRMACAO = 'Você confirma que tem em mãos o TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM, assinado pela pessoa da foto?\n\n'
  + 'Seu nome e a data ficam registrados. Sem o termo assinado, não confirme.';

function Cartao({ retrato, aoMudar, aoRemover }) {
  const toast = useToast();
  const [alt, setAlt] = useState(retrato.alt ?? '');
  const [nome, setNome] = useState(retrato.nome ?? '');
  const [ordem, setOrdem] = useState(String(retrato.ordem));
  const [ocupado, setOcupado] = useState(false);
  const situacao = situacaoDoRetrato(retrato);
  const pendencias = pendenciasDoRetrato(retrato, { alt });
  const alterado = alt !== (retrato.alt ?? '') || nome !== (retrato.nome ?? '') || ordem !== String(retrato.ordem);

  async function agir(dados, mensagem) {
    setOcupado(true);

    try {
      const atualizado = await atualizarRetrato(retrato.id, dados);
      aoMudar(atualizado);
      if (mensagem) toast?.success?.(mensagem);
    } catch (e) {
      toast?.error?.(e.message || 'Não foi possível salvar.');
    } finally {
      setOcupado(false);
    }
  }

  function salvarTextos() {
    const problema = validarTextos({ alt, nome, ordem });

    if (problema) { toast?.error?.(problema); return; }

    agir({ alt: alt.trim() || null, nome: nome.trim() || null, ordem: Number(ordem || 0) }, 'Dados salvos.');
  }

  function alternarAutorizacao() {
    if (retrato.autorizacao_assinada) {
      if (window.confirm('Tirar a autorização? A foto sai da Home na hora.')) agir({ autorizacao_assinada: false }, 'Autorização retirada: a foto saiu da Home.');
      return;
    }

    if (window.confirm(TEXTO_CONFIRMACAO)) agir({ autorizacao_assinada: true }, 'Autorização confirmada.');
  }

  async function remover() {
    if (!window.confirm('Remover esta foto? Ela sai da Home e o arquivo é apagado.')) return;

    setOcupado(true);

    try {
      await removerRetrato(retrato.id);
      aoRemover(retrato.id);
      toast?.success?.('Foto removida.');
    } catch (e) {
      toast?.error?.(e.message || 'Não foi possível remover.');
      setOcupado(false);
    }
  }

  return (
    <li className="loja-produtos-item card card-padding loja-retratos-item">
      <img className="loja-retratos-foto" src={retrato.url} alt={retrato.alt || 'Foto enviada'} width={90} height={160} />

      <div className="loja-retratos-dados">
        <div className="loja-produtos-topo">
          <span className={`loja-produtos-selo ${situacao.tom}`}>{situacao.rotulo}</span>
        </div>

        <label className="loja-produtos-campo">
          <span>Descrição da foto (para leitor de tela; descreva o que se vê, sem inventar nome)</span>
          <input className="input" type="text" maxLength={LIMITES_RETRATO.alt} value={alt} onChange={(e) => setAlt(e.target.value)} />
        </label>
        <label className="loja-produtos-campo">
          <span>Nome na foto (opcional; só preencha se o termo autoriza mostrar o nome)</span>
          <input className="input" type="text" maxLength={LIMITES_RETRATO.nome} value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        <label className="loja-produtos-campo curto">
          <span>Ordem (menor aparece primeiro)</span>
          <input className="input" type="number" min={0} step={1} value={ordem} onChange={(e) => setOrdem(e.target.value)} />
        </label>

        <p className="loja-retratos-autorizacao">
          {retrato.autorizacao_assinada
            ? <>Autorização confirmada por <strong>{retrato.autorizado_por ?? 'administrador'}</strong>{retrato.autorizado_em ? ` em ${dataBr(retrato.autorizado_em)}` : ''}.</>
            : 'Autorização de uso de imagem ainda não confirmada.'}
        </p>

        {pendencias.length > 0 && (
          <ul className="loja-produtos-avisos">
            {pendencias.map((p) => <li key={p}>{p}</li>)}
          </ul>
        )}

        <div className="loja-produtos-acoes">
          <button type="button" className={`btn ${retrato.autorizacao_assinada ? 'btn-ghost' : 'btn-primary'}`} disabled={ocupado} onClick={alternarAutorizacao}>
            {retrato.autorizacao_assinada ? 'Tirar autorização' : 'Tenho o termo assinado'}
          </button>
          <button
            type="button"
            className={`btn ${retrato.ativo ? 'btn-ghost' : 'btn-primary'}`}
            disabled={ocupado || (!retrato.ativo && pendencias.length > 0)}
            onClick={() => agir({ ativo: !retrato.ativo }, retrato.ativo ? 'Foto saiu da Home.' : 'Foto na Home.')}
          >
            {retrato.ativo ? 'Tirar da Home' : 'Mostrar na Home'}
          </button>
          <button type="button" className="btn btn-ghost" disabled={ocupado || !alterado} onClick={salvarTextos}>Salvar textos</button>
          <button type="button" className="btn btn-ghost" disabled={ocupado} onClick={remover}>Remover</button>
        </div>
      </div>
    </li>
  );
}

// Fotos da abertura da Home da loja online e a autorização de uso de imagem de cada pessoa. Só admin, só com a
// funcionalidade `loja_online`; o backend decide de novo: só vai ao ar foto ativa E com a autorização confirmada.
export default function LojaRetratos() {
  const toast = useToast();
  const entrada = useRef(null);
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [recarga, setRecarga] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState('');
  // Foto cujo fundo liso foi removido: a pessoa confere e escolhe qual versão usar antes de enviar.
  const [escolha, setEscolha] = useState(null);

  useEffect(() => {
    let cancelado = false;

    listarRetratos()
      .then((lista) => { if (!cancelado) { setItens(lista); setErro(''); } })
      .catch((e) => { if (!cancelado) setErro(e.message || 'Não foi possível carregar as fotos.'); })
      .finally(() => { if (!cancelado) setCarregando(false); });

    return () => { cancelado = true; };
  }, [recarga]);

  async function subir(arquivo) {
    setEnviando(true);

    try {
      const criado = await enviarRetrato(arquivo);
      setItens((atual) => [...atual, criado]);
      toast?.success?.('Foto enviada. Agora descreva a foto e confirme a autorização para mostrar na Home.');
    } catch (err) {
      toast?.error?.(err.message || 'Não foi possível enviar a foto.');
    } finally {
      setEnviando(false);
    }
  }

  function fecharEscolha() {
    if (escolha) { URL.revokeObjectURL(escolha.urlOriginal); URL.revokeObjectURL(escolha.urlSemFundo); }
    setEscolha(null);
  }

  function usar(qual) {
    const arquivo = qual === 'semFundo' ? escolha.semFundo : escolha.arquivo;
    fecharEscolha();
    subir(arquivo);
  }

  async function aoEscolher(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';

    if (!arquivo) return;

    setEnviando(true);
    setAviso('');

    try {
      const pronto = await prepararFotoRetrato(arquivo);
      const prop = avisoDeProporcao(pronto.largura, pronto.altura);

      if (pronto.semFundo) {
        // Fundo liso removido: mostra as duas versões para conferir (o recorte automático pode errar se a roupa tem a cor do fundo).
        setEscolha({
          ...pronto,
          urlOriginal: URL.createObjectURL(pronto.arquivo),
          urlSemFundo: URL.createObjectURL(pronto.semFundo),
        });
        setAviso(prop);
        setEnviando(false);
        return;
      }

      setAviso([prop, MENSAGEM_FUNDO[pronto.acao] ?? ''].filter(Boolean).join(' '));
      await subir(pronto.arquivo);
    } catch (err) {
      toast?.error?.(err.message || 'Não foi possível enviar a foto.');
      setEnviando(false);
    }
  }

  const trocar = (atualizado) => setItens((lista) => lista.map((r) => (r.id === atualizado.id ? atualizado : r)));
  const tirar = (id) => setItens((lista) => lista.filter((r) => r.id !== id));

  return (
    <div className="page-content loja-produtos-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Retratos da Home</h1>
          <p className="page-subtitle">Fotos da abertura da loja online. Com mais de uma, a Home troca de foto a cada dia.</p>
        </div>
        <div className="loja-produtos-cabecalho-acoes">
          <input ref={entrada} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={aoEscolher} />
          <button type="button" className="btn btn-primary" disabled={enviando} onClick={() => entrada.current?.click()}>
            <ImagePlus size={16} /> {enviando ? 'Enviando...' : 'Enviar foto'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => { setCarregando(true); setRecarga((n) => n + 1); }} disabled={carregando}>
            <RefreshCw size={16} /> Atualizar
          </button>
        </div>
      </div>

      <p className="loja-produtos-aviso">
        <strong>Só aparece na loja a foto que estiver ativa e com a autorização de uso de imagem confirmada.</strong> A foto enviada nasce desligada.
        Confirme a autorização apenas com o termo assinado em mãos (modelo em docs/AUTORIZACAO-USO-DE-IMAGEM).
        Quem confirmou e a data ficam registrados. Sem nenhuma foto liberada, a Home mostra só o texto.
      </p>
      <p className="loja-produtos-aviso">
        <strong>Como a foto fica:</strong> a Home mostra uma faixa com o texto de um lado e a pessoa do outro, colada na base da faixa.
        A foto deve ser vertical (9:16, ex.: 900×1600), com o rosto e os ombros no terço de cima, centralizados e com um respiro acima da cabeça.
        <strong>Sem fundo:</strong> a tela tira sozinha o fundo liso (você confere antes de enviar). Fundo com cenário precisa de foto já recortada
        (PNG ou WebP com transparência); sem recorte a foto aparece como um retângulo.
      </p>
      {aviso && <p className="loja-produtos-aviso" role="status">{aviso}</p>}

      {escolha && (
        <div className="card card-padding loja-retratos-escolha" role="group" aria-label="Escolher a versão da foto">
          <p><strong>Tiramos o fundo da foto.</strong> Confira se a pessoa ficou inteira (às vezes o recorte come roupa da mesma cor do fundo) e escolha qual versão usar.</p>
          <div className="loja-retratos-escolha-fotos">
            <figure>
              <img className="loja-retratos-xadrez" src={escolha.urlSemFundo} alt="Foto com o fundo removido" />
              <figcaption>Sem fundo</figcaption>
            </figure>
            <figure>
              <img src={escolha.urlOriginal} alt="Foto original" />
              <figcaption>Original</figcaption>
            </figure>
          </div>
          <div className="loja-produtos-acoes">
            <button type="button" className="btn btn-primary" onClick={() => usar('semFundo')}>Usar sem fundo</button>
            <button type="button" className="btn btn-ghost" onClick={() => usar('original')}>Enviar a original</button>
            <button type="button" className="btn btn-ghost" onClick={fecharEscolha}>Cancelar</button>
          </div>
        </div>
      )}

      {erro && <div className="loja-produtos-erro" role="alert">{erro}</div>}
      {carregando && <div className="card card-padding" role="status"><span className="spinner" /> Carregando fotos...</div>}

      {!carregando && !erro && itens.length === 0 && (
        <div className="card empty-state">
          <ImagePlus className="empty-state-icon" size={36} />
          <div className="empty-state-title">Nenhuma foto enviada</div>
          <p className="text-sm text-secondary">Use &quot;Enviar foto&quot;. Enquanto não houver foto liberada, a Home mostra só o texto.</p>
        </div>
      )}

      {!carregando && itens.length > 0 && (
        <ul className="loja-produtos-lista">
          {itens.map((r) => <Cartao key={r.id} retrato={r} aoMudar={trocar} aoRemover={tirar} />)}
        </ul>
      )}
    </div>
  );
}
