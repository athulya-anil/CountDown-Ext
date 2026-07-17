const DEFAULT_ACCENT = '#7c6ef2';

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

function loadWidgetPos() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['widgetX', 'widgetY'], (data) => resolve(data));
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

function saveWidgetPos(x, y) {
  chrome.storage.local.set({ widgetX: x, widgetY: y });
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

function drawDonut(canvas, { progress, daysLeft, isExpired, placeholder }) {
  const dpr  = window.devicePixelRatio || 1;
  const size = Math.min(window.innerWidth * 0.14, 170);
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

// ── DOM refs ──────────────────────────────────────────────────────────────────

const canvas        = document.getElementById('donut');
const eventLabel    = document.getElementById('event-label');
const widget        = document.getElementById('countdown-widget');
const settingsBtn   = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const overlay       = document.getElementById('settings-overlay');
const dateInput     = document.getElementById('date-input');
const eventNameInput = document.getElementById('event-name-input');
const saveBtn       = document.getElementById('save-btn');
const cancelBtn     = document.getElementById('cancel-btn');
const bgInput       = document.getElementById('bg-input');
const removeBgBtn   = document.getElementById('remove-bg-btn');
const bgControls    = document.getElementById('bg-controls');
const bgSizeSelect  = document.getElementById('bg-size');
const bgPosSelect   = document.getElementById('bg-position');
const swatches      = document.querySelectorAll('.color-swatch');
const customColor   = document.getElementById('custom-color');

let currentSettings  = {};
let pendingBgDataUrl = null;
let removingBg       = false;
let selectedColor    = DEFAULT_ACCENT;

// ── Widget drag and drop ──────────────────────────────────────────────────────

let widgetX = 0;
let widgetY = 0;

function placeWidget(x, y) {
  const ww = widget.offsetWidth  || 170;
  const wh = widget.offsetHeight || 200;
  x = Math.max(0, Math.min(x, window.innerWidth  - ww));
  y = Math.max(0, Math.min(y, window.innerHeight - wh));
  widgetX = x;
  widgetY = y;
  widget.style.left = x + 'px';
  widget.style.top  = y + 'px';
}

function defaultWidgetPos() {
  const ww = widget.offsetWidth  || 170;
  const wh = widget.offsetHeight || 200;
  return {
    x: window.innerWidth  - ww - 72,
    y: (window.innerHeight - wh) / 2,
  };
}

(function initDrag() {
  let dragging   = false;
  let startMouseX, startMouseY, startWidgetX, startWidgetY;

  widget.addEventListener('mousedown', (e) => {
    if (settingsPanel.classList.contains('visible')) return;
    dragging    = true;
    startMouseX = e.clientX;
    startMouseY = e.clientY;
    startWidgetX = widgetX;
    startWidgetY = widgetY;
    widget.classList.add('dragging');
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startMouseX;
    const dy = e.clientY - startMouseY;
    placeWidget(startWidgetX + dx, startWidgetY + dy);
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    widget.classList.remove('dragging');
    saveWidgetPos(widgetX, widgetY);
  });
})();

// ── Render ────────────────────────────────────────────────────────────────────

function render(settings) {
  currentSettings = settings;
  const { targetDate, label, savedDate } = settings;

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
  const [settings, bgImage, pos] = await Promise.all([
    loadSettings(), loadBg(), loadWidgetPos(),
  ]);

  applyAccent(settings.accentColor);
  selectedColor = settings.accentColor || DEFAULT_ACCENT;
  render(settings);
  applyBackground(bgImage, settings.bgSize, settings.bgPosition);

  // Place widget after first render so offsetWidth is available
  requestAnimationFrame(() => {
    if (pos.widgetX != null && pos.widgetY != null) {
      placeWidget(pos.widgetX, pos.widgetY);
    } else {
      const d = defaultWidgetPos();
      placeWidget(d.x, d.y);
    }
  });
}

// ── Settings panel ────────────────────────────────────────────────────────────

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
  if (pendingBgDataUrl) applyBackground(pendingBgDataUrl, bgSizeSelect.value, bgPosSelect.value);
});

bgPosSelect.addEventListener('change', () => {
  if (pendingBgDataUrl) applyBackground(pendingBgDataUrl, bgSizeSelect.value, bgPosSelect.value);
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
  try {
    const date = dateInput.value;

    if (date) {
      await saveSettings({
        targetDate:  date,
        label:       eventNameInput.value.trim(),
        bgSize:      bgSizeSelect.value,
        bgPosition:  bgPosSelect.value,
        accentColor: selectedColor,
      });
    } else {
      await chrome.storage.sync.set({ accentColor: selectedColor });
    }

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
  } finally {
    closeSettings();
  }
});

window.addEventListener('resize', () => {
  render(currentSettings);
  const d = defaultWidgetPos();
  placeWidget(widgetX || d.x, widgetY || d.y);
});

init();
