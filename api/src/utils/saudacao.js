function calcularSaudacao({ ultimoLogin, primeiroLoginPendente, idioma = 'pt' } = {}) {
  const traducoes = {
    pt: { bemVindo: 'Bem-vindo!', novamente: 'Seja bem-vindo novamente', manha: 'Bom dia!', tarde: 'Boa Tarde!', noite: 'Boa Noite!' },
    en: { bemVindo: 'Welcome!',   novamente: 'Welcome back',           manha: 'Good morning!', tarde: 'Good afternoon!', noite: 'Good evening!' },
    es: { bemVindo: '¡Bienvenido!', novamente: 'Bienvenido de nuevo',  manha: '¡Buenos días!', tarde: '¡Buenas tardes!', noite: '¡Buenas noches!' },
  };
  const t = traducoes[idioma] || traducoes.pt;

  if (primeiroLoginPendente) return t.bemVindo;

  if (ultimoLogin) {
    const agora = Date.now();
    const ultimo = new Date(ultimoLogin).getTime();
    const diasDesde = (agora - ultimo) / (1000 * 60 * 60 * 24);
    if (diasDesde >= 15) return t.novamente;
  }

  const hora = new Date().getHours();
  if (hora >= 6 && hora < 13)  return t.manha;
  if (hora >= 13 && hora < 20) return t.tarde;
  return t.noite;
}

module.exports = { calcularSaudacao };
