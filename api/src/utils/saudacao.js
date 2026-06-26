/*
 * Decide o TIPO de saudação a mostrar ao utilizador no login.
 *
 * Importante: a saudação por hora do dia (Bom dia/Boa Tarde/Boa Noite) NÃO é
 * decidida aqui — depende do fuso horário do utilizador, não do servidor. Por
 * isso devolvemos apenas 'HORA' e deixamos o frontend calcular a hora local.
 * Já 'BEM_VINDO' (1.º login) e 'NOVAMENTE' (15+ dias sem login) dependem de
 * dados que só o servidor conhece, por isso são decididos aqui.
 *
 * Mapeamento correspondente no frontend: `web/src/lib/saudacao.js`.
 */
function tipoSaudacao({ ultimoLogin, primeiroLoginPendente } = {}) {
  if (primeiroLoginPendente) return 'BEM_VINDO';

  // Primeiro login de sempre (ainda sem registo de login anterior) → "Bem-vindo!"
  if (!ultimoLogin) return 'BEM_VINDO';

  const diasDesde = (Date.now() - new Date(ultimoLogin).getTime()) / (1000 * 60 * 60 * 24);
  if (diasDesde >= 15) return 'NOVAMENTE';

  return 'HORA';
}

/*
 * Texto da saudação (usado como fallback em texto simples, ex.: emails ou
 * clientes sem i18n). O frontend prefere `tipoSaudacao` + renderização local.
 */
function calcularSaudacao({ ultimoLogin, primeiroLoginPendente, idioma = 'pt' } = {}) {
  const traducoes = {
    pt: { bemVindo: 'Bem-vindo!', novamente: 'Seja bem-vindo novamente', manha: 'Bom dia!', tarde: 'Boa Tarde!', noite: 'Boa Noite!' },
    en: { bemVindo: 'Welcome!',   novamente: 'Welcome back',           manha: 'Good morning!', tarde: 'Good afternoon!', noite: 'Good evening!' },
    es: { bemVindo: '¡Bienvenido!', novamente: 'Bienvenido de nuevo',  manha: '¡Buenos días!', tarde: '¡Buenas tardes!', noite: '¡Buenas noches!' },
  };
  const t = traducoes[idioma] || traducoes.pt;
  const tipo = tipoSaudacao({ ultimoLogin, primeiroLoginPendente });

  if (tipo === 'BEM_VINDO') return t.bemVindo;
  if (tipo === 'NOVAMENTE') return t.novamente;

  const hora = new Date().getHours();
  if (hora >= 6 && hora < 13)  return t.manha;
  if (hora >= 13 && hora < 20) return t.tarde;
  return t.noite;
}

module.exports = { calcularSaudacao, tipoSaudacao };
