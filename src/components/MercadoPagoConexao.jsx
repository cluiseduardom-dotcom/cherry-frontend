import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ConfirmDialog from './ConfirmDialog';
import { useConfirmAction } from '../hooks/useConfirmAction';
import { useToast } from '../context/ToastContext';
import {
  obterStatusMercadoPago,
  iniciarConexaoMercadoPago,
  desconectarMercadoPago,
} from '../services/mercadoPago';
import { lerResultadoMercadoPago, urlAutorizacaoValida, estadoMercadoPago } from '../utils/mercadoPago';
import { formatarDataHora } from '../utils/formatarData';
import './MercadoPagoConexao.css';

// Parte visual, sem efeitos: recebe tudo por props (testável sem DOM).
export function MercadoPagoPainel({ estado, conectadoEm, ocupado, erro, onConectar, onDesconectar }) {
  return (
    <section className="card card-padding mp-conexao" aria-labelledby="mp-titulo">
      <div className="modal-form-section">
        <h3 className="modal-form-section-title" id="mp-titulo">Recebimento por Pix (Mercado Pago)</h3>

        {erro && <div className="modal-error" role="alert">{erro}</div>}

        {estado === 'carregando' && <p>Carregando…</p>}

        {estado === 'indisponivel' && (
          <p className="campo-dica">Não foi possível consultar a conexão agora. Recarregue a página para tentar de novo.</p>
        )}

        {estado === 'nao_configurado' && (
          <p className="campo-dica">
            A integração com o Mercado Pago ainda não está habilitada neste ambiente.
            Enquanto isso, o Pix continua sendo confirmado manualmente no PDV.
          </p>
        )}

        {estado === 'desconectado' && (
          <>
            <p>
              Conecte a conta Mercado Pago da empresa para receber o Pix direto no PDV, com QR code na tela
              e confirmação automática. O dinheiro cai na conta da própria empresa.
            </p>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary" onClick={onConectar} disabled={ocupado}>
                {ocupado ? 'Abrindo Mercado Pago…' : 'Conectar Mercado Pago'}
              </button>
            </div>
          </>
        )}

        {estado === 'conectado' && (
          <>
            <p>
              <strong>Conectado</strong>
              {conectadoEm ? ` desde ${formatarDataHora(conectadoEm)}` : ''}.
              O Pix do PDV pode ser cobrado com QR code e confirmado automaticamente.
            </p>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onDesconectar} disabled={ocupado}>
                {ocupado ? 'Desconectando…' : 'Desconectar'}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default function MercadoPagoConexao() {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const { acaoPendente, pedirConfirmacao, confirmar, cancelar } = useConfirmAction();

  async function carregar() {
    try {
      setStatus(await obterStatusMercadoPago());
    } catch {
      setStatus(null);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  // Retorno do OAuth: avisa o resultado uma vez e limpa o parâmetro da URL.
  useEffect(() => {
    const resultado = lerResultadoMercadoPago(location.search);
    if (!resultado) return;
    if (resultado === 'conectado') toast.success('Mercado Pago conectado.');
    else toast.error('Não foi possível conectar o Mercado Pago. Tente novamente.');
    navigate(location.pathname, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  async function conectar() {
    setErro('');
    setOcupado(true);
    try {
      const { url } = await iniciarConexaoMercadoPago();
      if (!urlAutorizacaoValida(url)) {
        setErro('Endereço de autorização inválido. Não foi possível conectar.');
        setOcupado(false);
        return;
      }
      window.location.assign(url);
    } catch (err) {
      setErro(err.message);
      setOcupado(false);
    }
  }

  async function desconectar() {
    setErro('');
    setOcupado(true);
    try {
      await desconectarMercadoPago();
      toast.success('Mercado Pago desconectado.');
      await carregar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setOcupado(false);
    }
  }

  const estado = carregando ? 'carregando' : estadoMercadoPago(status);

  return (
    <>
      <MercadoPagoPainel
        estado={estado}
        conectadoEm={status?.conectado_em}
        ocupado={ocupado}
        erro={erro}
        onConectar={conectar}
        onDesconectar={() => pedirConfirmacao({
          title: 'Desconectar o Mercado Pago?',
          message: 'O Pix deixa de ser confirmado automaticamente no PDV e volta a ser confirmado manualmente. Você pode conectar de novo quando quiser.',
          confirmLabel: 'Desconectar',
          tone: 'danger',
          execute: desconectar,
        })}
      />
      <ConfirmDialog
        open={acaoPendente !== null}
        title={acaoPendente?.title}
        message={acaoPendente?.message}
        confirmLabel={acaoPendente?.confirmLabel}
        tone={acaoPendente?.tone}
        onConfirm={confirmar}
        onCancel={cancelar}
      />
    </>
  );
}
