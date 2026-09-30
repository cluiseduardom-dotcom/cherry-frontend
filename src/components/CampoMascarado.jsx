import { useRef } from 'react';

// Input controlado que aplica uma função de máscara a cada digitação
// preservando a posição do cursor (Issue #41: "cursor não deve saltar de
// forma inesperada"). A estratégia é contar quantos dígitos existem antes
// do cursor no valor digitado e reposicionar o cursor depois da mesma
// quantidade de dígitos no valor já mascarado — funciona tanto para
// digitação no meio da string quanto para colar um valor já formatado,
// já que as máscaras deste projeto só inserem separadores, nunca reordenam
// dígitos.
//
// A exibição sempre passa por `mascara(value)`, não o `value` cru — assim
// um valor carregado do backend já normalizado (só dígitos, ex. ao abrir
// "editar") aparece formatado desde o primeiro render, sem depender do
// componente pai pré-formatar antes de popular o estado.
export default function CampoMascarado({ mascara, value, onChange, className = 'input-field', ...props }) {
  const inputRef = useRef(null);

  function handleChange(e) {
    const elemento = e.target;
    const posicaoCursor = elemento.selectionStart ?? elemento.value.length;
    const digitosAntesDoCursor = (elemento.value.slice(0, posicaoCursor).match(/\d/g) || []).length;

    const valorMascarado = mascara(elemento.value);
    onChange(valorMascarado);

    requestAnimationFrame(() => {
      if (!inputRef.current) return;

      let contados = 0;
      let novaPosicao = valorMascarado.length;

      if (digitosAntesDoCursor === 0) {
        novaPosicao = 0;
      } else {
        for (let i = 0; i < valorMascarado.length; i++) {
          if (/\d/.test(valorMascarado[i])) contados++;
          if (contados === digitosAntesDoCursor) {
            novaPosicao = i + 1;
            break;
          }
        }
      }

      inputRef.current.setSelectionRange(novaPosicao, novaPosicao);
    });
  }

  return (
    <input
      ref={inputRef}
      className={className}
      value={mascara(value)}
      onChange={handleChange}
      {...props}
    />
  );
}
