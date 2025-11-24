const nodemailer = require('nodemailer');
require('dotenv').config();

const provider = process.env.MAIL_PROVIDER || 'smtp';

let transporter;
if (provider === 'sendgrid' && process.env.MAIL_API_KEY) {
  transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    auth: { user: 'apikey', pass: process.env.MAIL_API_KEY }
  });
} else if (process.env.SMTP_HOST) {
  // Only create transporter if SMTP_HOST is configured
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT == 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
} else {
  // Create a dummy transporter that will log emails instead of sending them
  transporter = {
    sendMail: async (mailOptions) => {
      console.log('EMAIL NOT CONFIGURED - Would send email:', mailOptions);
      return { messageId: 'dummy-message-id' };
    }
  };
}

async function sendMail({ to, subject, html, text, from }) {
  // If no transporter is configured, just log the email
  if (!process.env.SMTP_HOST && provider !== 'sendgrid') {
    console.log('EMAIL NOT CONFIGURED - Would send email to:', to);
    console.log('Subject:', subject);
    console.log('Content:', html || text);
    return { messageId: 'dummy-message-id' };
  }
  
  const mailOptions = {
    from: from || (`"${process.env.FROM_NAME || 'npm-start'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`),
    to,
    subject,
    text,
    html
  };
  const info = await transporter.sendMail(mailOptions);
  return info;
}

function templateRegistration(name, linkConfirm) {
  return {
    subject: 'Confirme seu e-mail — npm-start.com',
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#222">
        <h2 style="color:#f0c36f">Bem-vindo(a) à npm-start.com, ${name}!</h2>
        <p>Clique no botão abaixo para confirmar seu e-mail e ativar sua conta de desenvolvedor.</p>
        <p><a href="${linkConfirm}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#f0c36f;color:#111;text-decoration:none">Confirmar e-mail</a></p>
        <hr>
        <small>Se não foi você, ignore este e-mail.</small>
      </div>
    `
  };
}

function templateAppApproved(app) {
  return {
    subject: `Seu app "${app.title}" foi aprovado`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#222">
        <h2 style="color:#f0c36f">Parabéns! Seu app foi aprovado</h2>
        <p>O app <strong>${app.title}</strong> já está disponível na loja.</p>
        <p>Link público: <a href="${process.env.SITE_URL || ''}/app.html?id=${app.id}">${process.env.SITE_URL || ''}/app.html?id=${app.id}</a></p>
        <hr>
        <small>Equipe npm-start.com</small>
      </div>
    `
  };
}

function templatePixPayment(user, app, downloadLink) {
  return {
    subject: `Pagamento confirmado — ${app.title}`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#222">
        <h2 style="color:#f0c36f">Pagamento confirmado</h2>
        <p>Olá ${user.name || 'usuário'}, recebemos seu pagamento pelo app <strong>${app.title}</strong>.</p>
        <p>Seu link de download: <a href="${downloadLink}">Baixar ${app.title}</a></p>
        <hr>
        <small>Se tiver problemas, responda a este e-mail.</small>
      </div>
    `
  };
}

module.exports = { sendMail, templateRegistration, templateAppApproved, templatePixPayment };