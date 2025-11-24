/**
 * ProfitTracker.js - Rastreamento de Lucros e Downloads
 * 
 * Este script rastreia eventos de anúncios e downloads
 * para calcular a participação nos lucros (30% para admin e 70% para desenvolvedor).
 */

const ProfitTracker = (function() {
    // Chaves para armazenar os contadores
    const DOWNLOAD_COUNT_KEY = 'profit_tracker_download_count';
    const REVENUE_KEY = 'profit_tracker_revenue';
    const DEVELOPER_REVENUE_KEY = 'profit_tracker_developer_revenue';
    const ADMIN_REVENUE_KEY = 'profit_tracker_admin_revenue';

    /**
     * Registra um download bem-sucedido e calcula a receita.
     * @param {string} appId - ID do aplicativo que foi baixado.
     * @param {number} revenueAmount - Valor da receita gerada por este download (opcional, padrão: R$0.50).
     */
    function trackDownload(appId, revenueAmount = 0.50) {
        // Incrementa o contador de downloads
        let downloadCount = parseInt(localStorage.getItem(DOWNLOAD_COUNT_KEY) || '0');
        downloadCount++;
        localStorage.setItem(DOWNLOAD_COUNT_KEY, downloadCount.toString());

        // Calcula a receita
        let totalRevenue = parseFloat(localStorage.getItem(REVENUE_KEY) || '0');
        totalRevenue += revenueAmount;
        localStorage.setItem(REVENUE_KEY, totalRevenue.toFixed(2));

        // Calcula a participação (30% para admin, 70% para desenvolvedor)
        let adminShare = totalRevenue * 0.30;
        let developerShare = totalRevenue * 0.70;
        
        localStorage.setItem(ADMIN_REVENUE_KEY, adminShare.toFixed(2));
        localStorage.setItem(DEVELOPER_REVENUE_KEY, developerShare.toFixed(2));

        console.log(`[ProfitTracker] Download rastreado para o App ID: ${appId}`);
        console.log(`[ProfitTracker] Receita gerada: R$ ${revenueAmount.toFixed(2)}`);
        console.log(`[ProfitTracker] Receita total acumulada: R$ ${totalRevenue.toFixed(2)}`);
        console.log(`[ProfitTracker] Participação do Administrador (30%): R$ ${adminShare.toFixed(2)}`);
        console.log(`[ProfitTracker] Participação do Desenvolvedor (70%): R$ ${developerShare.toFixed(2)}`);
        console.log(`[ProfitTracker] Total de downloads: ${downloadCount}`);
    }

    /**
     * Registra a exibição de um anúncio.
     * @param {string} adLink - O link do anúncio que foi exibido.
     * @param {number} revenueAmount - Valor da receita gerada por esta exibição (opcional, padrão: R$0.10).
     */
    function trackAdDisplay(adLink, revenueAmount = 0.10) {
        // Adiciona receita pela exibição do anúncio
        let totalRevenue = parseFloat(localStorage.getItem(REVENUE_KEY) || '0');
        totalRevenue += revenueAmount;
        localStorage.setItem(REVENUE_KEY, totalRevenue.toFixed(2));

        // Calcula a participação (30% para admin, 70% para desenvolvedor)
        let adminShare = totalRevenue * 0.30;
        let developerShare = totalRevenue * 0.70;
        
        localStorage.setItem(ADMIN_REVENUE_KEY, adminShare.toFixed(2));
        localStorage.setItem(DEVELOPER_REVENUE_KEY, developerShare.toFixed(2));

        console.log(`[ProfitTracker] Exibição de anúncio rastreada: ${adLink}`);
        console.log(`[ProfitTracker] Receita gerada: R$ ${revenueAmount.toFixed(2)}`);
        console.log(`[ProfitTracker] Receita total acumulada: R$ ${totalRevenue.toFixed(2)}`);
        console.log(`[ProfitTracker] Participação do Administrador (30%): R$ ${adminShare.toFixed(2)}`);
        console.log(`[ProfitTracker] Participação do Desenvolvedor (70%): R$ ${developerShare.toFixed(2)}`);
    }

    /**
     * Exibe o status atual do rastreamento e a divisão de receita.
     */
    function displayProfitStatus() {
        const downloads = parseInt(localStorage.getItem(DOWNLOAD_COUNT_KEY) || '0');
        const totalRevenue = parseFloat(localStorage.getItem(REVENUE_KEY) || '0');
        const adminShare = parseFloat(localStorage.getItem(ADMIN_REVENUE_KEY) || '0');
        const developerShare = parseFloat(localStorage.getItem(DEVELOPER_REVENUE_KEY) || '0');

        console.log("========================================");
        console.log("[ProfitTracker] Status de Participação nos Lucros");
        console.log(`Downloads Rastreados: ${downloads}`);
        console.log(`Receita Total Acumulada: R$ ${totalRevenue.toFixed(2)}`);
        console.log(`Participação do Administrador (30%): R$ ${adminShare.toFixed(2)}`);
        console.log(`Participação do Desenvolvedor (70%): R$ ${developerShare.toFixed(2)}`);
        console.log("========================================");
    }

    /**
     * Obtém os dados de receita atuais.
     * @returns {Object} Objeto com os dados de receita.
     */
    function getRevenueData() {
        return {
            downloads: parseInt(localStorage.getItem(DOWNLOAD_COUNT_KEY) || '0'),
            totalRevenue: parseFloat(localStorage.getItem(REVENUE_KEY) || '0'),
            adminShare: parseFloat(localStorage.getItem(ADMIN_REVENUE_KEY) || '0'),
            developerShare: parseFloat(localStorage.getItem(DEVELOPER_REVENUE_KEY) || '0')
        };
    }

    /**
     * Reseta todos os dados de rastreamento.
     */
    function resetTracking() {
        localStorage.removeItem(DOWNLOAD_COUNT_KEY);
        localStorage.removeItem(REVENUE_KEY);
        localStorage.removeItem(DEVELOPER_REVENUE_KEY);
        localStorage.removeItem(ADMIN_REVENUE_KEY);
        console.log("[ProfitTracker] Todos os dados de rastreamento foram resetados.");
    }

    // Expõe as funções públicas
    return {
        trackDownload: trackDownload,
        trackAdDisplay: trackAdDisplay,
        displayProfitStatus: displayProfitStatus,
        getRevenueData: getRevenueData,
        resetTracking: resetTracking
    };
})();