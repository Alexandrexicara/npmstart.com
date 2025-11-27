# Template PWA npm-start

Este é um template básico de Progressive Web App (PWA) integrado com a plataforma npm-start.

## Funcionalidades

- Service Worker para funcionamento offline
- Manifesto PWA para instalação em dispositivos
- Ícones para dispositivos móveis
- Tema colorido personalizado
- Integração com sistema de anúncios npm-start
- Rastreamento de receita

## Estrutura de Arquivos

```
├── public/
│   ├── index.html
│   ├── icons/
│   │   ├── icon-192x192.png
│   │   └── icon-512x512.png
├── manifest.json
├── sw.js
├── server.js
├── AdManager.js
├── ProfitTracker.js
└── package.json
```

## Como Usar

1. Clone ou baixe este pacote
2. Instale as dependências:
   ```
   npm install
   ```
3. Inicie o servidor:
   ```
   npm start
   ```
4. Acesse `http://localhost:3000` no seu navegador

## Personalização

1. Edite `public/index.html` para modificar a interface do seu app
2. Personalize `manifest.json` com os dados do seu app
3. Substitua os ícones em `public/icons/` pelos seus próprios ícones
4. Adicione suas funcionalidades ao app

## Integração com npm-start

Este template já vem com os scripts de integração:

- `AdManager.js` - Para exibição de anúncios
- `ProfitTracker.js` - Para rastreamento de receita

## Suporte

Para suporte, entre em contato com nossa equipe através do sistema de mensagens da plataforma npm-start.