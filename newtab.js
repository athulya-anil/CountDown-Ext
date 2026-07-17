// ── Storage ──────────────────────────────────────────────────────────────────

function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['targetDate', 'label', 'savedDate'], (data) => {
      resolve(data);
    });
  });
}

function saveSettings(targetDate, label) {
  const savedDate = toDateStr(new Date());
  return new Promise((resolve) => {
    chrome.storage.sync.set({ targetDate, label, savedDate }, resolve);
  });
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function daysBetween(a, b) {
  const MS_PER_DAY = 86400000;
  return Math.round((b - a) / MS_PER_DAY);
}

function computeCountdown(targetDateStr, savedDateStr) {
  const today = parseLocalDate(toDateStr(new Date()));
  const target = parseLocalDate(targetDateStr);
  const start = savedDateStr ? parseLocalDate(savedDateStr) : today;

  const daysLeft = daysBetween(today, target);
  const totalDays = daysBetween(start, target);
  const elapsed = totalDays - daysLeft;
  const progress = totalDays > 0 ? Math.min(elapsed / totalDays, 1) : 1;

  return { daysLeft, totalDays, progress, isExpired: daysLeft < 0 };
}

// ── Canvas donut ──────────────────────────────────────────────────────────────

const ACCENT      = '#7c6ef2';
const ACCENT_DONE = '#4caf82';
const TRACK       = '#2a2a38';
const TEXT_MAIN   = '#e8e8f0';
const TEXT_MUTED  = '#7a7a90';

function drawDonut(canvas, { progress, daysLeft, isExpired, placeholder }) {
  const dpr  = window.devicePixelRatio || 1;
  const size = Math.min(window.innerWidth * 0.28, 260);
  canvas.style.width  = size + 'px';
  canvas.style.height = size + 'px';
  canvas.width  = size * dpr;
  canvas.height = size * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const cx = size / 2;
  const cy = size / 2;
  const r  = size * 0.38;
  const lw = size * 0.09;

  ctx.clearRect(0, 0, size, size);

  // Track
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = TRACK;
  ctx.lineWidth   = lw;
  ctx.lineCap     = 'round';
  ctx.stroke();

  // Progress arc
  if (!placeholder) {
    const startAngle = -Math.PI / 2;
    const endAngle   = startAngle + progress * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.strokeStyle = isExpired ? ACCENT_DONE : ACCENT;
    ctx.lineWidth   = lw;
    ctx.lineCap     = 'round';
    ctx.stroke();
  }

  // Center text
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  if (placeholder) {
    ctx.font      = `500 ${size * 0.11}px -apple-system, sans-serif`;
    ctx.fillStyle = TEXT_MUTED;
    ctx.fillText('Set a date', cx, cy - size * 0.06);
    ctx.font      = `400 ${size * 0.075}px -apple-system, sans-serif`;
    ctx.fillText('to begin', cx, cy + size * 0.08);
    return;
  }

  if (isExpired) {
    ctx.font      = `600 ${size * 0.13}px -apple-system, sans-serif`;
    ctx.fillStyle = ACCENT_DONE;
    ctx.fillText('Done!', cx, cy);
    return;
  }

  const numStr = String(Math.abs(daysLeft));
  const numSize = numStr.length > 3 ? size * 0.16 : size * 0.22;
  ctx.font      = `700 ${numSize}px -apple-system, sans-serif`;
  ctx.fillStyle = TEXT_MAIN;
  ctx.fillText(numStr, cx, cy - size * 0.05);

  ctx.font      = `400 ${size * 0.09}px -apple-system, sans-serif`;
  ctx.fillStyle = TEXT_MUTED;
  ctx.fillText(daysLeft === 1 ? 'day' : 'days', cx, cy + size * 0.13);
}

// ── Render ────────────────────────────────────────────────────────────────────

const canvas      = document.getElementById('donut');
const eventLabel  = document.getElementById('event-label');
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const overlay     = document.getElementById('settings-overlay');
const dateInput   = document.getElementById('date-input');
const nameInput   = document.getElementById('event-name-input');
const saveBtn     = document.getElementById('save-btn');
const cancelBtn   = document.getElementById('cancel-btn');

let currentSettings = {};

function render(settings) {
  currentSettings = settings;
  const { targetDate, label, savedDate } = settings;

  if (!targetDate) {
    drawDonut(canvas, { placeholder: true });
    eventLabel.textContent = 'Click the gear to set a countdown';
    return;
  }

  const countdown = computeCountdown(targetDate, savedDate);
  drawDonut(canvas, countdown);

  if (countdown.isExpired) {
    eventLabel.textContent = label ? `${label} — arrived!` : 'The day has come!';
  } else {
    const until = countdown.daysLeft === 1 ? 'tomorrow' : `in ${countdown.daysLeft} days`;
    eventLabel.textContent = label ? `${label} — ${until}` : until;
  }
}

async function init() {
  const settings = await loadSettings();
  render(settings);
}

// ── Settings panel ────────────────────────────────────────────────────────────

function openSettings() {
  dateInput.value = currentSettings.targetDate || '';
  nameInput.value = currentSettings.label || '';
  settingsPanel.classList.remove('hidden');
  overlay.classList.remove('hidden');
  // Trigger transition
  requestAnimationFrame(() => {
    settingsPanel.classList.add('visible');
  });
}

function closeSettings() {
  settingsPanel.classList.remove('visible');
  setTimeout(() => {
    settingsPanel.classList.add('hidden');
    overlay.classList.add('hidden');
  }, 200);
}

settingsBtn.addEventListener('click', openSettings);
overlay.addEventListener('click', closeSettings);
cancelBtn.addEventListener('click', closeSettings);

saveBtn.addEventListener('click', async () => {
  const date  = dateInput.value;
  const label = nameInput.value.trim();
  if (!date) return;
  await saveSettings(date, label);
  const settings = await loadSettings();
  render(settings);
  closeSettings();
});

// ── Search form ───────────────────────────────────────────────────────────────

document.getElementById('search-form').addEventListener('submit', (e) => {
  // Native form action handles the navigation; nothing extra needed
});

// ── Resize ────────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  render(currentSettings);
});

// ── Boot ──────────────────────────────────────────────────────────────────────

init();
