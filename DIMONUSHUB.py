#!/usr/bin/env python3
import asyncio
import threading
import os
import json
from datetime import datetime
from flask import Flask, render_template_string, request, jsonify, redirect, url_for
from telethon import TelegramClient

# ========== КОНФИГ ==========
API_ID = int(os.environ.get('API_ID', 23721778))
API_HASH = os.environ.get('API_HASH', '7935a656311ab4e500294b22d6b6c7f6')
SESSION_NAME = 'master_session'
TIMEOUT = 20  # секунд на подтверждение

# Хранилище сессий
pending_sessions = {}
active_sessions = set()

# Flask
app = Flask(__name__)
app.secret_key = os.urandom(24)

# Telethon клиент
client = TelegramClient(SESSION_NAME, API_ID, API_HASH)

# ========== КРАСИВЫЙ HTML С СТИКЕРАМИ ==========
HTML = """
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Session Manager | FSOCIETY</title>
    <meta http-equiv="refresh" content="5">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            background: linear-gradient(145deg, #0a0f1a 0%, #0c111c 100%);
            font-family: 'Segoe UI', 'Inter', system-ui, -apple-system, sans-serif;
            padding: 30px 20px;
            color: #eef2ff;
            min-height: 100vh;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        h1 {
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, #c084fc, #60a5fa);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            margin-bottom: 0.5rem;
            display: inline-flex;
            align-items: center;
            gap: 12px;
        }
        .sub {
            color: #6c86a3;
            margin-bottom: 2rem;
            border-left: 3px solid #3b82f6;
            padding-left: 16px;
        }
        .stats {
            display: flex;
            gap: 20px;
            margin-bottom: 30px;
            flex-wrap: wrap;
        }
        .stat-card {
            background: #111827cc;
            backdrop-filter: blur(8px);
            border: 1px solid #1e2a3e;
            border-radius: 24px;
            padding: 16px 24px;
            flex: 1;
            min-width: 160px;
            transition: all 0.2s;
        }
        .stat-card:hover {
            border-color: #3b82f6;
            transform: translateY(-2px);
        }
        .stat-number {
            font-size: 2rem;
            font-weight: 800;
            color: #facc15;
        }
        .stat-label {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #8ca3ba;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            background: #0f172acc;
            backdrop-filter: blur(4px);
            border-radius: 28px;
            overflow: hidden;
            box-shadow: 0 8px 20px rgba(0,0,0,0.4);
        }
        th {
            text-align: left;
            padding: 18px 16px;
            background: #1e293bb3;
            font-weight: 600;
            color: #b9d0f0;
        }
        td {
            padding: 14px 16px;
            border-bottom: 1px solid #1e2a3e;
            vertical-align: middle;
        }
        .status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 40px;
            font-size: 0.75rem;
            font-weight: 600;
        }
        .status.pending {
            background: #f59e0b20;
            color: #fbbf24;
            border: 1px solid #f59e0b40;
        }
        .status.approved, .status.active {
            background: #10b98120;
            color: #34d399;
            border: 1px solid #10b98140;
        }
        button {
            background: #3b82f6;
            border: none;
            padding: 8px 18px;
            border-radius: 40px;
            color: white;
            font-weight: 600;
            font-size: 0.75rem;
            cursor: pointer;
            transition: all 0.2s;
            margin-right: 8px;
        }
        button.approve {
            background: #10b981;
        }
        button.reject {
            background: #ef4444;
        }
        button.kick {
            background: #dc2626;
        }
        button.refresh {
            background: #334155;
        }
        button.clear {
            background: #7c2d12;
        }
        button:hover {
            transform: scale(0.96);
            filter: brightness(1.1);
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 0.7rem;
            color: #3b4a62;
        }
        @keyframes pulse {
            0% { opacity: 0.6; }
            100% { opacity: 1; }
        }
        .auto-refresh {
            font-size: 0.7rem;
            background: #111827;
            display: inline-block;
            padding: 4px 12px;
            border-radius: 30px;
        }
        .emoji {
            font-size: 1.2rem;
        }
    </style>
</head>
<body>
<div class="container">
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div>
            <h1>
                <span class="emoji">🔐</span> SESSION MONITOR
                <span class="emoji">🛡️</span>
            </h1>
            <div class="sub">управление сессиями + авто-кик по таймауту</div>
        </div>
        <div class="auto-refresh">
            <span class="emoji">🔄</span> live reload 5 сек
        </div>
    </div>

    <div class="stats">
        <div class="stat-card">
            <div class="stat-number">{{ pending_count }}</div>
            <div class="stat-label"><span class="emoji">⏳</span> ожидают подтверждения</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">{{ approved_count }}</div>
            <div class="stat-label"><span class="emoji">✅</span> активных сессий</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">{{ total_sessions }}</div>
            <div class="stat-label"><span class="emoji">📊</span> всего сессий</div>
        </div>
    </div>

    <div style="margin-bottom: 16px; text-align: right;">
        <button class="refresh" onclick="location.reload()">
            <span class="emoji">⟳</span> Обновить
        </button>
        <button class="clear" onclick="clearAll()">
            <span class="emoji">⚠️</span> Очистить всё
        </button>
    </div>

    <div style="overflow-x: auto;">
        <table>
            <thead>
                <tr>
                    <th><span class="emoji">🆔</span> ID сессии</th>
                    <th><span class="emoji">👤</span> Пользователь</th>
                    <th><span class="emoji">📅</span> Время запроса</th>
                    <th><span class="emoji">📌</span> Статус</th>
                    <th><span class="emoji">⚡</span> Действия</th>
                </tr>
            </thead>
            <tbody>
                {% for sid, data in sessions.items() %}
                <tr>
                    <td><code>{{ sid[:24] }}...</code></td>
                    <td>{{ data.user }}</td>
                    <td>{{ data.date.strftime('%Y-%m-%d %H:%M:%S') }}</td>
                    <td><span class="status {{ data.status }}">{{ data.status }}</span></td>
                    <td>
                        {% if data.status == 'pending' %}
                            <button class="approve" onclick="action('{{ sid }}', 'approve')">
                                <span class="emoji">✅</span> Approve
                            </button>
                            <button class="reject" onclick="action('{{ sid }}', 'reject')">
                                <span class="emoji">❌</span> Reject
                            </button>
                        {% endif %}
                        <button class="kick" onclick="action('{{ sid }}', 'kick')">
                            <span class="emoji">⛔</span> Kick
                        </button>
                    </td>
                </tr>
                {% endfor %}
                {% if sessions|length == 0 %}
                <tr>
                    <td colspan="5" style="text-align: center; color: #6b88a8;">
                        <span class="emoji">💤</span> нет активных или ожидающих сессий
                    </td>
                </tr>
                {% endif %}
            </tbody>
        </table>
    </div>
    
    <div class="footer">
        <span class="emoji">⚡</span> MTProto guard | авто-кик через {{ timeout }} сек | твоя сеть — твои правила
        <span class="emoji">🔥</span>
    </div>
</div>

<script>
function action(sid, act) {
    fetch('/' + act, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({session_id: sid})
    }).then(() => location.reload());
}

function clearAll() {
    fetch('/clear_all', {method: 'POST'}).then(() => location.reload());
}

setInterval(() => location.reload(), 5000);
</script>
</body>
</html>
"""

# ========== TELEGRAM HANDLERS ==========
@client.on(events.NewMessage)
async def new_session_watcher(event):
    # Отслеживаем новые сессии (упрощённо)
    if 'logged in' in event.raw_text.lower():
        session_id = str(hash(event.raw_text + str(datetime.now())))
        pending_sessions[session_id] = {
            'user': event.sender_id,
            'date': datetime.now(),
            'status': 'pending'
        }

async def timeout_kicker():
    while True:
        now = datetime.now()
        to_delete = []
        for sid, data in pending_sessions.items():
            if data['status'] == 'pending':
                if (now - data['date']).total_seconds() > TIMEOUT:
                    to_delete.append(sid)
        for sid in to_delete:
            del pending_sessions[sid]
            print(f"[⏱️] Auto-kicked session {sid}")
        await asyncio.sleep(5)

# ========== FLASK ROUTES ==========
@app.route('/')
def dashboard():
    all_sessions = dict(pending_sessions)
    for sid in active_sessions:
        if sid not in all_sessions:
            all_sessions[sid] = {'user': 'system', 'date': datetime.now(), 'status': 'active'}
    return render_template_string(
        HTML,
        sessions=all_sessions,
        pending_count=len([s for s in pending_sessions.values() if s.get('status') == 'pending']),
        approved_count=len(active_sessions),
        total_sessions=len(pending_sessions) + len(active_sessions),
        timeout=TIMEOUT
    )

@app.route('/approve', methods=['POST'])
def approve():
    sid = request.json.get('session_id')
    if sid in pending_sessions:
        pending_sessions[sid]['status'] = 'approved'
        active_sessions.add(sid)
    return jsonify({'ok': True})

@app.route('/reject', methods=['POST'])
def reject():
    sid = request.json.get('session_id')
    pending_sessions.pop(sid, None)
    return jsonify({'ok': True})

@app.route('/kick', methods=['POST'])
def kick():
    sid = request.json.get('session_id')
    pending_sessions.pop(sid, None)
    active_sessions.discard(sid)
    return jsonify({'ok': True})

@app.route('/clear_all', methods=['POST'])
def clear_all():
    pending_sessions.clear()
    active_sessions.clear()
    return jsonify({'ok': True})

def run_flask():
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)

async def main():
    threading.Thread(target=run_flask, daemon=True).start()
    await client.start()
    print("[+] Master session started. Web interface: http://localhost:5000")
    asyncio.create_task(timeout_kicker())
    await client.run_until_disconnected()

if __name__ == '__main__':
    asyncio.run(main())
