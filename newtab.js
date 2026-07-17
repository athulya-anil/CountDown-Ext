const DEFAULT_ACCENT = '#7c6ef2';

const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Act as if what you do makes a difference. It does.", author: "William James" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Hardships often prepare ordinary people for an extraordinary destiny.", author: "C.S. Lewis" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
  { text: "Dream big and dare to fail.", author: "Norman Vaughan" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "Spread love everywhere you go.", author: "Mother Teresa" },
  { text: "Do not go where the path may lead; go instead where there is no path and leave a trail.", author: "Ralph Waldo Emerson" },
  { text: "You will face many defeats in life, but never let yourself be defeated.", author: "Maya Angelou" },
  { text: "In the end, it's not the years in your life that count. It's the life in your years.", author: "Abraham Lincoln" },
  { text: "Never let the fear of striking out keep you from playing the game.", author: "Babe Ruth" },
  { text: "Life is either a daring adventure or nothing at all.", author: "Helen Keller" },
  { text: "Many of life's failures are people who did not realize how close they were to success when they gave up.", author: "Thomas Edison" },
  { text: "What you get by achieving your goals is not as important as what you become by achieving your goals.", author: "Henry David Thoreau" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { text: "It's not whether you get knocked down, it's whether you get up.", author: "Vince Lombardi" },
  { text: "The most common way people give up their power is by thinking they don't have any.", author: "Alice Walker" },
  { text: "You must be the change you wish to see in the world.", author: "Mahatma Gandhi" },
  { text: "The journey of a thousand miles begins with one step.", author: "Lao Tzu" },
];

function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      ['targetDate', 'label', 'savedDate', 'bgSize', 'bgPosition', 'accentColor', 'userName'],
      resolve
    );
  });
}

function loadBg() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['bgImage'], (data) => resolve(data.bgImage || null));
  });
}

function saveSettings(fields) {
  const savedDate = toDateStr(new Date());
  return new Promise((resolve) => {
    chrome.storage.sync.set({ ...fields, savedDate }, resolve);
  });
}

function saveBg(dataUrl) {
  return new Promise((resolve) => chrome.storage.local.set({ bgImage: dataUrl }, resolve));
}

function removeBg() {
  return new Promise((resolve) => chrome.storage.local.remove('bgImage', resolve));
}

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function daysBetween(a, b) {
  return Math.round((b - a) / 86400000);
}

function computeCountdown(targetDateStr, savedDateStr) {
  const today  = parseLocalDate(toDateStr(new Date()));
  const target = parseLocalDate(targetDateStr);
  const start  = savedDateStr ? parseLocalDate(savedDateStr) : today;
  const daysLeft  = daysBetween(today, target);
  const totalDays = daysBetween(start, target);
  const elapsed   = totalDays - daysLeft;
  const progress  = totalDays > 0 ? Math.min(elapsed / totalDays, 1) : 1;
  return { daysLeft, totalDays, progress, isExpired: daysLeft < 0 };
}

function getAccent() {
  return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || DEFAULT_ACCENT;
}

function applyAccent(color) {
  const c = color || DEFAULT_ACCENT;
  document.documentElement.style.setProperty('--accent', c);
  document.documentElement.style.setProperty('--accent-light', lighten(c, 0.15));
}

function lighten(hex, amount) {
  const h = hex.replace('#', '');
  const num = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * amount));
  const g = Math.min(255, ((num >> 8)  & 0xff) + Math.round(255 * amount));
  const b = Math.min(255, ( num        & 0xff) + Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function applyBackground(bgImage, bgSize, bgPosition) {
  if (bgImage) {
    document.body.style.backgroundImage    = `url(${bgImage})`;
    document.body.style.backgroundSize     = bgSize     || 'cover';
    document.body.style.backgroundPosition = bgPosition || 'center';
    document.body.classList.add('has-bg');
  } else {
    document.body.style.backgroundImage = '';
    document.body.classList.remove('has-bg');
  }
}

function updateClock() {
  const now  = new Date();
  let h      = now.getHours();
  const m    = String(now.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  clockEl.textContent = `${h}:${m}`;
}

function getGreeting(name) {
  const h = new Date().getHours();
  let part = 'Good evening';
  if (h >= 5  && h < 12) part = 'Good morning';
  else if (h >= 12 && h < 17) part = 'Good afternoon';
  return name ? `${part}, ${name}.` : `${part}.`;
}

function getDailyQuote() {
  const start   = new Date(new Date().getFullYear(), 0, 0);
  const dayOfYear = Math.floor((Date.now() - start) / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
}

function drawDonut(canvas, { progress, daysLeft, isExpired, placeholder }) {
  const dpr  = window.devicePixelRatio || 1;
  const size = Math.min(window.innerWidth * 0.22, 220);
  canvas.style.width  = size + 'px';
  canvas.style.height = size + 'px';
  canvas.width  = size * dpr;
  canvas.height = size * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, size, size);

  const cx = size / 2, cy = size / 2;
  const r  = size * 0.38;
  const lw = size * 0.08;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth   = lw;
  ctx.lineCap     = 'round';
  ctx.stroke();

  if (!placeholder) {
    const startAngle = -Math.PI / 2;
    const endAngle   = startAngle + progress * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.strokeStyle = isExpired ? '#4caf82' : getAccent();
    ctx.lineWidth   = lw;
    ctx.lineCap     = 'round';
    ctx.stroke();
  }

  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  if (placeholder) {
    ctx.font      = `400 ${size * 0.1}px -apple-system, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText('Set a date', cx, cy - size * 0.06);
    ctx.font      = `400 ${size * 0.073}px -apple-system, sans-serif`;
    ctx.fillText('to begin', cx, cy + size * 0.09);
    return;
  }

  if (isExpired) {
    ctx.font      = `600 ${size * 0.13}px -apple-system, sans-serif`;
    ctx.fillStyle = '#4caf82';
    ctx.fillText('Done!', cx, cy);
    return;
  }

  const numStr  = String(Math.abs(daysLeft));
  const numSize = numStr.length > 3 ? size * 0.16 : size * 0.22;
  ctx.font      = `700 ${numSize}px -apple-system, sans-serif`;
  ctx.fillStyle = '#fff';
  ctx.fillText(numStr, cx, cy - size * 0.05);
  ctx.font      = `300 ${size * 0.09}px -apple-system, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText(daysLeft === 1 ? 'day' : 'days', cx, cy + size * 0.14);
}

const clockEl      = document.getElementById('clock');
const greetingEl   = document.getElementById('greeting');
const canvas       = document.getElementById('donut');
const eventLabel   = document.getElementById('event-label');
const quoteTextEl  = document.getElementById('quote-text');
const settingsBtn  = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const overlay      = document.getElementById('settings-overlay');
const nameInput    = document.getElementById('name-input');
const dateInput    = document.getElementById('date-input');
const eventNameInput = document.getElementById('event-name-input');
const saveBtn      = document.getElementById('save-btn');
const cancelBtn    = document.getElementById('cancel-btn');
const bgInput      = document.getElementById('bg-input');
const removeBgBtn  = document.getElementById('remove-bg-btn');
const bgControls   = document.getElementById('bg-controls');
const bgSizeSelect = document.getElementById('bg-size');
const bgPosSelect  = document.getElementById('bg-position');
const swatches     = document.querySelectorAll('.color-swatch');
const customColor  = document.getElementById('custom-color');

let currentSettings  = {};
let pendingBgDataUrl = null;
let removingBg       = false;
let selectedColor    = DEFAULT_ACCENT;

function render(settings) {
  currentSettings = settings;
  const { targetDate, label, savedDate, userName } = settings;

  greetingEl.textContent = getGreeting(userName);

  if (!targetDate) {
    drawDonut(canvas, { placeholder: true });
    eventLabel.textContent = 'Click the settings button to add your goal date';
    return;
  }

  const countdown = computeCountdown(targetDate, savedDate);
  drawDonut(canvas, countdown);

  if (countdown.isExpired) {
    eventLabel.textContent = label ? `${label} — you made it!` : 'The day has come!';
  } else {
    const until = countdown.daysLeft === 1 ? 'tomorrow' : `in ${countdown.daysLeft} days`;
    eventLabel.textContent = label ? `${label} — ${until}` : until;
  }
}

async function init() {
  const [settings, bgImage] = await Promise.all([loadSettings(), loadBg()]);
  applyAccent(settings.accentColor);
  selectedColor = settings.accentColor || DEFAULT_ACCENT;
  render(settings);
  applyBackground(bgImage, settings.bgSize, settings.bgPosition);

  const quote = getDailyQuote();
  quoteTextEl.textContent = `"${quote.text}" — ${quote.author}`;

  updateClock();
  setInterval(() => {
    updateClock();
    greetingEl.textContent = getGreeting(currentSettings.userName);
  }, 30000);
}

function showBgControls(show) {
  bgControls.classList.toggle('hidden', !show);
  removeBgBtn.classList.toggle('hidden', !show);
}

function setActiveColor(color) {
  selectedColor = color;
  swatches.forEach(s => s.classList.toggle('active', s.dataset.color === color));
  const isPreset = [...swatches].some(s => s.dataset.color === color);
  customColor.classList.toggle('active', !isPreset);
  applyAccent(color);
  render(currentSettings);
}

function openSettings() {
  pendingBgDataUrl = null;
  removingBg = false;
  nameInput.value      = currentSettings.userName || '';
  dateInput.value      = currentSettings.targetDate || '';
  eventNameInput.value = currentSettings.label || '';
  bgSizeSelect.value   = currentSettings.bgSize || 'cover';
  bgPosSelect.value    = currentSettings.bgPosition || 'center';

  const savedColor = currentSettings.accentColor || DEFAULT_ACCENT;
  customColor.value = savedColor;
  setActiveColor(savedColor);

  loadBg().then((bgImage) => showBgControls(!!bgImage));

  settingsPanel.classList.remove('hidden');
  overlay.classList.remove('hidden');
  requestAnimationFrame(() => settingsPanel.classList.add('visible'));
}

function closeSettings() {
  settingsPanel.classList.remove('visible');
  setTimeout(() => {
    settingsPanel.classList.add('hidden');
    overlay.classList.add('hidden');
  }, 200);
}

swatches.forEach(s => s.addEventListener('click', () => setActiveColor(s.dataset.color)));
customColor.addEventListener('input', () => setActiveColor(customColor.value));

bgInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    pendingBgDataUrl = ev.target.result;
    removingBg = false;
    showBgControls(true);
    applyBackground(pendingBgDataUrl, bgSizeSelect.value, bgPosSelect.value);
  };
  reader.readAsDataURL(file);
});

bgSizeSelect.addEventListener('change', () => {
  const src = pendingBgDataUrl || null;
  if (src) applyBackground(src, bgSizeSelect.value, bgPosSelect.value);
});

bgPosSelect.addEventListener('change', () => {
  const src = pendingBgDataUrl || null;
  if (src) applyBackground(src, bgSizeSelect.value, bgPosSelect.value);
});

removeBgBtn.addEventListener('click', () => {
  removingBg = true;
  pendingBgDataUrl = null;
  showBgControls(false);
  applyBackground(null);
});

settingsBtn.addEventListener('click', openSettings);
overlay.addEventListener('click', closeSettings);
cancelBtn.addEventListener('click', closeSettings);

saveBtn.addEventListener('click', async () => {
  const date = dateInput.value;
  if (!date) return;

  await saveSettings({
    targetDate:  date,
    label:       eventNameInput.value.trim(),
    userName:    nameInput.value.trim(),
    bgSize:      bgSizeSelect.value,
    bgPosition:  bgPosSelect.value,
    accentColor: selectedColor,
  });

  if (removingBg) {
    await removeBg();
    applyBackground(null);
  } else if (pendingBgDataUrl) {
    await saveBg(pendingBgDataUrl);
    applyBackground(pendingBgDataUrl, bgSizeSelect.value, bgPosSelect.value);
  } else {
    const bgImage = await loadBg();
    applyBackground(bgImage, bgSizeSelect.value, bgPosSelect.value);
  }

  const settings = await loadSettings();
  render(settings);
  closeSettings();
});

document.getElementById('search-form').addEventListener('submit', () => {});
window.addEventListener('resize', () => render(currentSettings));

init();
