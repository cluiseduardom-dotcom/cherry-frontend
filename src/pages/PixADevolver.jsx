import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import PixDevolverAba from '../components/comissoes/PixDevolverAba';
import DevolverPixModal from '../components/comissoes/DevolverPixModal';
import { mensagemDevolucao } from '../utils/pixDevolucao';

// Pix pago que pode voltar ao pagador. É do núcleo do Financeiro (não depende de Comissões nem de plano).
// Quem tem `gerir_financeiro` chega aqui; o backend (/pagamentos-gateway) decide de novo.
export default function PixADevolver() {
  const toast = useToast();
  const [pixParaDevolver, setPixParaDevolver] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleDevolvido(resultado) {
    toast?.success?.(mensagemDevolucao(resultado?.status));
    setRefreshKey(k => k + 1);
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pix a devolver</h1>
          <p className="page-subtitle">Pix pago sem venda concluída ou de venda cancelada, e o histórico das devoluções</p>
        </div>
      </div>

      <PixDevolverAba onDevolver={item => setPixParaDevolver(item)} refreshKey={refreshKey} />

      <DevolverPixModal
        key={pixParaDevolver?.codigo ?? 'nenhum'}
        item={pixParaDevolver}
        open={Boolean(pixParaDevolver)}
        onClose={() => setPixParaDevolver(null)}
        onSuccess={handleDevolvido}
      />
    </div>
  );
}
