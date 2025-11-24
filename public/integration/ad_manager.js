/**
 * AdManager.js - Gerenciador de Anúncios para Aplicações Web/Híbridas
 * 
 * Este módulo gerencia a exibição dos links de anúncios fornecidos,
 * garantindo rotação e controle de frequência para uma melhor experiência do usuário.
 */

const AdManager = (function() {
    // Links de anúncios fornecidos pelo usuário
    const AD_LINKS = [
        "https://otieu.com/4/9241921",
        "https://otieu.com/4/9241941",
        "https://otieu.com/4/9241934"
    ];

    // Chaves para armazenamento local
    const LAST_AD_INDEX_KEY = 'ad_manager_last_index';
    const LAST_DISPLAY_TIME_KEY = 'ad_manager_last_time';

    // Frequência mínima entre exibições (em milissegundos)
    // 60 segundos (60 * 1000) para evitar spam. Pode ser ajustado.
    const COOLDOWN_MS = 60000; 

    /**
     * Obtém o próximo link de anúncio na rotação (Round-Robin).
     * @returns {string} O próximo URL de anúncio.
     */
    function getNextAdLink() {
        let lastIndex = parseInt(localStorage.getItem(LAST_AD_INDEX_KEY) || '-1');
        
        // Calcula o próximo índice
        let nextIndex = (lastIndex + 1) % AD_LINKS.length;
        
        // Salva o novo índice
        localStorage.setItem(LAST_AD_INDEX_KEY, nextIndex.toString());
        
        return AD_LINKS[nextIndex];
    }

    /**
     * Verifica se o cooldown de exibição de anúncio expirou.
     * @returns {boolean} True se o anúncio pode ser exibido, False caso contrário.
     */
    function isCooldownExpired() {
        const lastTime = parseInt(localStorage.getItem(LAST_DISPLAY_TIME_KEY) || '0');
        const currentTime = Date.now();
        return (currentTime - lastTime) > COOLDOWN_MS;
    }

    /**
     * Exibe o anúncio abrindo o link em uma nova aba/janela.
     * Controla a frequência de exibição.
     * @returns {boolean} True se o anúncio foi exibido, False caso contrário.
     */
    function displayAd() {
        if (!isCooldownExpired()) {
            console.log("AdManager: Cooldown ativo. Anúncio não exibido.");
            return false;
        }

        const adLink = getNextAdLink();
        
        // Abre o link em uma nova aba/janela
        window.open(adLink, '_blank');
        
        // Atualiza o timestamp da última exibição
        localStorage.setItem(LAST_DISPLAY_TIME_KEY, Date.now().toString());
        
        console.log("AdManager: Anúncio exibido: " + adLink);
        return true;
    }

    // Retorna a interface pública do módulo
    return {
        displayAd: displayAd,
        // Expõe os links para inspeção, se necessário
        AD_LINKS: AD_LINKS
    };
})();

// Exemplo de uso para abertura do app (executa automaticamente)
// AdManager.displayAd(); 

// Exemplo de uso para mudança de aba/view (deve ser chamado pelo desenvolvedor)
// function onTabChange() {
//     AdManager.displayAd();
// }
