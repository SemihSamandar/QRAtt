let stream = null, video = null, timer = null, tabId = null;
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.target !== "offscreen") return;
  if (msg.type === "start") { start(msg.streamId, msg.tabId).then(sendResponse); return true; }
  if (msg.type === "stop") stop(false);
});

async function start(streamId, id) {
  stop(true);
  tabId = id;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: streamId, maxWidth: 1920, maxHeight: 1080 } }
    });
  } catch (e) {
    return "Sekme görüntüsü alınamadı: " + e.message;
  }
  video = document.createElement("video");
  video.muted = true;
  video.srcObject = stream;
  await video.play();
  stream.getVideoTracks()[0].onended = () => stop(false);
  timer = setInterval(scan, 2000);
  return "";
}

function stop(silent) {
  clearInterval(timer);
  timer = null;
  stream?.getTracks().forEach(t => t.stop());
  stream = null;
  if (!silent) chrome.runtime.sendMessage({ type: "stopped", reason: "Sekme izlemesi durdu." });
}

function scan() {
  if (!video || video.readyState < 2) return;
  const w = video.videoWidth, h = video.videoHeight;
  if (!w || !h) return;
  canvas.width = w; canvas.height = h;
  ctx.drawImage(video, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const code = jsQR(img.data, w, h, { inversionAttempts: "attemptBoth" });
  if (code?.data) chrome.runtime.sendMessage({ type: "qr", data: code.data.trim(), tabId });
}
