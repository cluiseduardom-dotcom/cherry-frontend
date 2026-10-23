export function formInicial() {
  return { motivo: '', email: '', senha: '' };
}

export function validarCancelamento(form, previa) {
  const motivo = (form?.motivo ?? '').trim();
  if (!motivo) {
    return 'Informe o motivo do cancelamento';
  }
  if (motivo.length < 5) {
    return 'O motivo deve ter no mínimo 5 caracteres';
  }
  if (motivo.length > 500) {
    return 'O motivo deve ter no máximo 500 caracteres';
  }

  if (previa?.exige_autorizacao) {
    const email = (form?.email ?? '').trim();
    const senha = form?.senha ?? '';
    if (!email) {
      return 'Informe o e-mail do autorizador';
    }
    if (!senha) {
      return 'Informe a senha do autorizador';
    }
  }

  return '';
}

export function montarPayloadCancelamento(form, previa) {
  const payload = {
    motivo: (form?.motivo ?? '').trim(),
  };

  if (previa?.exige_autorizacao && form?.email && form?.senha) {
    payload.autorizacao = {
      email: form.email.trim(),
      senha: form.senha,
    };
  }

  return payload;
}

export function formatarErroCancelamento(err) {
  if (!err) return 'Erro inesperado ao cancelar a venda.';
  const status = err.status;
  const mensagem = err.message || '';

  if (status === 400) {
    return mensagem || 'Dados inválidos para o cancelamento. Verifique o motivo informado.';
  }
  if (status === 403) {
    if (mensagem.includes('exige autorização')) {
      return mensagem;
    }
    if (mensagem.toLowerCase().includes('autorização') || mensagem.toLowerCase().includes('autorizacao')) {
      return 'Autorização recusada: e-mail ou senha incorretos, ou cargo insuficiente.';
    }
    return mensagem || 'Você não tem permissão para cancelar esta venda.';
  }
  if (status === 404) {
    return 'Venda não encontrada ou não disponível para cancelamento.';
  }
  if (status === 409) {
    if (mensagem.includes('Somente vendas finalizadas')) {
      return 'Esta venda já foi cancelada ou não está finalizada.';
    }
    if (mensagem.includes('conta a receber já recebida')) {
      return 'Não é possível cancelar venda com conta a receber já recebida.';
    }
    if (mensagem.includes('mudou de faixa')) {
      return 'A idade da venda mudou de faixa durante a autorização. Tente novamente.';
    }
    return mensagem || 'Conflito ao cancelar a venda. Verifique se ela já foi cancelada.';
  }
  if (status === 429) {
    return 'Limite de tentativas de autorização atingido. Aguarde alguns minutos antes de tentar novamente.';
  }
  return mensagem || 'Erro ao cancelar venda. Tente novamente.';
}