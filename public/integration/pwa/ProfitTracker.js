/**
 * ProfitTracker.js - Sistema de rastreamento de receita para apps npm-start
 * 
 * Este script permite o rastreamento de downloads e receita gerada por apps
 * integrados com a plataforma npm-start, calculando a participação do desenvolvedor.
 */

class ProfitTracker {
  constructor() {
    this.developerSharePercentage = 0.7; // 70% para o desenvolvedor
    this.platformSharePercentage = 0.3;  // 30% para a plataforma
    this.totalRevenue = 0;
    this.developerShare = 0;
    this.platformShare = 0;
    this.downloadCount = 0;
  }

  /**
   * Registra um download e calcula a receita gerada
   * @param {string} appId - ID do aplicativo
   * @param {number} price - Preço do aplicativo ou valor gerado por download gratuito
   */
  trackDownload(appId, price) {
    // Valida os parâmetros
    if (!appId || typeof price !== 'number' || price < 0) {
      console.error('ProfitTracker: Parâmetros inválidos para trackDownload');
      return false;
    }

    // Atualiza as estatísticas
    this.totalRevenue += price;
    this.downloadCount++;
    
    // Calcula as participações
    const developerAmount = price * this.developerSharePercentage;
    const platformAmount = price * this.platformSharePercentage;
    
    this.developerShare += developerAmount;
    this.platformShare += platformAmount;
    
    // Log para depuração
    console.log(`ProfitTracker: Download registrado para app ${appId}`);
    console.log(`  Preço: R$${price.toFixed(2)}`);
    console.log(`  Participação do desenvolvedor: R$${developerAmount.toFixed(2)}`);
    console.log(`  Participação da plataforma: R$${platformAmount.toFixed(2)}`);
    
    // Em uma implementação real, isso seria enviado para um servidor
    this.sendToServer({
      eventType: 'download',
      appId: appId,
      price: price,
      developerAmount: developerAmount,
      platformAmount: platformAmount,
      timestamp: new Date().toISOString()
    });
    
    return true;
  }

  /**
   * Registra a exibição de um anúncio
   * @param {number} adValue - Valor gerado pela exibição do anúncio
   */
  trackAdDisplay(adValue) {
    // Valida os parâmetros
    if (typeof adValue !== 'number' || adValue < 0) {
      console.error('ProfitTracker: Valor inválido para trackAdDisplay');
      return false;
    }

    // Atualiza as estatísticas
    this.totalRevenue += adValue;
    
    // Calcula as participações
    const developerAmount = adValue * this.developerSharePercentage;
    const platformAmount = adValue * this.platformSharePercentage;
    
    this.developerShare += developerAmount;
    this.platformShare += platformAmount;
    
    // Log para depuração
    console.log(`ProfitTracker: Exibição de anúncio registrada`);
    console.log(`  Valor gerado: R$${adValue.toFixed(2)}`);
    console.log(`  Participação do desenvolvedor: R$${developerAmount.toFixed(2)}`);
    console.log(`  Participação da plataforma: R$${platformAmount.toFixed(2)}`);
    
    // Em uma implementação real, isso seria enviado para um servidor
    this.sendToServer({
      eventType: 'adDisplay',
      adValue: adValue,
      developerAmount: developerAmount,
      platformAmount: platformAmount,
      timestamp: new Date().toISOString()
    });
    
    return true;
  }

  /**
   * Retorna os dados de receita atuais
   * @returns {Object} Objeto com os dados de receita
   */
  getRevenueData() {
    return {
      totalRevenue: this.totalRevenue,
      developerShare: this.developerShare,
      platformShare: this.platformShare,
      downloadCount: this.downloadCount
    };
  }

  /**
   * Exibe o status de lucro no console
   */
  displayProfitStatus() {
    const data = this.getRevenueData();
    
    console.log('=== Status de Lucro ===');
    console.log(`Receita Total: R$${data.totalRevenue.toFixed(2)}`);
    console.log(`Sua Participação (70%): R$${data.developerShare.toFixed(2)}`);
    console.log(`Participação da Plataforma (30%): R$${data.platformShare.toFixed(2)}`);
    console.log(`Total de Downloads: ${data.downloadCount}`);
    console.log('=======================');
  }

  /**
   * Envia dados para o servidor (implementação simulada)
   * @param {Object} data - Dados a serem enviados
   */
  sendToServer(data) {
    // Em uma implementação real, isso faria uma requisição HTTP para o servidor
    console.log('ProfitTracker: Dados enviados para o servidor:', data);
    
    // Simulação de envio para servidor
    // fetch('/api/profit-tracking', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify(data)
    // });
  }
}

// Exporta o ProfitTracker globalmente
window.ProfitTracker = new ProfitTracker();

console.log('ProfitTracker.js carregado - Sistema de rastreamento de receita npm-start');