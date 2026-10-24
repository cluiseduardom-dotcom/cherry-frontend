import { CheckCircle2, Clock, Hourglass, Ban, XCircle } from 'lucide-react';

export function inicioMesISO() {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-01`;
}

export function fimMesISO() {
  const agora = new Date();
  const ultimoDia = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).getDate();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
}

export function obterAbasPermitidas({ user, temCapacidade = () => false } = {}) {
  const podeVerEquipe = user?.role === 'admin' || temCapacidade('ver_vendas_de_todos');
  const podeGerirPercentuais = user?.role === 'admin';

  const lista = [
    { key: 'minhas', label: 'Minhas comissões' },
  ];

  if (podeVerEquipe) {
    lista.push({ key: 'equipe', label: 'Equipe' });
  }

  lista.push({ key: 'repasses', label: 'Repasses' });

  if (podeGerirPercentuais) {
    lista.push({ key: 'percentuais', label: 'Percentuais' });
  }

  return lista;
}

export function formatarDataHora(valor) {
  if (!valor) return 'Não informada';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return 'Não informada';

  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  const hora = String(data.getHours()).padStart(2, '0');
  const min = String(data.getMinutes()).padStart(2, '0');

  return `${dia}/${mes}/${ano} ${hora}:${min}`;
}

export function formatarPercentual(valor) {
  if (valor === null || valor === undefined || valor === '') return '-';
  const num = Number(valor);
  if (Number.isNaN(num)) return '-';

  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }) + '%';
}

export function validarPercentualInput(valorInput) {
  if (valorInput === null || valorInput === undefined || String(valorInput).trim() === '') {
    return { valido: false, erro: 'Informe um percentual válido entre 0 e 100.' };
  }

  const num = Number(String(valorInput).replace(',', '.'));
  if (Number.isNaN(num) || num < 0 || num > 100) {
    return { valido: false, erro: 'O percentual deve ser um número entre 0 e 100.' };
  }

  const partes = String(num).split('.');
  if (partes[1] && partes[1].length > 4) {
    return { valido: false, erro: 'O percentual pode ter no máximo 4 casas decimais.' };
  }

  return { valido: true, valor: num };
}

export function formatarDescricaoEvento(tipo, origem) {
  if (tipo === 'apurada') {
    return 'Comissão apurada (venda finalizada)';
  }
  if (tipo === 'liberacao') {
    switch (origem) {
      case 'venda':
        return 'Liberação imediata (à vista / pix / débito)';
      case 'pagamento':
        return 'Liberação por pagamento de parcela';
      case 'repasse':
        return 'Liberação por confirmação de repasse em dinheiro';
      case 'conta_receber':
        return 'Liberação por recebimento de conta a receber';
      default:
        return 'Liberação de comissão';
    }
  }
  if (tipo === 'reducao') {
    switch (origem) {
      case 'estorno_pagamento':
        return 'Redução por estorno de pagamento';
      default:
        return 'Redução de comissão';
    }
  }
  if (tipo === 'estorno') {
    switch (origem) {
      case 'cancelamento_venda':
        return 'Estorno total por cancelamento da venda';
      default:
        return 'Estorno de comissão';
    }
  }
  return `${tipo} (${origem || 'origem não informada'})`;
}

export function getComissaoStatusMeta(status) {
  switch (status) {
    case 'liberada':
      return {
        label: 'Liberada',
        badgeClass: 'badge-success',
        icon: CheckCircle2,
      };
    case 'parcial':
      return {
        label: 'Parcial',
        badgeClass: 'badge-info',
        icon: Clock,
      };
    case 'pendente':
      return {
        label: 'Pendente',
        badgeClass: 'badge-warning',
        icon: Hourglass,
      };
    case 'estornada':
      return {
        label: 'Estornada',
        badgeClass: 'badge-danger',
        icon: Ban,
      };
    default:
      return {
        label: status || 'Desconhecido',
        badgeClass: 'badge-info',
        icon: Clock,
      };
  }
}

export function getRepasseStatusMeta(status) {
  switch (status) {
    case 'a_repassar':
      return {
        label: 'A repassar',
        badgeClass: 'badge-warning',
        icon: Hourglass,
      };
    case 'confirmado':
      return {
        label: 'Confirmado',
        badgeClass: 'badge-success',
        icon: CheckCircle2,
      };
    case 'cancelado':
      return {
        label: 'Cancelado',
        badgeClass: 'badge-danger',
        icon: XCircle,
      };
    default:
      return {
        label: status || 'Desconhecido',
        badgeClass: 'badge-info',
        icon: Clock,
      };
  }
}
