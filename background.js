const COOLDOWN_MS = 5 * 60 * 1000;

const DEFAULTS = { studentNo: "", department: "", pageUrl: "", autoSubmit: true };
const getSettings = () => chrome.storage.sync.get(DEFAULTS);
const getState = () => chrome.storage.session.get({ watching: null, seen: [], cooldownUntil: 0 });

async function ensureOffscreen() {
  const ctx = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
  if (ctx.length) return;
  await chrome.offscreen.createDocument({
    url: "offscreen.html", reasons: ["USER_MEDIA"], justification: "Seçilen sekmedeki QR kodu okumak için"
  });
}

async function startWatching(tabId, streamId) {
  const { studentNo } = await getSettings();
  if (!studentNo) return "Önce öğrenci numaranı eklentiye kaydet.";
  try {
    await ensureOffscreen();
    const err = await chrome.runtime.sendMessage({ target: "offscreen", type: "start", streamId, tabId });
    if (err) return err;
  } catch (e) {
    return "İzleme başlatılamadı: " + e.message;
  }
  const tab = await chrome.tabs.get(tabId);
  await chrome.storage.session.set({ watching: { tabId, title: tab.title }, cooldownUntil: 0 });
  chrome.action.setBadgeText({ text: "ON" });
  chrome.action.setBadgeBackgroundColor({ color: "#2e7d32" });
  notify(`İzleniyor: ${tab.title}\nBu sekmeyi arka plana alabilirsin, kapatma.`);
  return "";
}

async function stopWatching(reason) {
  chrome.runtime.sendMessage({ target: "offscreen", type: "stop" }).catch(() => {});
  await chrome.storage.session.set({ watching: null });
  chrome.action.setBadgeText({ text: "" });
  if (reason) notify(reason);
}

function extractCode(u) {
  try {
    const p = new URL(u).searchParams;
    for (const [k, v] of p) if (/kod|code|aktiv|key/i.test(k)) return v;
  } catch {}
  return "";
}

async function handleQr(data) {
  const state = await getState();
  if (!state.watching || Date.now() < state.cooldownUntil || state.seen.includes(data)) return;
  const { studentNo, department, pageUrl, autoSubmit } = await getSettings();

  let url, code = "";
  if (/^https?:\/\//i.test(data)) {
    url = data; code = extractCode(data);
  } else if (/^[A-Za-z0-9-]{4,12}$/.test(data)) {
    if (!pageUrl) return notify(`QR'da sadece kod var (${data}). Eklentiye yoklama sayfasının adresini gir.`);
    url = pageUrl; code = data;
  } else {
    await chrome.storage.session.set({ seen: [...state.seen, data].slice(-50) });
    return notify(`QR okundu ama yoklama linki/kodu gibi görünmüyor: ${data.slice(0, 80)}`);
  }

  await chrome.storage.session.set({ seen: [...state.seen, data].slice(-50) });
  const tab = await chrome.tabs.create({ url, active: false });
  await waitForLoad(tab.id);

  let result = "Form doldurulamadı.";
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: fillForm,
      args: [studentNo, code, department, autoSubmit]
    });
    result = res?.result || result;
  } catch (e) {
    result = "Sayfaya erişilemedi: " + e.message;
  }
  if (result.startsWith("OK")) await chrome.storage.session.set({ cooldownUntil: Date.now() + COOLDOWN_MS });
  notify(result.replace(/^OK: /, ""));
}

function waitForLoad(tabId) {
  return new Promise(resolve => {
    const done = () => { chrome.tabs.onUpdated.removeListener(l); resolve(); };
    const l = (id, info) => id === tabId && info.status === "complete" && done();
    chrome.tabs.onUpdated.addListener(l);
    setTimeout(done, 20000);
  });
}

async function fillForm(studentNo, code, department, autoSubmit) {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const trMap = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" };
  const norm = s => (s || "").toLocaleLowerCase("tr").replace(/[çğıöşü]/g, c => trMap[c]).replace(/\s+/g, " ").trim();
  const clean = s => (s || "").replace(/[_\s]/g, "");
  const fire = (el, type) => el.dispatchEvent(new Event(type, { bubbles: true }));
  const $ = window.jQuery;

  const messages = [];
  window.alert = m => messages.push(String(m));

  const waitFor = async (fn, ms = 10000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) { const v = fn(); if (v) return v; await sleep(250); }
    return null;
  };

  const byLabel = (re, sel) => {
    for (const lbl of document.querySelectorAll("label")) {
      if (!re.test(norm(lbl.textContent))) continue;
      const el = (lbl.htmlFor && document.getElementById(lbl.htmlFor)) || lbl.parentElement?.querySelector(sel);
      if (el) return el;
    }
    return null;
  };

  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  async function typeInto(el, value) {
    el.focus();
    if (el.inputmask) el.inputmask.setValue(value);
    else if ($) $(el).val(value).trigger("input").trigger("keyup");
    else { setter.call(el, value); fire(el, "input"); }
    if (clean(el.value) !== value) {
      el.select();
      document.execCommand("insertText", false, value);
    }
    fire(el, "change");
    if ($) $(el).trigger("change").trigger("blur");
    el.blur();
    await sleep(400);
  }

  const noInput = await waitFor(() => byLabel(/ogrenci (numarasi|no)/, "input"));
  if (!noInput) return "Öğrenci Numarası kutusu bulunamadı. (Doğru sayfa açılmamış olabilir.)";
  await typeInto(noInput, studentNo);

  const nameInput = byLabel(/ad soyad/, "input");
  if (nameInput) await waitFor(() => nameInput.value.trim(), 6000);

  const codeInput = byLabel(/aktivasyon/, "input");
  if (codeInput) await waitFor(() => clean(codeInput.value), 3000);
  if (codeInput && !clean(codeInput.value)) {
    if (!code) return "Aktivasyon kodu boş ve QR'dan kod alınamadı. Açılan sekmeyi kontrol et.";
    await typeInto(codeInput, code);
  }

  const select = byLabel(/^ders$/, "select");
  if (select) {
    const realOpts = () => [...select.options].filter(o => o.value && !/seciniz/.test(norm(o.text)));
    await waitFor(() => realOpts().length, 6000);
    const opts = realOpts();
    const current = select.selectedOptions[0];
    const alreadyChosen = current && current.value && !/seciniz/.test(norm(current.text));
    if (opts.length && !alreadyChosen) {
      const pick = opts.length === 1 ? opts[0] :
                   department ? opts.find(o => norm(o.text).includes(norm(department))) : null;
      if (!pick) {
        return "Listede birden fazla seçenek var, eklentiye bölümünü yaz (örn. Yazılım). Listede olanlar: " +
               opts.map(o => o.text.trim()).join(", ");
      }
      select.disabled = false;
      select.value = pick.value;
      fire(select, "change");
      if ($) $(select).trigger("change");
      await sleep(300);
    }
  }

  if (!autoSubmit) return "OK: Form dolduruldu, açılan sekmeden DERSE KATIL'a bas.";
  const btn = [...document.querySelectorAll("button, a, input[type=submit]")]
    .find(b => /derse katil/.test(norm(b.textContent || b.value)));
  if (!btn) return "DERSE KATIL butonu bulunamadı.";
  btn.click();

  await sleep(2500);
  const shown = document.querySelector(".swal2-title, .swal2-html-container, .alert, .toast-body, .toast-message, .modal.show .modal-body");
  const feedback = (messages.join(" ") || shown?.textContent || "").replace(/\s+/g, " ").trim();
  if (/hata|gecersiz|geçersiz|bulunamad|basarisiz|başarısız|yanlis|yanlış|sure|süre/i.test(feedback)) {
    return "Sistem hata verdi: " + feedback.slice(0, 150);
  }
  return "OK: DERSE KATIL'a basıldı ✔" + (feedback ? " Sistem: " + feedback.slice(0, 150) : "");
}

function notify(message) {
  chrome.notifications.create({ type: "basic", iconUrl: "icon128.png", title: "QRAtt", message });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.target === "offscreen") return;
  if (msg.type === "start") { startWatching(msg.tabId, msg.streamId).then(sendResponse); return true; }
  if (msg.type === "stop") { stopWatching("İzleme durduruldu.").then(() => sendResponse()); return true; }
  if (msg.type === "stopped") stopWatching(msg.reason);
  if (msg.type === "qr") handleQr(msg.data);
});

chrome.commands.onCommand.addListener(async (cmd, tab) => {
  if (cmd !== "watch-tab" || !tab) return;
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id });
  const err = await startWatching(tab.id, streamId);
  if (err) notify(err);
});

chrome.tabs.onRemoved.addListener(async id => {
  const { watching } = await getState();
  if (watching?.tabId === id) stopWatching("İzlenen sekme kapandı, izleme durdu.");
});
