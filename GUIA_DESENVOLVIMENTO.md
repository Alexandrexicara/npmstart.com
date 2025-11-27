# Guia de Desenvolvimento - npm-start.com

## Problema: Mudanças não aparecem no site

Quando você faz alterações no site e elas não aparecem, isso geralmente é causado por caching. Aqui estão as soluções:

## 1. Limpar Cache do Navegador

### Método Rápido:
- Pressione **Ctrl + F5** (Windows/Linux) ou **Cmd + Shift + R** (Mac) para recarregar a página ignorando o cache

### Método Manual:
1. Abra o DevTools do navegador (F12)
2. Vá para a aba "Network" (Rede)
3. Marque a opção "Disable cache" (Desativar cache)
4. Recarregue a página (F5)

## 2. Limpar Cache do Service Worker

1. Abra o DevTools do navegador (F12)
2. Vá para a aba "Application" (Aplicativo)
3. Na seção "Service Workers":
   - Clique em "Unregister" (Cancelar registro)
4. Na seção "Clear storage" (Limpar armazenamento):
   - Clique em "Clear site data" (Limpar dados do site)

## 3. Reiniciar o Servidor Node.js

### Se estiver usando o script normal:
```bash
# Pare o servidor (Ctrl + C)
# Inicie novamente:
npm start
```

### Para desenvolvimento com reinício automático:
```bash
# Instale o nodemon globalmente (se não tiver):
npm install -g nodemon

# Execute em modo de desenvolvimento:
npm run dev
```

### Usando nosso script personalizado:
```bash
# Reinicia o servidor automaticamente:
npm run restart
```

## 4. Verificação de Arquivos

Certifique-se de que você está editando os arquivos corretos:
- Arquivos HTML: `public/*.html`
- Arquivos JavaScript do frontend: `public/*.js`
- Arquivos JavaScript do backend: `*.js` (na raiz)

## 5. Dicas Adicionais

1. **Sempre reinicie o servidor após mudanças no backend**
2. **Use o modo de desenvolvimento para evitar caching excessivo**
3. **Verifique o console do navegador (F12) para erros**
4. **Confirme que está acessando a porta correta (3003 por padrão)**

## Ambientes

- **Desenvolvimento**: http://localhost:3003
- **Produção**: Sua URL de produção

## Scripts Úteis

```bash
# Iniciar servidor em produção
npm start

# Iniciar servidor em desenvolvimento (com reinício automático)
npm run dev

# Reiniciar servidor manualmente
npm run restart
```