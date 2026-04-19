require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const { testConnection } = require('./db/connection');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

async function arrancar() {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`🚀 API a correr em http://localhost:${PORT}`);
  });
}

arrancar();