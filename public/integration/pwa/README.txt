PACOTE PWA - npm-start.com
==========================

Este pacote contém os arquivos necessários para transformar seu aplicativo web em um Progressive Web App (PWA).

CONTEÚDO DO PACOTE:
------------------
1. manifest.json - Arquivo de manifesto do PWA (configurado para usar ícone PNG)
2. sw.js - Service Worker para funcionalidades offline
3. icon-192x192.png - Ícone do aplicativo em formato PNG
4. README.txt - Este arquivo

INSTRUÇÕES DE INSTALAÇÃO:
------------------------
1. Copie todos os arquivos para a raiz do seu projeto web
2. Certifique-se de que a pasta 'icons' esteja no mesmo diretório que o manifest.json
3. Adicione as seguintes meta tags ao <head> do seu HTML:

   <link rel="manifest" href="/manifest.json">
   <link rel="icon" href="/icons/icon-192x192.png" type="image/png">
   <meta name="theme-color" content="#FF8C00">
   <meta name="description" content="Descrição do seu app">

4. Adicione o seguinte script antes do fechamento da tag </body>:

   <script>
   // Registrar o Service Worker para PWA
   if ('serviceWorker' in navigator) {
     window.addEventListener('load', () => {
       navigator.serviceWorker.register('/sw.js')
         .then((registration) => {
           console.log('Service Worker registrado com sucesso:', registration.scope);
         })
         .catch((error) => {
           console.log('Falha ao registrar o Service Worker:', error);
         });
     });
   }
   </script>

PERSONALIZAÇÃO:
---------------
- Edite o manifest.json para configurar o nome, descrição e cores do seu app
- Substitua o ícone PNG por um que represente seu aplicativo
- O Service Worker pode ser personalizado para cache de recursos específicos

SUPORTE:
--------
Para dúvidas sobre a implementação, entre em contato através do sistema de mensagens da plataforma.