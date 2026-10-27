<div align="center">

<img src="icon128.png" width="72" alt="">

# QRAtt

A Chrome extension that watches your lecture tab and joins attendance with your student number as soon as a QR code appears.

<img src="docs/screenshot.png" width="720" alt="QRAtt popup and the attendance page">

</div>

## Installation

1. Clone the repo: `git clone https://github.com/SemihSamandar/QRAtt.git`
2. Open `chrome://extensions` → turn on **Developer mode**
3. Click **Load unpacked** → select the `QRAtt` folder

## Usage

1. Enter your student number in the extension popup.
2. On the lecture tab, click **Bu sekmeyi izle** ("Watch this tab"), or press `Alt+Shift+Q`.
3. You can move the tab to the background, just don't close it. When a QR code appears, the form is filled in and you get a notification with the result.

> If the course list has more than one option, fill in **Bölümün** (your department). If the QR code contains only a code instead of a link, fill in **Yoklama sayfası adresi** (attendance page URL).

## Privacy

Settings are stored only in your browser. The tab's video is scanned in memory, never saved, and never sent to any server.

---

<sub>QR decoding: [jsQR](https://github.com/cozmo/jsQR) · Check your school's attendance rules before using it.</sub>
