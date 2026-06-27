const CIRC = 351.86; // 2 * Math.PI * 56

let selectedMinutes = 25;
let tickInterval    = null;
let isActive        = false;
let endTime         = null;

/* ── DOM refs ─────────────────────────────────── */
const timerDigits  = document.getElementById('timerDigits');
const timerLabel   = document.getElementById('timerLabel');
const statusBadge  = document.getElementById('statusBadge');
const statusText   = document.getElementById('statusText');
const ctaBtn       = document.getElementById('ctaBtn');
const ringFill     = document.getElementById('ringFill');
const durationGrid = document.getElementById('durationGrid');

/* ── Helpers ──────────────────────────────────── */
function pad(n) { return String(n).padStart(2, '0'); }

function formatTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${pad(m)}:${pad(s)}`;
}

function setRing(fraction) {
  const offset = CIRC * (1 - Math.min(1, Math.max(0, fraction)));
  ringFill.style.strokeDashoffset = offset;
}

function setActiveUI(active, minutesDuration) {
  isActive = active;
  if (active) {
    statusBadge.className = 'status-badge on';
    statusText.textContent = 'Focus Mode Active';
    ctaBtn.className = 'cta-btn stop';
    ctaBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/>
      </svg>
      End Session`;
    durationGrid.style.opacity = '0.35';
    durationGrid.style.pointerEvents = 'none';
    timerLabel.textContent = 'Remaining';
  } else {
    statusBadge.className = 'status-badge off';
    statusText.textContent = 'Focus Mode Off';
    ctaBtn.className = 'cta-btn start';
    ctaBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
      Start Focus Session`;
    durationGrid.style.opacity = '';
    durationGrid.style.pointerEvents = '';
    timerDigits.textContent = `${pad(minutesDuration ?? selectedMinutes)}:00`;
    timerLabel.textContent = 'Ready';
    setRing(0);
  }
}

function tick() {
  if (!endTime) return;
  const remaining = endTime - Date.now();
  const total     = selectedMinutes * 60 * 1000;

  timerDigits.textContent = formatTime(remaining);
  setRing(remaining / total);

  if (remaining <= 0) {
    clearInterval(tickInterval);
    tickInterval = null;
    setActiveUI(false, selectedMinutes);
    timerDigits.textContent = 'Done!';
    timerLabel.textContent  = 'Session complete';
    setRing(1);
  }
}

/* ── Duration buttons ─────────────────────────── */
durationGrid.querySelectorAll('.dur-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (isActive) return;
    durationGrid.querySelectorAll('.dur-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    selectedMinutes = parseInt(btn.dataset.min, 10);
    timerDigits.textContent = `${pad(selectedMinutes)}:00`;
    setRing(0);
  });
});

/* ── CTA button ───────────────────────────────── */
ctaBtn.addEventListener('click', () => {
  if (isActive) {
    chrome.runtime.sendMessage({ type: 'STOP_FOCUS' }, () => {
      clearInterval(tickInterval);
      tickInterval = null;
      endTime      = null;
      setActiveUI(false, selectedMinutes);
    });
  } else {
    chrome.runtime.sendMessage({ type: 'START_FOCUS', minutes: selectedMinutes }, (res) => {
      if (res?.ok) {
        endTime = res.endTime;
        setActiveUI(true, selectedMinutes);
        clearInterval(tickInterval);
        tickInterval = setInterval(tick, 500);
        tick();
      }
    });
  }
});

/* ── Init: restore state ──────────────────────── */
chrome.runtime.sendMessage({ type: 'GET_STATE' }, (state) => {
  if (!state) return;

  if (state.active && state.endTime && state.endTime > Date.now()) {
    selectedMinutes = state.duration ?? 25;
    endTime         = state.endTime;
    setActiveUI(true, selectedMinutes);
    clearInterval(tickInterval);
    tickInterval = setInterval(tick, 500);
    tick();
  } else {
    setActiveUI(false, selectedMinutes);
    setRing(0);
  }
});
