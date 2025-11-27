const http = require('http');

// Testar acesso à página inicial na porta 3003
const options = {
  hostname: 'localhost',
  port: 3003,
  path: '/',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Requisição concluída');
    // Verificar se os botões estão presentes no HTML
    if (data.includes('integration-banner') && data.includes('pacote_pwa.zip')) {
      console.log('✓ Botões de integração encontrados no HTML');
    } else {
      console.log('✗ Botões de integração não encontrados');
    }
    
    if (data.includes('ad-banner')) {
      console.log('✓ Banner de anúncios encontrado no HTML');
    } else {
      console.log('✗ Banner de anúncios não encontrado');
    }
  });
});

req.on('error', (e) => {
  console.error(`Erro na requisição: ${e.message}`);
});

req.end();