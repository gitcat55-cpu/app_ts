// ─── STATE ───────────────────────────────────────────────────────────────────
const state = {
    bots: [],
    users: 0,
    actions: 0,
    activeBotId: null,
    startTime: Date.now(),
    logs: []
};

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    addLog('INFO', 'BotMC بدأ التشغيل');
    addLog('INFO', 'جاهز لاستقبال البوتات');
    updateStats();
    startUptimeClock();
    simulateUsers();
});

// ─── SCREENS ─────────────────────────────────────────────────────────────────
function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    const screen = document.getElementById(`${name}-screen`);
    if (screen) screen.classList.remove('hidden');

    const btn = document.querySelector(`[data-screen="${name}"]`);
    if (btn) btn.classList.add('active');

    if (name === 'bots') renderBots();
    if (name === 'stats') updateStats();
    if (name === 'logs') scrollLogsToBottom();
}

// ─── MODALS ───────────────────────────────────────────────────────────────────
function openAddBotModal() {
    document.getElementById('bot-name').value = '';
    document.getElementById('bot-host').value = '';
    document.getElementById('bot-port').value = '25565';
    document.getElementById('bot-edition').value = 'java';
    selectEdition('java');
    document.getElementById('add-bot-modal').classList.add('show');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('show');
}

function selectEdition(edition) {
    document.getElementById('bot-edition').value = edition;
    document.getElementById('java-btn').classList.toggle('active', edition === 'java');
    document.getElementById('bedrock-btn').classList.toggle('active', edition === 'bedrock');
}

// ─── BOT LOGIC ────────────────────────────────────────────────────────────────
function addBot() {
    const name    = document.getElementById('bot-name').value.trim();
    const host    = document.getElementById('bot-host').value.trim();
    const port    = document.getElementById('bot-port').value.trim() || '25565';
    const edition = document.getElementById('bot-edition').value;

    if (!name) { showToast('أدخل اسم البوت', 'error'); return; }
    if (!host) { showToast('أدخل عنوان السيرفر', 'error'); return; }

    const bot = {
        id: Date.now(),
        name,
        host,
        port,
        edition,
        online: false,
        createdAt: new Date().toLocaleTimeString('ar-SA')
    };

    state.bots.push(bot);
    addLog('SUCCESS', `تم إضافة البوت: ${name} → ${host}:${port}`);
    addEvent(`تم إضافة البوت ${name}`);
    closeModal('add-bot-modal');
    showToast(`تم إضافة ${name} بنجاح`, 'success');
    updateStats();
    renderBots();
}

function removeBot(id) {
    const bot = state.bots.find(b => b.id === id);
    if (!bot) return;
    state.bots = state.bots.filter(b => b.id !== id);
    addLog('WARN', `تم حذف البوت: ${bot.name}`);
    addEvent(`تم حذف البوت ${bot.name}`);
    showToast(`تم حذف ${bot.name}`, 'error');
    updateStats();
    renderBots();
}

function toggleConnect(id) {
    const bot = state.bots.find(b => b.id === id);
    if (!bot) return;
    bot.online = !bot.online;
    if (bot.online) {
        addLog('SUCCESS', `${bot.name} اتصل بـ ${bot.host}:${bot.port}`);
        addEvent(`${bot.name} اتصل بالسيرفر`);
        showToast(`${bot.name} متصل الآن ✅`, 'success');
        state.actions++;
    } else {
        addLog('WARN', `${bot.name} قطع الاتصال`);
        addEvent(`${bot.name} قطع الاتصال`);
        showToast(`${bot.name} غير متصل`, 'error');
    }
    updateStats();
    renderBots();
}

function connectAll() {
    state.bots.forEach(b => {
        if (!b.online) {
            b.online = true;
            addLog('SUCCESS', `${b.name} اتصل (توصيل الكل)`);
            state.actions++;
        }
    });
    addEvent('تم توصيل جميع البوتات');
    showToast('تم توصيل جميع البوتات', 'success');
    updateStats();
    renderBots();
}

function disconnectAll() {
    state.bots.forEach(b => { b.online = false; });
    addLog('WARN', 'تم قطع جميع البوتات');
    addEvent('تم قطع اتصال جميع البوتات');
    showToast('تم قطع جميع البوتات', 'error');
    updateStats();
    renderBots();
}

// ─── CONTROL MODAL ────────────────────────────────────────────────────────────
function openControl(id) {
    const bot = state.bots.find(b => b.id === id);
    if (!bot) return;
    state.activeBotId = id;
    document.getElementById('control-bot-name').textContent = bot.name;
    document.getElementById('control-bot-server').textContent = `${bot.host}:${bot.port} (${bot.edition})`;
    const btn = document.getElementById('connect-btn');
    btn.textContent = bot.online ? 'قطع الاتصال' : 'اتصال';
    btn.className = 'button ' + (bot.online ? 'destructive' : 'primary');
    document.getElementById('bot-control-modal').classList.add('show');
}

function toggleBotConnect() {
    if (!state.activeBotId) return;
    toggleConnect(state.activeBotId);
    const bot = state.bots.find(b => b.id === state.activeBotId);
    if (!bot) return;
    const btn = document.getElementById('connect-btn');
    btn.textContent = bot.online ? 'قطع الاتصال' : 'اتصال';
    btn.className = 'button ' + (bot.online ? 'destructive' : 'primary');
}

function removeBotControl() {
    if (!state.activeBotId) return;
    removeBot(state.activeBotId);
    closeModal('bot-control-modal');
    state.activeBotId = null;
}

function sendAction(action) {
    const bot = state.bots.find(b => b.id === state.activeBotId);
    if (!bot) return;
    if (!bot.online) { showToast('البوت غير متصل!', 'error'); return; }
    const labels = { forward:'تقدم', back:'تراجع', left:'يسار', right:'يمين', jump:'قفز', attack:'هجوم', use:'استخدام', sneak:'زحف', stop:'توقف' };
    const label = labels[action] || action;
    addLog('INFO', `${bot.name} ← ${label}`);
    state.actions++;
    showToast(`${bot.name}: ${label}`, 'success');
    updateStats();
}

function sendChat() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;
    const bot = state.bots.find(b => b.id === state.activeBotId);
    if (!bot) return;
    if (!bot.online) { showToast('البوت غير متصل!', 'error'); return; }
    addLog('INFO', `${bot.name} أرسل: ${msg}`);
    addEvent(`${bot.name}: ${msg}`);
    state.actions++;
    showToast('تم الإرسال', 'success');
    input.value = '';
    updateStats();
}

// ─── RENDER BOTS ─────────────────────────────────────────────────────────────
function renderBots() {
    const container = document.getElementById('bots-list');
    if (state.bots.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🤖</div>
                <p>لا يوجد بوتات بعد</p>
                <button class="button primary" onclick="openAddBotModal()">إضافة بوت</button>
            </div>`;
        return;
    }

    container.innerHTML = state.bots.map(bot => `
        <div class="bot-card">
            <div class="bot-avatar-small">🤖</div>
            <div class="bot-card-info">
                <div class="bot-card-name">${escHtml(bot.name)}</div>
                <div class="bot-card-server">${escHtml(bot.host)}:${escHtml(bot.port)}</div>
                <div class="bot-card-meta">
                    <span class="tag ${bot.edition}">${bot.edition === 'java' ? 'Java' : 'Bedrock'}</span>
                    <span class="tag ${bot.online ? 'online' : 'offline'}">${bot.online ? '● متصل' : '○ غير متصل'}</span>
                </div>
            </div>
            <div class="bot-card-actions">
                <button class="button ${bot.online ? 'destructive' : 'primary'} small" onclick="toggleConnect(${bot.id})">
                    ${bot.online ? 'قطع' : 'توصيل'}
                </button>
                <button class="button secondary small" onclick="openControl(${bot.id})">
                    <span class="material-symbols-outlined" style="font-size:14px">gamepad</span>
                    تحكم
                </button>
            </div>
        </div>
    `).join('');
}

// ─── STATS ────────────────────────────────────────────────────────────────────
function updateStats() {
    const total   = state.bots.length;
    const online  = state.bots.filter(b => b.online).length;
    const users   = state.users;
    const actions = state.actions;
    const java    = state.bots.filter(b => b.edition === 'java').length;
    const bedrock = state.bots.filter(b => b.edition === 'bedrock').length;

    setText('home-bot-count',    total);
    setText('home-online-count', online);
    setText('home-user-count',   users);
    setText('home-action-count', actions);

    setText('stat-total-bots', total);
    setText('stat-online-bots', online);
    setText('stat-users',      users);
    setText('stat-actions',    actions);

    setWidth('bar-bots',    total   ? 100 : 0);
    setWidth('bar-online',  total   ? (online / total) * 100 : 0);
    setWidth('bar-users',   users   ? Math.min(users * 10, 100) : 0);
    setWidth('bar-actions', actions ? Math.min(actions * 5, 100) : 0);

    setText('java-count',    java);
    setText('bedrock-count', bedrock);
    setWidth('java-bar',    total ? (java / total) * 100 : 0);
    setWidth('bedrock-bar', total ? (bedrock / total) * 100 : 0);
}

// ─── LOGS ─────────────────────────────────────────────────────────────────────
function addLog(level, msg) {
    const time = new Date().toLocaleTimeString('en-GB');
    state.logs.push({ level, msg, time });

    const container = document.getElementById('logs-container');
    const entry = document.createElement('div');
    entry.className = `log-entry`;
    entry.innerHTML = `
        <span class="log-time">${time}</span>
        <span class="log-tag ${level}">${level}</span>
        <span class="log-msg">${escHtml(msg)}</span>
    `;
    container.appendChild(entry);
    scrollLogsToBottom();
}

function clearLogs() {
    state.logs = [];
    document.getElementById('logs-container').innerHTML = '';
    addLog('INFO', 'تم مسح السجلات');
    showToast('تم مسح السجلات', 'success');
}

function exportLogs() {
    const text = state.logs.map(l => `[${l.time}] [${l.level}] ${l.msg}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `BotMC_logs_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير السجلات', 'success');
}

function scrollLogsToBottom() {
    const c = document.getElementById('logs-container');
    if (c) c.scrollTop = c.scrollHeight;
}

// ─── EVENTS ───────────────────────────────────────────────────────────────────
function addEvent(msg) {
    const container = document.getElementById('recent-events');
    const noEvents  = container.querySelector('.no-events');
    if (noEvents) noEvents.remove();

    const time  = new Date().toLocaleTimeString('en-GB');
    const entry = document.createElement('div');
    entry.className = 'event-item';
    entry.innerHTML = `<span class="event-time">${time}</span><span>${escHtml(msg)}</span>`;
    container.insertBefore(entry, container.firstChild);

    const entries = container.querySelectorAll('.event-item');
    if (entries.length > 6) entries[entries.length - 1].remove();
}

// ─── UPTIME ───────────────────────────────────────────────────────────────────
function startUptimeClock() {
    setInterval(() => {
        const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
        const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
        const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
        const s = String(elapsed % 60).padStart(2, '0');
        const el = document.getElementById('uptime-display');
        if (el) el.textContent = `${h}:${m}:${s}`;
    }, 1000);
}

function simulateUsers() {
    state.users = Math.floor(Math.random() * 5) + 1;
    updateStats();
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
let toastTimeout;
function showToast(msg, type = '') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `toast show ${type}`;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function setWidth(id, pct) {
    const el = document.getElementById(id);
    if (el) el.style.width = `${Math.round(pct)}%`;
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Close modal on outside click
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
        if (e.target === modal) modal.classList.remove('show');
    });
});
