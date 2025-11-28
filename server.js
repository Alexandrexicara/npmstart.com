const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3003;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// DB
const { initDb, dbAll, dbGet, dbRun } = require('./database');
initDb();

// dirs
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({ storage });

// mail
const { sendMail, templateRegistration, templateAppApproved, templatePixPayment } = require('./utils/mailer');


// =======================
// AUTH
// =======================
app.post('/api/register', async (req, res) => {
  const { name, emailLocal, password } = req.body;
  if (!name || !emailLocal || !password) return res.status(400).json({ error: 'Dados incompletos' });

  const email = `${emailLocal}@npmstart.com`;
  const exists = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
  if (exists) return res.status(409).json({ error: 'E-mail já existe' });

  const hash = await bcrypt.hash(password, 10);
  const id = uuidv4();
  const createdAt = new Date().toISOString();

  await dbRun(
    'INSERT INTO users (id, name, email, passwordHash, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
    [id, name, email, hash, 'user', createdAt]
  );

  try {
    const token = uuidv4();
    const link = `${process.env.SITE_URL || `http://localhost:${PORT}`}/confirm?token=${token}&email=${encodeURIComponent(email)}`;
    const mail = templateRegistration(name, link);
    await sendMail({ to: email, subject: mail.subject, html: mail.html });
  } catch (e) {}

  res.json({ ok: true, user: { id, name, email } });
});


app.post('/api/login', async (req, res) => {
  const { emailLocal, password } = req.body;
  const email = emailLocal.includes('@') ? emailLocal : `${emailLocal}@npmstart.com`;

  const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(401).json({ error: 'Credenciais inválidas' });

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ ok: true, token, user });
});


// auth middleware
function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: 'Sem token' });

  const parts = h.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'Token inválido' });

  try {
    req.user = jwt.verify(parts[1], JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

function adminMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: 'Sem token' });

  try {
    const decoded = jwt.verify(h.split(' ')[1], JWT_SECRET);
    if (decoded.role === 'admin' || decoded.email.includes('admin')) {
      req.user = decoded;
      return next();
    }
    return res.status(403).json({ error: 'Acesso negado' });
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}


// =======================
// APPS LIST
// =======================
app.get('/api/apps', async (req, res) => {
  const apps = await dbAll('SELECT * FROM apps WHERE approved = 1 ORDER BY createdAt DESC');
  res.json(apps);
});

app.get('/api/apps/pending', adminMiddleware, async (req, res) => {
  const apps = await dbAll('SELECT * FROM apps WHERE approved = 0 ORDER BY createdAt DESC');
  res.json(apps);
});

app.get('/api/users', adminMiddleware, async (req, res) => {
  const users = await dbAll('SELECT id, name, email, role, createdAt FROM users ORDER BY createdAt DESC');
  res.json(users);
});


// =======================
// UPLOAD APP
// =======================
app.post('/api/upload', authMiddleware, upload.any(), async (req, res) => {
  try {
    const files = { screenshots: [], icon: null, appFile: null };

    (req.files || []).forEach(f => {
      if (f.fieldname === 'screenshots') files.screenshots.push(f);
      else if (f.fieldname === 'icon') files.icon = f;
      else if (f.fieldname === 'file') files.appFile = f;
    });

    if (!files.appFile) return res.status(400).json({ error: 'Arquivo do app não enviado' });
    if (files.screenshots.length < 3)
      return res.status(400).json({ error: 'Envie pelo menos 3 screenshots' });

    const { title = 'Sem título', description = '', price = '0', platform = 'android', website = '' } = req.body;
    const appId = uuidv4();
    const createdAt = new Date().toISOString();

    let iconFilename = null;
    if (files.icon) {
      iconFilename = `${appId}_icon${path.extname(files.icon.originalname)}`;
      fs.renameSync(files.icon.path, path.join(UPLOAD_DIR, iconFilename));
    }

    const appDir = path.join(UPLOAD_DIR, `app_${appId}_screenshots`);
    fs.mkdirSync(appDir);

    const screenshotPaths = [];
    files.screenshots.forEach((s, i) => {
      const container = path.join(appDir, `screenshot_${i}`);
      fs.mkdirSync(container);

      const fname = `screenshot_${i}${path.extname(s.originalname)}`;
      const finalPath = path.join(container, fname);

      fs.renameSync(s.path, finalPath);
      screenshotPaths.push(`app_${appId}_screenshots/screenshot_${i}/${fname}`);
    });

    const appFilename = `${appId}_${files.appFile.originalname}`;
    fs.renameSync(files.appFile.path, path.join(UPLOAD_DIR, appFilename));

    await dbRun(
      'INSERT INTO apps (id, title, description, price, platform, filename, originalName, size, ownerEmail, createdAt, approved, screenshots, icon, website) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        appId,
        title,
        description,
        Number(price),
        platform,
        appFilename,
        files.appFile.originalname,
        files.appFile.size,
        req.user.email,
        createdAt,
        0,
        JSON.stringify(screenshotPaths),
        iconFilename,
        website
      ]
    );

    res.json({ ok: true, id: appId });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao salvar app: ' + e.message });
  }
});


// =======================
// APPROVE APP
// =======================
app.post('/api/admin/approve/:id', adminMiddleware, async (req, res) => {
  await dbRun('UPDATE apps SET approved = 1 WHERE id = ?', [req.params.id]);
  const appObj = await dbGet('SELECT * FROM apps WHERE id = ?', [req.params.id]);

  const owner = await dbGet('SELECT * FROM users WHERE email = ?', [appObj.ownerEmail]);
  if (owner) {
    try {
      const mail = templateAppApproved(appObj);
      await sendMail({ to: owner.email, subject: mail.subject, html: mail.html });
    } catch (e) {}
  }

  res.json({ ok: true });
});


// =======================
// DOWNLOAD
// =======================
// Handle downloads for both free and paid apps
app.get('/download/:filename', async (req, res) => {
  const { filename } = req.params;

  const file = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(file)) return res.status(404).send('Arquivo não encontrado');

  res.download(file);
});

// Handle downloads with token for paid apps (backward compatibility)
app.get('/download/:token/:filename', async (req, res) => {
  const { token, filename } = req.params;

  const file = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(file)) return res.status(404).send('Arquivo não encontrado');

  res.download(file);
});

// Handle downloads for free apps (backward compatibility)
app.get('/download/free/:filename', async (req, res) => {
  const { filename } = req.params;

  const file = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(file)) return res.status(404).send('Arquivo não encontrado');

  res.download(file);
});


// =======================
// PAYMENT ROUTES
// =======================
app.post('/api/pay/:appId', authMiddleware, async (req, res) => {
  try {
    const appObj = await dbGet('SELECT * FROM apps WHERE id = ?', [req.params.appId]);
    if (!appObj) return res.status(404).json({ error: 'App não encontrado' });
    
    // Verificar se o app é pago
    if (appObj.price <= 0) {
      return res.status(400).json({ error: 'Este app é gratuito e não requer pagamento' });
    }
    
    // Validar o preço do app
    if (isNaN(appObj.price) || appObj.price <= 0 || appObj.price > 10000) {
      return res.status(400).json({ error: 'Preço do app inválido' });
    }
    
    // Validar o título do app
    if (!appObj.title || appObj.title.trim().length === 0) {
      return res.status(400).json({ error: 'Título do app é obrigatório' });
    }
    
    if (appObj.title.length > 100) {
      return res.status(400).json({ error: 'Título do app muito longo (máximo 100 caracteres)' });
    }
    
    // Verificar se o token do PagBank está configurado
    if (!process.env.PAGBANK_TOKEN) {
      return res.status(500).json({ error: 'Serviço de pagamento não configurado' });
    }
    
    // Validar e formatar os dados antes de enviar para o PagBank
    const amount = parseFloat(appObj.price.toFixed(2));
    const description = `Compra do app ${appObj.title}`.substring(0, 100); // Limitar a 100 caracteres
    
    // Definir o ambiente (sandbox ou produção)
    const pagbankBaseUrl = process.env.PAGBANK_ENV === 'sandbox' 
      ? 'https://sandbox.api.pagseguro.com' 
      : 'https://api.pagseguro.com';
    
    // Garantir que SITE_URL está definido corretamente
    const siteUrl = process.env.SITE_URL || `http://localhost:${PORT}`;
    
    // Validar formato das URLs
    try {
      new URL(siteUrl);
    } catch (urlError) {
      console.error('URL inválida:', urlError.message);
      return res.status(400).json({ error: 'URL de site inválida configurada' });
    }
    
    // Criar um checkout no PagBank usando a API REST diretamente
    // Ajustando o formato dos dados conforme a documentação do PagBank
    const checkoutData = {
      reference_id: `app_purchase_${appObj.id}_${Date.now()}`.substring(0, 50), // Limitar a 50 caracteres
      items: [
        {
          name: appObj.title.substring(0, 100),
          quantity: 1,
          unit_amount: Math.round(amount * 100) // Valor em centavos
        }
      ]
    };
    
    // Adicionar URLs de notificação e redirecionamento apenas se não estivermos em localhost
    // O PagBank não aceita URLs locais para esses campos
    if (!siteUrl.includes('localhost') && !siteUrl.includes('127.0.0.1')) {
      checkoutData.notification_urls = [
        `${siteUrl}/api/webhook/pagbank`
      ];
      checkoutData.redirect_url = `${siteUrl}/payment-return.html`;
    }
    
    console.log('Enviando dados para o PagBank (com URLs):', JSON.stringify(checkoutData, null, 2));
    console.log('URL base:', siteUrl);
    
    const pagbankResponse = await fetch(`${pagbankBaseUrl}/checkouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAGBANK_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(checkoutData)
    });
    
    const pagbankData = await pagbankResponse.json();
    
    console.log('Resposta do PagBank:', pagbankResponse.status, JSON.stringify(pagbankData, null, 2));
    
    if (!pagbankResponse.ok) {
      console.error('Erro na API do PagBank:', pagbankData);
      // Tratar erros específicos do PagBank
      if (pagbankData.error_messages) {
        const errorMessages = pagbankData.error_messages.map(e => `${e.error}: ${e.description} (parâmetro: ${e.parameter_name})`).join(', ');
        return res.status(400).json({ error: 'Dados de pagamento inválidos: ' + errorMessages });
      }
      throw new Error(`Erro no PagBank: ${pagbankData.message || JSON.stringify(pagbankData)}`);
    }
    
    // Verificar se a resposta do PagBank contém os dados necessários
    if (!pagbankData || !pagbankData.id) {
      console.error('Resposta inválida do PagBank:', pagbankData);
      throw new Error('Resposta inválida do PagBank');
    }
    
    // Obter a URL de pagamento do PagBank
    const paymentLink = pagbankData.links?.find(link => link.rel === 'PAY');
    if (!paymentLink || !paymentLink.href) {
      console.error('URL de pagamento não retornada pela API do PagBank:', pagbankData);
      throw new Error('URL de pagamento não disponível');
    }
    
    const paymentUrl = paymentLink.href;
    
    // Salvar o checkout no banco de dados (para rastreamento)
    await dbRun(`INSERT INTO checkouts (id, appId, userId, amount, status, createdAt) 
                 VALUES (?, ?, ?, ?, ?, ?)`, 
                 [pagbankData.id, appObj.id, req.user.id, appObj.price, 'pending', new Date().toISOString()]);
    
    res.json({ 
      ok: true, 
      message: 'Checkout criado com sucesso',
      checkoutId: pagbankData.id,
      paymentUrl: paymentUrl, // URL para redirecionar o usuário para o pagamento
      amount: appObj.price,
      appName: appObj.title
    });
  } catch(e) {
    console.error('Erro ao processar pagamento:', e);
    // Tratar erros de rede ou outros erros inesperados
    if (e instanceof TypeError && e.message.includes('fetch')) {
      return res.status(500).json({ error: 'Erro de conexão com o serviço de pagamento' });
    }
    res.status(500).json({ error: 'Erro ao processar pagamento: ' + e.message });
  }
});

// Endpoint para obter artefatos do PIX
app.get('/api/pay/:checkoutId/pix-artifacts', authMiddleware, async (req, res) => {
  try {
    const { checkoutId } = req.params;
    
    // Verificar se o token do PagBank está configurado
    if (!process.env.PAGBANK_TOKEN) {
      return res.status(500).json({ error: 'Serviço de pagamento não configurado' });
    }
    
    // Obter informações do checkout no banco de dados
    const checkout = await dbGet('SELECT * FROM checkouts WHERE id = ?', [checkoutId]);
    if (!checkout) {
      return res.status(404).json({ error: 'Checkout não encontrado' });
    }
    
    // Verificar se o checkout pertence ao usuário
    if (checkout.userId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    // Buscar os artefatos do PIX na API do PagBank
    const pixResponse = await fetch(`https://api.pagbank.com/v0.1/checkouts/${checkoutId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.PAGBANK_TOKEN}`
      }
    });
    
    if (!pixResponse.ok) {
      const errorData = await pixResponse.json();
      console.error('Erro ao buscar artefatos do PIX:', errorData);
      return res.status(pixResponse.status).json({ error: 'Erro ao buscar informações do PIX' });
    }
    
    const pixData = await pixResponse.json();
    
    // Verificar se há artefatos do PIX na resposta
    if (pixData.pix && pixData.pix.artefacts) {
      res.json({ 
        ok: true, 
        pixArtifacts: pixData.pix.artefacts,
        checkoutId: checkoutId
      });
    } else {
      res.status(404).json({ error: 'Artefatos do PIX não encontrados' });
    }
  } catch(e) {
    console.error('Error fetching PIX artifacts:', e);
    res.status(500).json({ error: 'Erro ao buscar artefatos do PIX: ' + e.message });
  }
});

// Endpoint para verificar status do pagamento
app.get('/api/pay/:checkoutId/status', authMiddleware, async (req, res) => {
  try {
    const { checkoutId } = req.params;
    
    // Verificar se o token do PagBank está configurado
    if (!process.env.PAGBANK_TOKEN) {
      return res.status(500).json({ error: 'Serviço de pagamento não configurado' });
    }
    
    // Obter informações do checkout no banco de dados
    const checkout = await dbGet('SELECT * FROM checkouts WHERE id = ?', [checkoutId]);
    if (!checkout) {
      return res.status(404).json({ error: 'Checkout não encontrado' });
    }
    
    // Verificar se o checkout pertence ao usuário
    if (checkout.userId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    // Buscar o status do checkout na API do PagBank
    const statusResponse = await fetch(`https://api.pagbank.com/v0.1/checkouts/${checkoutId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.PAGBANK_TOKEN}`
      }
    });
    
    if (!statusResponse.ok) {
      const errorData = await statusResponse.json();
      console.error('Erro ao buscar status do pagamento:', errorData);
      return res.status(statusResponse.status).json({ error: 'Erro ao buscar status do pagamento' });
    }
    
    const statusData = await statusResponse.json();
    
    // Atualizar o status no banco de dados local se necessário
    if (statusData.status && statusData.status !== checkout.status) {
      await dbRun('UPDATE checkouts SET status = ? WHERE id = ?', [statusData.status, checkoutId]);
    }
    
    res.json({ 
      ok: true, 
      status: statusData.status,
      checkoutId: checkoutId
    });
  } catch(e) {
    console.error('Error checking payment status:', e);
    res.status(500).json({ error: 'Erro ao verificar status do pagamento: ' + e.message });
  }
});

// Webhook para receber notificações do PagBank
app.post('/api/webhook/pagbank', express.raw({type: 'application/json'}), async (req, res) => {
  try {
    // Verificar se o token do PagBank está configurado
    if (!process.env.PAGBANK_TOKEN) {
      return res.status(500).json({ error: 'Serviço de pagamento não configurado' });
    }
    
    // Processar o payload do webhook
    const payload = JSON.parse(req.body.toString());
    
    console.log('Webhook recebido do PagBank:', JSON.stringify(payload, null, 2));
    
    // Verificar se é uma notificação válida
    if (!payload || !payload.id || !payload.status) {
      console.error('Webhook inválido recebido:', payload);
      return res.status(400).json({ error: 'Payload inválido' });
    }
    
    const checkoutId = payload.id;
    const newStatus = payload.status;
    
    // Atualizar o status do checkout no banco de dados
    const result = await dbRun('UPDATE checkouts SET status = ? WHERE id = ?', [newStatus, checkoutId]);
    
    if (result.changes === 0) {
      console.warn('Checkout não encontrado para atualização via webhook:', checkoutId);
      // O checkout pode não existir se foi criado por outro sistema
    } else {
      console.log(`Status do checkout ${checkoutId} atualizado para: ${newStatus}`);
      
      // Se o pagamento foi aprovado, enviar e-mail com o link de download
      if (newStatus === 'APPROVED') {
        // Obter informações do checkout
        const checkout = await dbGet(`
          SELECT c.*, a.filename, a.originalName, a.title, u.email, u.name 
          FROM checkouts c
          JOIN apps a ON c.appId = a.id
          JOIN users u ON c.userId = u.id
          WHERE c.id = ?
        `, [checkoutId]);
        
        if (checkout) {
          try {
            const downloadToken = uuidv4(); // Gerar um token único para download
            const downloadLink = `${process.env.SITE_URL || `http://localhost:${PORT}`}/download/${downloadToken}/${checkout.filename}`;
            
            const mail = templatePixPayment(checkout, downloadLink);
            await sendMail({ to: checkout.email, subject: mail.subject, html: mail.html });
            
            console.log('E-mail de confirmação de pagamento enviado para:', checkout.email);
          } catch (mailError) {
            console.error('Erro ao enviar e-mail de confirmação:', mailError);
          }
        }
      }
    }
    
    res.json({ ok: true });
  } catch(e) {
    console.error('Error processing PagBank webhook:', e);
    res.status(500).json({ error: 'Erro ao processar webhook: ' + e.message });
  }
});


// Rotas para desenvolvedores
// Route to get developer's own apps
app.get('/api/developer/apps', authMiddleware, async (req, res) => {
  try {
    const apps = await dbAll('SELECT * FROM apps WHERE ownerEmail = ? ORDER BY createdAt DESC', [req.user.email]);
    res.json(apps);
  } catch(e) {
    console.error('Error fetching developer apps:', e);
    res.status(500).json({ error: 'Erro ao buscar apps do desenvolvedor' });
  }
});

// Route to get developer's revenue data
app.get('/api/developer/revenue', authMiddleware, async (req, res) => {
  try {
    // Get developer's apps
    const apps = await dbAll('SELECT * FROM apps WHERE ownerEmail = ?', [req.user.email]);
    
    let totalRevenue = 0;
    let totalAdminShare = 0;
    let totalDeveloperShare = 0;
    let totalDownloads = 0;
    
    apps.forEach(app => {
      totalRevenue += (app.totalRevenue || 0);
      totalAdminShare += (app.adminShare || 0);
      totalDeveloperShare += (app.developerShare || 0);
      totalDownloads += (app.downloadCount || 0);
    });
    
    // Get developer's user data for overall stats
    const developer = await dbGet('SELECT totalRevenue, adminShare, developerShare FROM users WHERE email = ?', [req.user.email]);
    
    res.json({ 
      ok: true,
      apps: apps,
      appCount: apps.length,
      total: {
        revenue: totalRevenue,
        adminShare: totalAdminShare,
        developerShare: totalDeveloperShare,
        downloads: totalDownloads
      },
      overall: {
        totalRevenue: developer ? developer.totalRevenue : 0,
        adminShare: developer ? developer.adminShare : 0,
        developerShare: developer ? developer.developerShare : 0
      }
    });
  } catch(e) {
    console.error('Error fetching developer revenue data:', e);
    res.status(500).json({ error: 'Erro ao buscar dados de receita do desenvolvedor' });
  }
});

// =======================
// CREATE ADMIN USER
// =======================
// Route to create an admin user (for testing purposes only)
app.post('/api/create-admin', async (req, res) => {
  const { name, emailLocal, password } = req.body;
  if (!name || !emailLocal || !password) return res.status(400).json({ error: 'Dados incompletos' });
  const email = `${emailLocal}@npmstart.com`;
  
  // Check if user already exists
  const existingUser = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
  if (existingUser) return res.status(409).json({ error: 'E-mail já existe' });
  
  const hash = await bcrypt.hash(password, 10);
  const userId = uuidv4();
  const createdAt = new Date().toISOString();
  
  // Insert new admin user
  await dbRun('INSERT INTO users (id, name, email, passwordHash, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)', 
    [userId, name, email, hash, 'admin', createdAt]);

  res.json({ ok: true, message: 'Usuário administrador criado com sucesso', user: { id: userId, name: name, email: email, role: 'admin' } });
});

// =======================
// START SERVER
// =======================

app.listen(PORT, () => {
    console.log("RUNNING PORT " + PORT);
    console.log("Acesse no navegador: http://localhost:" + PORT);
});
