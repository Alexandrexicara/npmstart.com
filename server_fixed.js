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
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import database functions
const { initDb, dbAll, dbGet, dbRun } = require('./database');

// Initialize database
initDb();

// data dirs
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// uploads
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// Updated multer configuration to handle multiple files
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => { cb(null, uuidv4() + path.extname(file.originalname)); }
});

// Create multer upload middleware that handles multiple files with the same field name
const upload = multer({ storage });

// mail utils
const { sendMail, templateRegistration, templateAppApproved, templatePixPayment } = require('./utils/mailer');

// --- Auth routes ---
app.post('/api/register', async (req, res) => {
  const { name, emailLocal, password } = req.body;
  if (!name || !emailLocal || !password) return res.status(400).json({ error: 'Dados incompletos' });
  const email = `${emailLocal}@npmstart.com`;
  
  // Check if user already exists
  const existingUser = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
  if (existingUser) return res.status(409).json({ error: 'E-mail já existe' });
  
  
  const hash = await bcrypt.hash(password, 10);
  const userId = uuidv4();
  const createdAt = new Date().toISOString();
  
  // Insert new user
  await dbRun('INSERT INTO users (id, name, email, passwordHash, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)', 
    [userId, name, email, hash, 'user', createdAt]);

  try {
    const token = uuidv4();
    const confirmLink = `${process.env.SITE_URL || 'http://localhost:' + PORT}/confirm?token=${token}&email=${encodeURIComponent(email)}`;
    const mail = templateRegistration(name, confirmLink);
    await sendMail({ to: email, subject: mail.subject, html: mail.html });
  } catch(e){ console.error('mail send error', e); }

  res.json({ ok: true, user: { id: userId, name: name, email: email } });
});


app.post('/api/login', async (req, res) => {
  const { emailLocal, password } = req.body;
  const email = emailLocal.includes('@') ? emailLocal : `${emailLocal}@npmstart.com`;
  
  // Find user
  const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });
  
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(401).json({ error: 'Credenciais inválidas' });
  
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ ok: true, token, user: { id: user.id, name: user.name, email: user.email } });
});

function authMiddleware(req, res, next){
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Sem token' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'Token inválido' });
  try {
    const decoded = jwt.verify(parts[1], JWT_SECRET);
    req.user = decoded;
    next();
  } catch(e){ return res.status(401).json({ error: 'Token inválido' }); }
}

// Admin middleware to check if user is admin
function adminMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Sem token' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'Token inválido' });
  try {
    const decoded = jwt.verify(parts[1], JWT_SECRET);
    req.user = decoded;
    
    // Check if user is admin
    // For demonstration purposes, we'll allow access if the user's email contains 'admin'
    // In a real application, you would have a more robust admin check
    if (decoded.role === 'admin' || decoded.email.includes('admin')) {
      next();
    } else {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem acessar esta área.' });
    }
  } catch(e){ return res.status(401).json({ error: 'Token inválido' }); }
}

// --- Apps API ---
app.get('/api/apps', async (req, res) => {
  try {
    const apps = await dbAll('SELECT * FROM apps WHERE approved = 1 ORDER BY createdAt DESC');
    res.json(apps);
  } catch(e) {
    console.error('Error fetching apps:', e);
    res.status(500).json({ error: 'Erro ao buscar apps' });
  }
});


// New route to get pending apps (for admin panel)
app.get('/api/apps/pending', adminMiddleware, async (req, res) => {
  try {
    const apps = await dbAll('SELECT * FROM apps WHERE approved = 0 ORDER BY createdAt DESC');
    res.json(apps);
  } catch(e) {
    console.error('Error fetching pending apps:', e);
    res.status(500).json({ error: 'Erro ao buscar apps pendentes' });
  }
});


// New route to get all users (for admin panel)
app.get('/api/users', adminMiddleware, async (req, res) => {
  try {
    const users = await dbAll('SELECT id, name, email, role, createdAt FROM users ORDER BY createdAt DESC');
    res.json(users);
  } catch(e) {
    console.error('Error fetching users:', e);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});


// Update the upload endpoint to handle screenshots
app.post('/api/upload', authMiddleware, upload.any(), async (req, res) => {
  try {
    console.log('=== UPLOAD DEBUG INFO ===');
    console.log('All files received:', req.files);
    console.log('Request body:', req.body);
    
    // Initialize files object
    const files = {
      screenshots: [],
      icon: null,
      appFile: null
    };
    
    
    // Process files with improved logic
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach((file, index) => {
        console.log(`Processing file ${index}:`, {
          fieldname: file.fieldname,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size
        });
        
        // Categorize files based on fieldname
        switch (file.fieldname) {
          case 'screenshots':
            files.screenshots.push(file);
            break;
          case 'icon':
            files.icon = file;
            break;
          case 'file':
            files.appFile = file;
            break;
          default:
            console.log(`Unknown fieldname: ${file.fieldname}`);
        }
      });
    }
    
    
    console.log('=== AFTER PROCESSING ===');
    console.log('Screenshots count:', files.screenshots.length);
    console.log('Has icon:', !!files.icon);
    console.log('Has app file:', !!files.appFile);
    
    // Get text fields from body
    const { title = 'Sem título', description = '', price = '0', platform = 'android' } = req.body;
    
    // Validate required fields
    if (!files.appFile) {
      return res.status(400).json({ error: 'Arquivo do app não enviado' });
    }
    
    // Validate screenshots count
    if (files.screenshots.length < 3) {
      return res.status(400).json({ 
        error: 'Por favor, envie pelo menos 3 screenshots. Você enviou ' + 
               files.screenshots.length + ' screenshots.' 
      });
    }
    
    
    // Generate unique IDs for the app and screenshots
    const appId = uuidv4();
    const createdAt = new Date().toISOString();
    const priceNum = Number(price) || 0;
    
    // Save icon if provided
    let iconFilename = null;
    if (files.icon) {
      iconFilename = `${appId}_icon${path.extname(files.icon.originalname)}`;
      const iconPath = path.join(UPLOAD_DIR, iconFilename);
      // Check if file exists before moving
      if (fs.existsSync(files.icon.path)) {
        fs.renameSync(files.icon.path, iconPath);
      }
    }
    
    
    // Save screenshots to uploads directory with app ID prefix
    const screenshotPaths = [];
    console.log(`Processing ${files.screenshots.length} screenshots`);
    
    // Create a container/directory for this app's screenshots
    const appScreenshotsDir = path.join(UPLOAD_DIR, `app_${appId}_screenshots`);
    if (!fs.existsSync(appScreenshotsDir)) {
      fs.mkdirSync(appScreenshotsDir);
    }
    
    
    // Process each screenshot - Create a separate container for each screenshot
    for (let i = 0; i < files.screenshots.length; i++) {
      const screenshot = files.screenshots[i];
      console.log(`Processing screenshot ${i}:`, screenshot.originalname);
      
      // Check if screenshot file exists
      if (!fs.existsSync(screenshot.path)) {
        console.error(`Screenshot file does not exist: ${screenshot.path}`);
        continue;
      }
      
      
      // Create a separate container for each screenshot
      const screenshotContainerDir = path.join(appScreenshotsDir, `screenshot_${i}_container`);
      if (!fs.existsSync(screenshotContainerDir)) {
        fs.mkdirSync(screenshotContainerDir);
      }
      
      
      // Create unique filename for screenshot
      const screenshotFilename = `screenshot_${i}${path.extname(screenshot.originalname)}`;
      const screenshotPath = path.join(screenshotContainerDir, screenshotFilename);
      
      // Move screenshot to its own container directory
      console.log(`Moving screenshot from ${screenshot.path} to ${screenshotPath}`);
      fs.renameSync(screenshot.path, screenshotPath);
      screenshotPaths.push(`app_${appId}_screenshots/screenshot_${i}_container/${screenshotFilename}`);
      console.log(`Screenshot ${i} moved successfully to its container`);
    }
    
    
    // Save app file
    const appFilename = `${appId}_${files.appFile.originalname}`;
    const appPath = path.join(UPLOAD_DIR, appFilename);
    // Check if file exists before moving
    if (fs.existsSync(files.appFile.path)) {
      fs.renameSync(files.appFile.path, appPath);
    }
    
    
    // Save app data to database
    await dbRun('INSERT INTO apps (id, title, description, price, platform, filename, originalName, size, ownerEmail, createdAt, approved, icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [appId, title, description, priceNum, platform, appFilename, files.appFile.originalname, files.appFile.size, req.user.email, createdAt, 0, iconFilename]);
    
    // Save screenshot paths to database (as JSON string)
    const screenshotsJson = JSON.stringify(screenshotPaths);
    await dbRun('UPDATE apps SET screenshots = ? WHERE id = ?', [screenshotsJson, appId]);
    
    const appObj = {
      id: appId,
      title,
      description,
      price: priceNum,
      platform,
      filename: appFilename,
      originalName: files.appFile.originalname,
      size: files.appFile.size,
      ownerEmail: req.user.email,
      createdAt,
      approved: false,
      screenshots: screenshotPaths,
      icon: iconFilename
    };
    
    
    console.log('=== UPLOAD SUCCESS ===');
    console.log('App created with ID:', appId);
    console.log('Screenshots saved:', screenshotPaths.length);
    
    res.json({ ok: true, app: appObj });
  } catch(e) {
    console.error('Error uploading app:', e);
    res.status(500).json({ error: 'Erro ao salvar app: ' + e.message });
  }
});

// approve
app.post('/api/admin/approve/:id', authMiddleware, async (req, res) => {
  try {
    // Update app approval status
    const result = await dbRun('UPDATE apps SET approved = 1 WHERE id = ?', [req.params.id]);
    if (result.changes === 0) return res.status(404).json({ error: 'App não encontrado' });
    
    // Get the updated app
    const appObj = await dbGet('SELECT * FROM apps WHERE id = ?', [req.params.id]);
    
    // Get owner info
    const owner = await dbGet('SELECT * FROM users WHERE email = ?', [appObj.ownerEmail]);
    if (owner) {
      try {
        const mail = templateAppApproved(appObj);
        await sendMail({ to: owner.email, subject: mail.subject, html: mail.html });
      } catch(e){ console.error('mail error', e); }
    }
    
    res.json({ ok: true, app: appObj });
  } catch(e) {
    console.error('Error approving app:', e);
    res.status(500).json({ error: 'Erro ao aprovar app' });
  }
});


// download
app.get('/download/:token/:filename', async (req, res) => {
  try {
    const { token, filename } = req.params;
    console.log('Download request:', { token, filename });
    
    // Para apps gratuitos, permitir download direto
    if (token === 'free') {
      const file = path.join(UPLOAD_DIR, filename);
      console.log('Free download path:', file);
      if (!fs.existsSync(file)) {
        console.log('File not found:', file);
        return res.status(404).send('Arquivo não encontrado');
      }
      
      console.log('File found, sending download');
      return res.download(file);
    }
    
    // Para apps pagos, verificar se é um token válido (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      return res.status(400).send('Token inválido');
    }
    
    // Verificar se o arquivo existe
    const file = path.join(UPLOAD_DIR, filename);
    console.log('Paid download path:', file);
    if (!fs.existsSync(file)) {
      console.log('File not found:', file);
      return res.status(404).send('Arquivo não encontrado');
    }
    
    console.log('File found, sending download');
    res.download(file);
  } catch(e) {
    console.error('Error downloading file:', e);
    res.status(500).send('Erro ao baixar arquivo');
  }
});

// payments
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
    
    // Log para debug
    console.log('App price:', appObj.price);
    console.log('App title:', appObj.title);
    console.log('App ID:', appObj.id);
    console.log('PagBank Token exists:', !!process.env.PAGBANK_TOKEN);
    
    // Validar e formatar os dados antes de enviar para o PagBank
    const amount = parseFloat(appObj.price.toFixed(2));
    const description = `Compra do app ${appObj.title}`.substring(0, 100); // Limitar a 100 caracteres
    
    // Definir o ambiente (sandbox ou produção)
    const pagbankBaseUrl = process.env.PAGBANK_ENV === 'sandbox' 
      ? 'https://sandbox.api.pagseguro.com' 
      : 'https://api.pagseguro.com';
    
    // Criar um checkout no PagBank usando a API REST diretamente
    const checkoutData = {
      reference_id: `app_purchase_${appObj.id}_${Date.now()}`.substring(0, 50), // Limitar a 50 caracteres
      items: [
        {
          reference_id: `item_${appObj.id}`.substring(0, 50),
          name: appObj.title,
          quantity: 1,
          unit_amount: Math.round(amount * 100) // Valor em centavos
        }
      ],
      notification_urls: [`${process.env.SITE_URL || 'http://localhost:3000'}/api/webhook/pagbank`],
      redirect_url: `${process.env.SITE_URL || 'http://localhost:3000'}/payment-return.html`
    };
    
    // Log para debug
    console.log('Sending checkout data to PagBank:', JSON.stringify(checkoutData, null, 2));
    
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
    
    console.log('PagBank response status:', pagbankResponse.status);
    console.log('PagBank response data:', JSON.stringify(pagbankData, null, 2));
    
    if (!pagbankResponse.ok) {
      console.error('PagBank API Error:', pagbankData);
      // Tratar erros específicos do PagBank
      if (pagbankData.error) {
        return res.status(400).json({ error: 'Dados de pagamento inválidos: ' + (pagbankData.error.message || JSON.stringify(pagbankData.error)) });
      }
      throw new Error(`Erro no PagBank: ${pagbankData.message || JSON.stringify(pagbankData)}`);
    }
    
    // Verificar se a resposta do PagBank contém os dados necessários
    if (!pagbankData || !pagbankData.id) {
      console.error('Invalid PagBank response:', pagbankData);
      throw new Error('Resposta inválida do PagBank');
    }
    
    // Obter a URL de pagamento do PagBank
    const paymentLink = pagbankData.links?.find(link => link.rel === 'PAY');
    if (!paymentLink || !paymentLink.href) {
      console.error('Payment URL not returned by PagBank API:', pagbankData);
      throw new Error('URL de pagamento não disponível');
    }
    
    const paymentUrl = paymentLink.href;
    
    console.log("Payment URL do PagBank:", paymentUrl);
    
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
    console.error('Error processing payment:', e);
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
    
    // Definir o ambiente (sandbox ou produção)
    const pagbankBaseUrl = process.env.PAGBANK_ENV === 'sandbox' 
      ? 'https://sandbox.api.pagseguro.com' 
      : 'https://api.pagseguro.com';
    
    // Buscar o status do checkout na API do PagBank
    const statusResponse = await fetch(`${pagbankBaseUrl}/orders/${checkoutId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.PAGBANK_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!statusResponse.ok) {
      const errorData = await statusResponse.json();
      console.error('Erro ao buscar status do checkout:', errorData);
      return res.status(statusResponse.status).json({ error: 'Erro ao buscar status do pagamento' });
    }
    
    const statusData = await statusResponse.json();
    
    // No PagBank, o status está em charges[0].status
    const status = statusData.charges && statusData.charges[0] ? statusData.charges[0].status : 'UNKNOWN';
    
    res.json({ 
      ok: true, 
      status: status,
      checkoutId: checkoutId
    });
  } catch(e) {
    console.error('Error fetching payment status:', e);
    res.status(500).json({ error: 'Erro ao buscar status do pagamento: ' + e.message });
  }
});

// Webhook para receber notificações do PagBank
app.post('/api/webhook/pagbank', express.raw({type: 'application/json'}), async (req, res) => {
  try {
    // Parse o corpo da requisição
    const event = JSON.parse(req.body);
    
    console.log('Webhook PagBank recebido:', JSON.stringify(event, null, 2));
    
    // Verificar se é um evento de pagamento bem-sucedido
    if (event.type === 'ORDER_PAID' && event.id) {
      // No PagBank, o ID do pedido está no campo 'id'
      const checkoutId = event.id;
      
      // Obter informações do checkout no banco de dados
      const checkout = await dbGet('SELECT * FROM checkouts WHERE id = ?', [checkoutId]);
      if (!checkout) {
        console.log('Checkout not found:', checkoutId);
        return res.status(404).json({ error: 'Checkout não encontrado' });
      }
      
      // Verificar se o status já foi atualizado
      if (checkout.status === 'paid') {
        return res.json({ ok: true, message: 'Pagamento já processado' });
      }
      
      // Atualizar status do checkout no banco de dados
      await dbRun('UPDATE checkouts SET status = ? WHERE id = ?', ['paid', checkoutId]);
      
      // Obter informações do app
      const appObj = await dbGet('SELECT * FROM apps WHERE id = ?', [checkout.appId]);
      
      // Gerar link de download
      const downloadToken = uuidv4();
      const downloadLink = `${process.env.SITE_URL || 'http://localhost:' + PORT}/download/${appObj.filename}?token=${downloadToken}`;
      
      // Enviar e-mail com o link de download
      const buyer = await dbGet('SELECT * FROM users WHERE id = ?', [checkout.userId]);
      try {
        const mail = templatePixPayment(buyer || {name: 'usuário'}, appObj, downloadLink);
        await sendMail({ to: buyer.email, subject: mail.subject, html: mail.html });
      } catch(e){ console.error('mail send error', e); }
      
      // Registrar o download para rastreamento de receita
      await dbRun(`UPDATE apps SET 
        downloadCount = COALESCE(downloadCount, 0) + 1, 
        totalRevenue = COALESCE(totalRevenue, 0) + ?,
        adminShare = COALESCE(adminShare, 0) + (? * 0.3),
        developerShare = COALESCE(developerShare, 0) + (? * 0.7)
        WHERE id = ?`, 
        [appObj.price, appObj.price, appObj.price, appObj.id]);
      
      // Atualizar receita do desenvolvedor
      const developer = await dbGet('SELECT * FROM users WHERE email = ?', [appObj.ownerEmail]);
      if (developer) {
        await dbRun(`UPDATE users SET 
          totalRevenue = COALESCE(totalRevenue, 0) + ?,
          adminShare = COALESCE(adminShare, 0) + (? * 0.3),
          developerShare = COALESCE(developerShare, 0) + (? * 0.7)
          WHERE email = ?`, 
          [appObj.price, appObj.price, appObj.price, appObj.ownerEmail]);
      }
      
      console.log('Pagamento processado com sucesso:', checkoutId);
      res.json({ ok: true, message: 'Pagamento processado com sucesso' });
    } else {
      res.json({ ok: true, message: 'Evento ignorado' });
    }
  } catch(e) {
    console.error('Error processing webhook:', e);
    res.status(500).json({ error: 'Erro ao processar webhook: ' + e.message });
  }
});

// Endpoint para obter artefatos do PIX
app.get('/api/pay/:checkoutId/pix-artifacts', authMiddleware, async (req, res) => {
  try {
    const { checkoutId } = req.params;
    
    // Verificar se a API key da SumUp está configurada
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
    
    // Verificar se a API key da SumUp está configurada
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
      console.error('Erro ao buscar status do checkout:', errorData);
      return res.status(statusResponse.status).json({ error: 'Erro ao buscar status do pagamento' });
    }
    
    const statusData = await statusResponse.json();
    
    res.json({ 
      ok: true, 
      status: statusData.status,
      checkoutId: checkoutId
    });
  } catch(e) {
    console.error('Error fetching payment status:', e);
    res.status(500).json({ error: 'Erro ao buscar status do pagamento: ' + e.message });
  }
});

// Endpoint para obter artefatos do PIX
app.get('/api/pay/:checkoutId/pix-artifacts', authMiddleware, async (req, res) => {
  try {
    const { checkoutId } = req.params;
    
    // Verificar se a API key da SumUp está configurada
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
    
    // Verificar se a API key da SumUp está configurada
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
      console.error('Erro ao buscar status do checkout:', errorData);
      return res.status(statusResponse.status).json({ error: 'Erro ao buscar status do pagamento' });
    }
    
    const statusData = await statusResponse.json();
    
    res.json({ 
      ok: true, 
      status: statusData.status,
      checkoutId: checkoutId
    });
  } catch(e) {
    console.error('Error fetching payment status:', e);
    res.status(500).json({ error: 'Erro ao buscar status do pagamento: ' + e.message });
  }
});

// Este webhook foi substituído pelo webhook do PagBank
// A implementação anterior do SumUp foi removida
// O novo webhook está em /api/webhook/pagbank

// mail send
app.post('/api/mail/send', authMiddleware, async (req, res) => {
  const { to, subject, html, text } = req.body;
  if (!to || (!html && !text)) return res.status(400).json({ error: 'Dados inválidos' });
  try {
    const info = await sendMail({ to, subject, html, text, from: `"${req.user.name}" <${req.user.email}>` });
    res.json({ ok: true, info });
  } catch(e){ console.error('send mail error', e); res.status(500).json({ error: 'Erro ao enviar' }); }
});

// mail fetch IMAP
app.get('/api/mail/fetch', authMiddleware, async (req, res) => {
  try {
    // Check if IMAP is configured
    const imapHost = process.env.IMAP_HOST;
    if (!imapHost) {
      return res.status(400).json({ error: 'IMAP não configurado' });
    }
    
    const Imap = require('imap-simple');
    const simpleParser = require('mailparser').simpleParser;
    const imapPort = Number(process.env.IMAP_PORT) || 993;
    const imapUserTemplate = process.env.IMAP_USER_TEMPLATE || '{user}@npmstart.com';
    const imapUser = imapUserTemplate.replace('{user}', req.user.email.split('@')[0]);
    const imapPass = process.env.IMAP_PASS || '';

    const config = {
      imap: {
        user: imapUser,
        password: imapPass,
        host: imapHost,
        port: imapPort,
        tls: true,
        authTimeout: 10000
      }
    };
    
    const connection = await Imap.connect(config);
    await connection.openBox('INBOX');
    const searchCriteria = ['ALL'];
    const fetchOptions = { bodies: [''], markSeen: false };
    const messages = await connection.search(searchCriteria, fetchOptions);
    const parsed = [];
    for (const item of messages.slice(-30)) {
      const all = item.parts.find(p => p.which === '');
      const parsedMail = await simpleParser(all.body);
      parsed.push({ subject: parsedMail.subject, from: parsedMail.from && parsedMail.from.text, date: parsedMail.date, text: parsedMail.text, html: parsedMail.html });
    }
    
    connection.end();
    res.json({ ok: true, mails: parsed.reverse() });
  } catch(e){ 
    console.error('imap error', e); 
    // Return a more user-friendly error message
    if (e.code === 'ECONNREFUSED') {
      res.status(500).json({ error: 'Não foi possível conectar ao servidor IMAP. Verifique as configurações.' }); 
    } else {
      res.status(500).json({ error: 'Erro IMAP: ' + String(e.message || e) }); 
    }
  }
});

/* ================================
   🔥 ROTAS FIXAS PARA PÁGINAS
================================ */

// abrir normalmente
app.get('/app.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

app.get('/public/app.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/mailbox.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mailbox.html'));
});

// index principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/developer.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'developer.html'));
});

app.get('/payment-return.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'payment-return.html'));
});

// Route to make a user an admin
app.post('/api/users/:id/make-admin', adminMiddleware, async (req, res) => {
  try {
    // Check if user exists
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    
    // Update user role to admin
    await dbRun('UPDATE users SET role = ? WHERE id = ?', ['admin', req.params.id]);
    
    // Get updated user
    const updatedUser = await dbGet('SELECT id, name, email, role, createdAt FROM users WHERE id = ?', [req.params.id]);
    
    res.json({ ok: true, message: 'Usuário promovido a administrador com sucesso', user: updatedUser });
  } catch(e) {
    console.error('Error making user admin:', e);
    res.status(500).json({ error: 'Erro ao promover usuário a administrador' });
  }
});

// Route to delete a user
app.delete('/api/users/:id', adminMiddleware, async (req, res) => {
  try {
    // Check if user exists
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    
    // Prevent deleting the last admin user
    if (user.role === 'admin') {
      const adminCount = await dbGet('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin']);
      if (adminCount.count <= 1) {
        return res.status(400).json({ error: 'Não é possível excluir o último usuário administrador' });
      }
    }
    
    // Delete user
    await dbRun('DELETE FROM users WHERE id = ?', [req.params.id]);
    
    res.json({ ok: true, message: 'Usuário excluído com sucesso' });
  } catch(e) {
    console.error('Error deleting user:', e);
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});

// Route to delete an app
app.delete('/api/apps/:id', adminMiddleware, async (req, res) => {
  try {
    // Check if app exists
    const app = await dbGet('SELECT * FROM apps WHERE id = ?', [req.params.id]);
    if (!app) return res.status(404).json({ error: 'App não encontrado' });
    
    // Delete app
    await dbRun('DELETE FROM apps WHERE id = ?', [req.params.id]);
    
    res.json({ ok: true, message: 'App excluído com sucesso' });
  } catch(e) {
    console.error('Error deleting app:', e);
    res.status(500).json({ error: 'Erro ao excluir app' });
  }
});

// Route to track app downloads and calculate revenue
app.post('/api/apps/:id/download', authMiddleware, async (req, res) => {
  try {
    // Check if app exists
    const app = await dbGet('SELECT * FROM apps WHERE id = ?', [req.params.id]);
    if (!app) return res.status(404).json({ error: 'App não encontrado' });
    
    // For free apps, revenue is generated from ads
    // For paid apps, revenue is generated from the purchase
    let revenueAmount = 0;
    if (app.price > 0) {
      // Paid app - revenue is the app price
      revenueAmount = app.price;
    } else {
      // Free app - revenue is generated from ads (default: R$0.10 per download)
      revenueAmount = 0.10;
    }
    
    // Calculate shares (30% for admin, 70% for developer)
    const adminShare = revenueAmount * 0.30;
    const developerShare = revenueAmount * 0.70;
    
    // Update app download count and revenue in the database
    const downloadCount = (app.downloadCount || 0) + 1;
    const totalRevenue = (app.totalRevenue || 0) + revenueAmount;
    const appAdminShare = (app.adminShare || 0) + adminShare;
    const appDeveloperShare = (app.developerShare || 0) + developerShare;
    
    await dbRun(`UPDATE apps SET 
      downloadCount = ?, 
      totalRevenue = ?, 
      adminShare = ?, 
      developerShare = ? 
      WHERE id = ?`, 
      [downloadCount, totalRevenue, appAdminShare, appDeveloperShare, req.params.id]);
    
    // Also update the developer's total revenue
    const developer = await dbGet('SELECT * FROM users WHERE email = ?', [app.ownerEmail]);
    if (developer) {
      const devTotalRevenue = (developer.totalRevenue || 0) + revenueAmount;
      const devAdminShare = (developer.adminShare || 0) + adminShare;
      const devDeveloperShare = (developer.developerShare || 0) + developerShare;
      
      await dbRun(`UPDATE users SET 
        totalRevenue = ?, 
        adminShare = ?, 
        developerShare = ? 
        WHERE email = ?`, 
        [devTotalRevenue, devAdminShare, devDeveloperShare, app.ownerEmail]);
    }
    
    res.json({ 
      ok: true, 
      message: 'Download registrado com sucesso',
      revenue: {
        amount: revenueAmount,
        adminShare: adminShare,
        developerShare: developerShare
      }
    });
  } catch(e) {
    console.error('Error tracking download:', e);
    res.status(500).json({ error: 'Erro ao registrar download' });
  }
});

// Route to get revenue data for admin dashboard
app.get('/api/revenue', adminMiddleware, async (req, res) => {
  try {
    // Get total revenue data
    const apps = await dbAll('SELECT * FROM apps');
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
    
    // Get revenue data by developer with better error handling
    let developers = [];
    try {
      // Calculate revenue data without relying on missing columns in users table
      developers = await dbAll(`SELECT 
        u.id, u.name, u.email, 
        COALESCE(revenueData.totalRevenue, 0) as totalRevenue,
        COALESCE(revenueData.adminShare, 0) as adminShare,
        COALESCE(revenueData.developerShare, 0) as developerShare,
        (SELECT COUNT(*) FROM apps WHERE ownerEmail = u.email) as appCount,
        (SELECT COALESCE(SUM(downloadCount), 0) FROM apps WHERE ownerEmail = u.email) as totalDownloads
        FROM users u
        LEFT JOIN (
          SELECT 
            ownerEmail,
            SUM(totalRevenue) as totalRevenue,
            SUM(adminShare) as adminShare,
            SUM(developerShare) as developerShare
          FROM apps 
          GROUP BY ownerEmail
        ) revenueData ON u.email = revenueData.ownerEmail`);
    } catch(e) {
      console.error('Error calculating developer revenue:', e);
      // Return empty array if there's an error calculating developer revenue
      developers = [];
    }
    
    res.json({ 
      ok: true,
      totalRevenue,
      totalAdminShare,
      totalDeveloperShare,
      totalDownloads,
      developers
    });
  } catch(e) {
    console.error('Error getting revenue data:', e);
    res.status(500).json({ error: 'Erro ao obter dados de receita' });
  }
});

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
// Route to recreate the database (for testing purposes only)
app.post('/api/recreate-db', async (req, res) => {
  try {
    const { recreateDb } = require('./database');
    recreateDb();
    res.json({ ok: true, message: 'Database recreation initiated' });
  } catch(e) {
    console.error('Error recreating database:', e);
    res.status(500).json({ error: 'Erro ao recriar o banco de dados' });
  }
});

// Route to send confirmation email
app.post('/api/send-confirm-email', authMiddleware, async (req, res) => {
  try {
    // Check if email service is configured
    const smtpHost = process.env.SMTP_HOST;
    if (!smtpHost) {
      return res.status(400).json({ error: 'Serviço de e-mail não configurado' });
    }
    
    const { sendMail, templateRegistration } = require('./utils/mailer');
    const linkConfirm = `${process.env.SITE_URL || `http://localhost:${process.env.PORT || 3000}`}/confirm-email.html?token=${req.user.id}`;
    const template = templateRegistration(req.user.name, linkConfirm);
    const info = await sendMail({ to: req.user.email, subject: template.subject, html: template.html });
    res.json({ ok: true, info });
  } catch(e){ 
    console.error('send mail error', e); 
    // Return a more user-friendly error message
    if (e.code === 'ECONNREFUSED') {
      res.status(500).json({ error: 'Não foi possível conectar ao servidor SMTP. Verifique as configurações.' }); 
    } else {
      res.status(500).json({ error: 'Erro ao enviar e-mail: ' + String(e.message || e) }); 
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});