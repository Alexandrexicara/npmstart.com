# npm-start.com - Loja de Apps

Este é um projeto completo de uma plataforma de loja de aplicativos com as seguintes funcionalidades:

- Loja de apps (upload, listagem, download)
- Autenticação de usuário com e-mail @npmstart.com
- Webmail simples (envio via SMTP e leitura via IMAP proxy)
- Templates de e-mail e integração com provedores transacionais (SendGrid, SMTP)
- Docker-compose template para executar um servidor de e-mail (Mailu) — exemplo apenas

## 🚀 Como executar o projeto

1. **Instalar dependências:**
   ```
   npm install
   ```

2. **Configurar variáveis de ambiente:**
   Edite o arquivo `.env` com as configurações apropriadas para o seu ambiente.

3. **Iniciar o servidor:**
   ```
   node server.js
   ```

4. **Acessar a aplicação:**
   Abra seu navegador e acesse `http://localhost:3000`

## 📁 Estrutura do projeto

- `server.js` - Arquivo principal do servidor
- `database.js` - Configuração e funções do banco de dados SQLite
- `public/` - Arquivos estáticos (HTML, CSS, JS)
- `data/` - Arquivos de dados (banco de dados SQLite, JSON)
- `uploads/` - Arquivos de apps enviados pelos usuários
- `utils/` - Funções utilitárias (mailer.js)

## 🔧 Funcionalidades

### Autenticação
- Registro de novos usuários
- Login de usuários existentes
- Proteção de rotas com JWT

### Apps
- Upload de novos apps
- Listagem de apps aprovados
- Download de apps
- Aprovação de apps (admin)

### E-mail
- Envio de e-mails de confirmação
- Webmail integrado (leitura via IMAP)
- Envio de e-mails personalizados

## 🛠️ Tecnologias utilizadas

- Node.js
- Express.js
- SQLite
- JWT para autenticação
- Nodemailer para envio de e-mails
- Multer para upload de arquivos
- BCrypt para hashing de senhas

## 📝 Observações

- O projeto utiliza SQLite como banco de dados, que é criado automaticamente na primeira execução
- As credenciais de e-mail devem ser configuradas no arquivo `.env`
- Para produção, recomenda-se usar um provedor de e-mail transacional como SendGrid