const $ = id => document.getElementById(id);
let watching = null;
const IDLE = "Ders sekmesindeyken “Bu sekmeyi izle”ye bas.";

chrome.storage.sync.get({ studentNo: "", department: "", pageUrl: "", autoSubmit: true }, s => {
  $("no").value = s.studentNo;
  $("department").value = s.department;
  $("pageUrl").value = s.pageUrl;
  $("submit").checked = s.autoSubmit;
});
chrome.storage.session.get({ watching: null }, s => { watching = s.watching; render(); });

function render() {
  const btn = $("toggle"), st = $("status");
  btn.textContent = watching ? "İzlemeyi durdur" : "Bu sekmeyi izle";
  btn.className = watching ? "stop" : "";
  st.textContent = watching ? "İzleniyor: " + watching.title : IDLE;
  st.className = watching ? "on" : "";
}

const save = () => chrome.storage.sync.set({
  studentNo: $("no").value.trim(),
  department: $("department").value.trim(),
  pageUrl: $("pageUrl").value.trim(),
  autoSubmit: $("submit").checked
});
["no", "department", "pageUrl"].forEach(id => $(id).addEventListener("input", save));
$("submit").addEventListener("change", save);

$("toggle").addEventListener("click", async () => {
  const st = $("status");
  if (watching) {
    await chrome.runtime.sendMessage({ type: "stop" });
    watching = null; render(); return;
  }
  if (!$("no").value.trim()) { st.textContent = "Önce öğrenci numaranı yaz."; return; }
  await save();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  st.textContent = "Başlatılıyor…";
  try {
    const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id });
    const err = await chrome.runtime.sendMessage({ type: "start", tabId: tab.id, streamId });
    if (err) { st.textContent = err; st.className = ""; return; }
    watching = { tabId: tab.id, title: tab.title }; render();
  } catch (e) {
    st.textContent = "Bu sekme izlenemiyor: " + e.message;
  }
});
