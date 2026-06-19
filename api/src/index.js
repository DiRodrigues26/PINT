require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors    = require('cors');
const { testConnection } = require('./db/connection');
const { tratadorErros } = require('./middleware/erros');
const { iniciarJobSLA } = require('./jobs/slaAlertas');

const authRoutes           = require('./routes/authRoutes');
const utilizadoresRoutes   = require('./routes/utilizadoresRoutes');
const hierarquia           = require('./routes/hierarquiaRoutes');
const badgesRoutes         = require('./routes/badgesRoutes');
const candidaturasRoutes   = require('./routes/candidaturasRoutes');
const badgeAtribuidoRoutes = require('./routes/badgeAtribuidoRoutes');
const publicRoutes         = require('./routes/publicRoutes');
const notificacoesRoutes   = require('./routes/notificacoesRoutes');
const conquistasRoutes     = require('./routes/conquistasRoutes');
const avisosRoutes         = require('./routes/avisosRoutes');
const slaRoutes            = require('./routes/slaRoutes');
const preferenciasRoutes   = require('./routes/preferenciasRoutes');
const configNotificacaoRoutes = require('./routes/configNotificacaoRoutes');
const lembretesRoutes      = require('./routes/lembretesRoutes');
const timelineRoutes       = require('./routes/timelineRoutes');
const rgpdRoutes           = require('./routes/rgpdRoutes');
const eventosRoutes        = require('./routes/eventosRoutes');
const estatisticasRoutes   = require('./routes/estatisticasRoutes');
const ficheirosRoutes      = require('./routes/ficheirosRoutes');
const totpRoutes           = require('./routes/totpRoutes');

const app  = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use((req, res, next) => {
  const deveForcarHttps = process.env.NODE_ENV === 'production' && process.env.DISABLE_HTTPS_REDIRECT !== 'true';
  const protocolo = req.headers['x-forwarded-proto'];

  if (deveForcarHttps && protocolo && protocolo !== 'https') {
    return res.redirect(308, `https://${req.headers.host}${req.originalUrl}`);
  }

  return next();
});

// Origens permitidas para CORS — FRONTEND_URL aceita várias separadas por vírgula
// (ex.: web de produção + web mobile + localhost). Apps móveis nativas não enviam
// cabeçalho Origin, por isso são permitidas (origin undefined).
const origensPermitidas = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

function obterOrigemAtual(req) {
  const protocolo = String(req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return host ? `${protocolo}://${host}`.replace(/\/+$/, '') : '';
}

// Em desenvolvimento, qualquer localhost é permitido (o Vite pode usar 5173/5174/...)
const ehLocalhostDev = (origin) =>
  process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

app.use(cors((req, callback) => {
  const origin = String(req.headers.origin || '').replace(/\/+$/, '');
  if (!origin) return callback(null, { origin: false, credentials: true });

  const origemAtual = obterOrigemAtual(req);
  const permitido = origensPermitidas.includes(origin) || origin === origemAtual || ehLocalhostDev(origin);

  if (!permitido) return callback(new Error('Origem não permitida pelo CORS.'));
  return callback(null, { origin: true, credentials: true });
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// servir ficheiros de uploads
const pastaUploads = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
app.use(`/${process.env.UPLOAD_DIR || 'uploads'}`, express.static(pastaUploads));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// rotas
app.use('/api/auth',             authRoutes);
app.use('/api/utilizadores',     utilizadoresRoutes);
app.use('/api/learning-paths',   hierarquia.learningPaths);
app.use('/api/service-lines',    hierarquia.serviceLines);
app.use('/api/areas',            hierarquia.areas);
app.use('/api/niveis',           hierarquia.niveis);
app.use('/api/requisitos',       hierarquia.requisitos);
app.use('/api/badges',           badgesRoutes);
app.use('/api/candidaturas',     candidaturasRoutes);
app.use('/api/badges-atribuidos', badgeAtribuidoRoutes);
app.use('/api/badge-atribuido',  badgeAtribuidoRoutes); // alias (frontend usa singular)
app.use('/api/notificacoes',     notificacoesRoutes);
app.use('/api/conquistas',       conquistasRoutes);
app.use('/api/avisos',           avisosRoutes);
app.use('/api/sla',              slaRoutes);
app.use('/api/preferencias',     preferenciasRoutes);
app.use('/api/config-notificacao', configNotificacaoRoutes);
app.use('/api/lembretes',        lembretesRoutes);
app.use('/api/timeline',         timelineRoutes);
app.use('/api/rgpd',             rgpdRoutes);
app.use('/api/eventos',          eventosRoutes);
app.use('/api/estatisticas',     estatisticasRoutes);
app.use('/api/ficheiros',        ficheirosRoutes);
app.use('/api/totp',            totpRoutes);

// rotas públicas (sem auth) — acessíveis via /api/publico (frontend) e /publico (legado)
app.use('/api/publico', publicRoutes);
app.use('/publico', publicRoutes);

// Servir o frontend (SPA) quando o build existe (web/dist) — modo "tudo num serviço".
// Em desenvolvimento a web é servida pelo Vite (5173), por isso este bloco fica inativo.
const webDist = path.join(__dirname, '..', '..', 'web', 'dist');
const uploadPath = `/${process.env.UPLOAD_DIR || 'uploads'}`;
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  // Fallback SPA (Express 5: usar middleware em vez de app.get('*')).
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/publico') ||
      req.path.startsWith('/health') ||
      req.path.startsWith(uploadPath)
    ) {
      return next();
    }
    res.sendFile(path.join(webDist, 'index.html'));
  });
}

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

app.use(tratadorErros);

async function arrancar() {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`🚀 API a correr em http://localhost:${PORT}`);
    iniciarJobSLA();
  });
}

arrancar();
