// Script para testar o upload de múltiplas screenshots
const fs = require('fs');
const path = require('path');

async function testMultipleScreenshots() {
  console.log('=== Teste de Múltiplas Screenshots ===');
  
  try {
    // Simular o processamento de múltiplas screenshots
    const testScreenshots = [
      { name: 'screenshot1.png', type: 'image/png' },
      { name: 'screenshot2.png', type: 'image/png' },
      { name: 'screenshot3.png', type: 'image/png' },
      { name: 'screenshot4.png', type: 'image/png' }
    ];
    
    console.log('Screenshots simuladas:');
    testScreenshots.forEach((screenshot, index) => {
      console.log(`  ${index + 1}. ${screenshot.name}`);
    });
    
    // Verificar se o diretório de uploads existe
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      console.log('Diretório de uploads não encontrado, criando...');
      fs.mkdirSync(uploadsDir);
    }
    
    // Criar um diretório de teste para screenshots
    const testAppId = 'test_app_123';
    const appScreenshotsDir = path.join(uploadsDir, `app_${testAppId}_screenshots`);
    
    if (!fs.existsSync(appScreenshotsDir)) {
      console.log(`Criando diretório de screenshots: ${appScreenshotsDir}`);
      fs.mkdirSync(appScreenshotsDir);
    }
    
    // Simular o processo de salvar screenshots
    const screenshotPaths = [];
    for (let i = 0; i < testScreenshots.length; i++) {
      const screenshot = testScreenshots[i];
      const screenshotFilename = `screenshot_${i}${path.extname(screenshot.name)}`;
      const screenshotPath = path.join(appScreenshotsDir, screenshotFilename);
      
      // Criar um arquivo de teste
      fs.writeFileSync(screenshotPath, `Conteúdo da ${screenshot.name}`);
      screenshotPaths.push(`app_${testAppId}_screenshots/${screenshotFilename}`);
      
      console.log(`✓ Screenshot ${i + 1} salva: ${screenshotPath}`);
    }
    
    console.log('\nScreenshots salvas com sucesso:');
    screenshotPaths.forEach((path, index) => {
      console.log(`  ${index + 1}. ${path}`);
    });
    
    console.log('\n✅ Teste concluído com sucesso!');
    console.log(`Total de screenshots processadas: ${screenshotPaths.length}`);
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testMultipleScreenshots();