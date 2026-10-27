<div align="center">

<img src="icon128.png" width="72" alt="">

# QRAtt

Ders sekmesinde yoklama QR kodu çıkınca numaranla otomatik katılan Chrome eklentisi.

<img src="docs/screenshot.png" width="720" alt="QRAtt popup'ı ve yoklama sayfası">

</div>

## Kurulum

1. Repoyu indir: `git clone https://github.com/SemihSamandar/QRAtt.git`
2. `chrome://extensions` → **Geliştirici modu**'nu aç
3. **Paketlenmemiş öğe yükle** → `QRAtt` klasörünü seç

## Kullanım

1. Eklentiye öğrenci numaranı yaz.
2. Ders sekmesindeyken **Bu sekmeyi izle**'ye bas (ya da `Alt+Shift+Q`).
3. Sekmeyi arka plana alabilirsin, kapatma. QR çıkınca form doldurulur ve sonuç bildirim olarak gelir.

> Ders listesinde birden fazla seçenek varsa **Bölümün** alanını, QR'da link yerine sadece kod varsa **Yoklama sayfası adresi**'ni doldur.

## Gizlilik

Ayarlar yalnızca tarayıcında saklanır. Sekme görüntüsü bellekte taranır, kaydedilmez ve hiçbir sunucuya gönderilmez.

---

<sub>QR okuma: [jsQR](https://github.com/cozmo/jsQR) · Kullanmadan önce okulunun yoklama kurallarını kontrol et.</sub>
