require('dotenv').config();

const path = require('path');
const express = require('express');
const cors    = require('cors');
const { testConnection } = require('./db/connection');
const { tratadorErros } = require('./middleware/erros');

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
const lembretesRoutes      = require('./routes/lembretesRoutes');
const timelineRoutes       = require('./routes/timelineRoutes');
const rgpdRoutes           = require('./routes/rgpdRoutes');
const eventosRoutes        = require('./routes/eventosRoutes');
const estatisticasRoutes   = require('./routes/estatisticasRoutes');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
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
app.use('/api/notificacoes',     notificacoesRoutes);
app.use('/api/conquistas',       conquistasRoutes);
app.use('/api/avisos',           avisosRoutes);
app.use('/api/sla',              slaRoutes);
app.use('/api/preferencias',     preferenciasRoutes);
app.use('/api/lembretes',        lembretesRoutes);
app.use('/api/timeline',         timelineRoutes);
app.use('/api/rgpd',             rgpdRoutes);
app.use('/api/eventos',          eventosRoutes);
app.use('/api/estatisticas',     estatisticasRoutes);

// rotas públicas (sem auth)
app.use('/publico', publicRoutes);

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

app.use(tratadorErros);

async function arrancar() {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`🚀 API a correr em http://localhost:${PORT}`);
  });
}

arrancar();
