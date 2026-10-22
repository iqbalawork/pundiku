# PundiKu

Catat cuan, pantau jajan. PundiKu adalah aplikasi pencatat keuangan pribadi yang ringan, cepat di HP, dan bisa di-install ke home screen.

Repo ini berisi **frontend** (halaman statis untuk GitHub Pages). Data dan logika server tetap di **Google Apps Script** yang terhubung ke Google Sheets milikmu sendiri.

## Arsitektur

```
Browser / PWA (GitHub Pages)  --fetch POST-->  Apps Script Web App (doPost)  -->  Google Sheets
```

- Login menghasilkan token sesi bertanda tangan HMAC, berlaku 14 hari.
- Password disimpan sebagai hash PBKDF2-SHA256 dengan salt dan pepper, bukan teks biasa.
- Data terakhir disimpan di perangkat supaya aplikasi langsung tampil saat dibuka, lalu disinkronkan di belakang.
- Service worker menyimpan aset aplikasi, jadi pembukaan berikutnya jauh lebih cepat.

## Struktur

```
index.html               Kerangka halaman dan semua tampilan
manifest.webmanifest     Konfigurasi PWA
sw.js                    Service worker (cache aset, API tidak di-cache)
assets/css/app.css       Hasil build Tailwind
assets/js/config.js      Alamat API Apps Script
assets/js/api.js         Pemanggil API
assets/js/ui.js          Sheet, toast, dan dialog
assets/js/core.js        State, format angka, tema
assets/js/data.js        Sinkronisasi data, filter, analitik
assets/js/render.js      Render kartu dan daftar
assets/js/forms.js       Form transaksi, rekening, profil, reset password
assets/js/app.js         Boot aplikasi
src/app.css              Sumber CSS (token warna dan komponen)
scripts/                 Build sprite ikon dan ikon aplikasi
```

## Mengubah tampilan

Butuh Node.js 18 ke atas.

```bash
npm install
npm run build
```

`npm run build` membuat ulang sprite ikon di `index.html` dan `assets/css/app.css`. Commit hasil build-nya, karena GitHub Pages hanya menyajikan file statis.

Kalau mengubah file di `assets/`, naikkan juga angka versi `?v=` di `index.html` dan `VERSION` di `sw.js` supaya perangkat pengguna mengambil versi terbaru.

## Ganti alamat backend

Ubah `API_URL` di `assets/js/config.js` ke URL `/exec` dari deployment Apps Script. Deployment harus diatur **Execute as: Me** dan **Who has access: Anyone**.

## Lisensi pihak ketiga

- Tailwind CSS (MIT)
- Phosphor Icons (MIT)
- Chart.js (MIT), dimuat dari jsDelivr saat tab Insight dibuka
- Plus Jakarta Sans (SIL Open Font License), dimuat dari Google Fonts
