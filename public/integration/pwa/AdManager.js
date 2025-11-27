/**
 * AdManager.js - Sistema de gerenciamento de anúncios para apps npm-start
 * 
 * Este script permite a exibição de anúncios em apps integrados com a plataforma npm-start.
 * Os anúncios são exibidos com um cooldown de 60 segundos para evitar excesso de interrupções.
 */

class AdManager {
  constructor() {
    this.lastAdTime = 0;
    this.cooldown = 60000; // 60 segundos em milissegundos
    this.adProvider = 'npm-start-ad-network';
  }

  /**
   * Exibe um anúncio se o cooldown permitir
   */
  displayAd() {
    const now = Date.now();
    
    // Verifica se o cooldown foi respeitado
    if (now - this.lastAdTime < this.cooldown) {
      console.log('Anúncio ignorado: Cooldown ainda ativo');
      return false;
    }
    
    // Simula a exibição de um anúncio
    this.showAdModal();
    this.lastAdTime = now;
    
    // Registra a exibição do anúncio no sistema de rastreamento
    if (typeof ProfitTracker !== 'undefined') {
      ProfitTracker.trackAdDisplay(0.05); // R$0.05 por exibição
    }
    
    return true;
  }

  /**
   * Mostra o modal de anúncio (simulação)
   */
  showAdModal() {
    console.log('Exibindo anúncio:', this.adProvider);
    
    // Em uma implementação real, isso seria substituído por um sistema
    // de anúncios real que poderia exibir banners, intersticiais, etc.
    alert('Anúncio - Esta é uma simulação. Em produção, aqui seria exibido um anúncio real.');
  }

  /**
   * Define um novo provedor de anúncios
   */
  setAdProvider(provider) {
    this.adProvider = provider;
  }
}

// Exporta o AdManager globalmente
window.AdManager = new AdManager();

console.log('AdManager.js carregado - Sistema de anúncios npm-start');