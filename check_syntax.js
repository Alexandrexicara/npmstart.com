const fs = require('fs');
const vm = require('vm');

try {
  const code = fs.readFileSync('E:\\Projeto_Unificado\\meu_site_atualizado\\server.js', 'utf8');
  // Try to compile the code
  new vm.Script(code);
  console.log('Syntax OK');
} catch (error) {
  console.log('Syntax Error:');
  console.log(error.message);
  console.log('Stack:');
  console.log(error.stack);
}