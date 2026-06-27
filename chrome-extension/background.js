const RULESET_ID = 'block_distractions';
const STORAGE_KEY = 'apex_focus_active';
const ALARM_KEY   = 'apex_focus_end';

/* ── Enable / disable the blocking ruleset ─────── */
async function setFocusMode(active) {
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds:  active ? [RULESET_ID] : [],
      disableRulesetIds: active ? [] : [RULESET_ID],
    });
    await chrome.storage.local.set({ [STORAGE_KEY]: active });
    console.log('[APEX Focus]', active ? 'Focus mode ON' : 'Focus mode OFF');
  } catch (err) {
    console.error('[APEX Focus] setFocusMode error:', err);
  }
}

/* ── Alarm: auto-disable when session ends ─────── */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_KEY) {
    await setFocusMode(false);
    await chrome.storage.local.remove(['apex_focus_end_time', 'apex_focus_duration']);
  }
});

/* ── Message handler from popup ────────────────── */
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'START_FOCUS') {
    const minutes = msg.minutes ?? 25;
    setFocusMode(true).then(async () => {
      const endTime = Date.now() + minutes * 60 * 1000;
      await chrome.storage.local.set({
        apex_focus_end_time: endTime,
        apex_focus_duration: minutes,
      });
      await chrome.alarms.create(ALARM_KEY, { delayInMinutes: minutes });
      sendResponse({ ok: true, endTime });
    });
    return true;
  }

  if (msg.type === 'STOP_FOCUS') {
    setFocusMode(false).then(async () => {
      await chrome.alarms.clear(ALARM_KEY);
      await chrome.storage.local.remove(['apex_focus_end_time', 'apex_focus_duration']);
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === 'GET_STATE') {
    chrome.storage.local.get([STORAGE_KEY, 'apex_focus_end_time', 'apex_focus_duration'], (data) => {
      sendResponse({
        active:    !!data[STORAGE_KEY],
        endTime:   data.apex_focus_end_time ?? null,
        duration:  data.apex_focus_duration ?? 25,
      });
    });
    return true;
  }
});

/* ── Restore state on service worker restart ───── */
chrome.runtime.onStartup.addListener(async () => {
  const data = await chrome.storage.local.get([STORAGE_KEY, 'apex_focus_end_time']);
  const active = !!data[STORAGE_KEY];
  const endTime = data.apex_focus_end_time ?? 0;

  if (active && endTime > Date.now()) {
    const remaining = (endTime - Date.now()) / 60000;
    await setFocusMode(true);
    await chrome.alarms.create(ALARM_KEY, { delayInMinutes: remaining });
  } else if (active) {
    await setFocusMode(false);
    await chrome.storage.local.remove(['apex_focus_end_time', 'apex_focus_duration']);
  }
});
