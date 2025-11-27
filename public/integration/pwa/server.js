/**
 * Servidor básico para PWA npm-start
 * 
 * Este é um servidor Express.js simples para servir seu PWA.
 * Ele serve arquivos estáticos e implementa rotas básicas.
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Rota para o service worker
app.get('/sw.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'sw.js'));
});

// Rota para o manifesto
app.get('/manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'manifest.json'));
});

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota curinga para suportar client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor PWA rodando na porta ${PORT}`);
  console.log(`Acesse em: http://localhost:${PORT}`);
});

module.exports = app;