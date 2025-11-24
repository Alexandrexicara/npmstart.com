// Script para testar o upload de múltiplas screenshots
const fs = require('fs');
const path = require('path');

async function testScreenshotsUpload() {
  console.log('=== Teste de Upload de Screenshots ===');
  
  try {
    // Verificar se o diretório de uploads existe
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      console.log('Diretório de uploads não encontrado');
      return;
    }
    
    // Listar conteúdo do diretório de uploads
    const files = fs.readdirSync(uploadsDir);
    console.log('Arquivos no diretório de uploads:');
    files.forEach(file => {
      console.log(`  - ${file}`);
    });
    
    // Verificar se há diretórios de screenshots
    const screenshotDirs = files.filter(file => 
      fs.statSync(path.join(uploadsDir, file)).isDirectory() && 
      file.includes('screenshots')
    );
    
    console.log('\nDiretórios de screenshots encontrados:');
    screenshotDirs.forEach(dir => {
      console.log(`  - ${dir}`);
      
      // Listar conteúdo do diretório de screenshots
      const dirFiles = fs.readdirSync(path.join(uploadsDir, dir));
      console.log(`    Conteúdo:`);
      dirFiles.forEach(file => {
        console.log(`      - ${file}`);
      });
    });
    
    console.log('\n✅ Teste concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testScreenshotsUpload();