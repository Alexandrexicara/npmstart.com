#!/usr/bin/env node

// Script para reiniciar o servidor de desenvolvimento
// Este script irá parar qualquer instância em execução do servidor e iniciar uma nova

const { spawn, execSync } = require('child_process');
const path = require('path');

console.log('Reiniciando o servidor...');

try {
  // Tenta matar processos node em execução na porta 3003
  if (process.platform === 'win32') {
    // No Windows, tentamos encontrar e matar o processo específico
    try {
      execSync('taskkill /F /IM node.exe /FI "WINDOWTITLE eq *server.js*" 2>nul', { stdio: 'ignore' });
    } catch (e) {
      // Se não encontrar processo, continua
    }
  } else {
    execSync('pkill -f "node.*server.js" || true', { stdio: 'ignore' });
  }
  console.log('Processos anteriores encerrados.');
} catch (error) {
  // Ignora erros caso não haja processos para matar
}

// Inicia o servidor
console.log('Iniciando novo servidor...');
const server = spawn('node', ['server.js'], { 
  cwd: process.cwd(),
  stdio: 'inherit' 
});

server.on('close', (code) => {
  console.log(`Servidor encerrado com código ${code}`);
});