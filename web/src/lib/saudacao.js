/*
 * Saudação ao utilizador (enunciado, bónus).
 *
 * A hora do dia é SEMPRE calculada no cliente (`new Date().getHours()`), para
 * respeitar o fuso horário do utilizador — nunca o do servidor. Os casos
 * "Bem-vindo" (1.º login) e "Seja bem-vindo novamente" (15+ dias) dependem de
 * dados que só o servidor conhece, por isso chegam como `tipo` na resposta de
 * login e aqui apenas escolhemos o texto traduzido.
 */

function saudacaoHora(t) {
  const h = new Date().getHours();
  if (h < 12) return t('bom_dia');
  if (h < 20) return t('boa_tarde');
  return t('boa_noite');
}

/**
 * @param {(chave: string) => string} t  função de tradução do LanguageContext
 * @param {'BEM_VINDO'|'NOVAMENTE'|'HORA'} [tipo]  tipo vindo do backend; omitir para hora do dia
 */
export function saudacaoTexto(t, tipo) {
  if (tipo === 'BEM_VINDO') return t('saud_bem_vindo');
  if (tipo === 'NOVAMENTE') return t('saud_novamente');
  return saudacaoHora(t);
}
