# Sifir Kami — Misi Angkasa

Permainan web 2D berbahasa Melayu untuk 4–8 pemain sekolah rendah. Satu peranti diserahkan bergilir. Tepat seorang penyamar diberikan secara rawak setiap permainan.

## Cuba dan main

1. Pilih sekurang-kurangnya dua sifir (1–12), isi 4–8 nama yang berbeza, kemudian tekan **Mula misi**.
2. Ikut nama pada skrin. Tekan dan tahan untuk melihat peranan; lepaskan untuk menutupnya.
3. Krew menjawab tiga soalan darab. Penyamar mencari nombor yang bukan gandaan. Setiap giliran berlangsung 20 saat, termasuk masa penyegerakan selepas tugasan selesai.
4. Bateri dan petunjuk tanpa nama dipaparkan selepas semua giliran. Bincang sehingga 90 saat, kemudian undi seorang demi seorang.
5. Undi seri atau undi “Langkau” tertinggi menyebabkan tiada penyingkiran. Pemain yang disingkirkan menjadi pemerhati.

Krew menang jika bateri mencapai 100% atau penyamar disingkirkan. Penyamar menang apabila bateri mencapai 0% atau kekal aktif selepas undian pusingan ketiga. Keputusan bateri didahulukan sebelum mesyuarat.

## Naik taraf daripada spesifikasi asal

| Perkara | Pelaksanaan v1.0.0 |
| --- | --- |
| Penjana soalan boleh tersangkut pada pengganda 1 | Pilihan jawapan dibina daripada himpunan terhingga dan dikocok Fisher–Yates |
| Sabotaj Sifir 1 tiada jawapan bukan gandaan | Sifir 1 kekal untuk krew; sabotaj memilih sifir terpilih yang lebih besar daripada 1 |
| 7 krew boleh mengecas kapal terlalu cepat | Jumlah cas maksimum krew aktif dinormalkan kepada +45% setiap pusingan |
| Turutan giliran boleh menentukan kemenangan bateri | Semua perubahan bateri dikira serentak pada akhir pusingan |
| Identiti boleh bocor melalui tempoh giliran / log | Tempoh 20 saat untuk semua; log agregat tanpa nama; giliran dikocok setiap pusingan |
| Peraturan seri / langkau tidak jelas | Undi seri atau langkau tertinggi: tiada penyingkiran |
| Tekan jawapan / undi berganda | Jawapan dikunci selepas pilihan; pengesahan undi sekali sahaja |
| Aplikasi bertukar tab | Peranan ditutup dan tugasan/undian ditutup dengan tirai; pemasa berasaskan masa sebenar terus berjalan |

### Bateri seimbang

Bateri mula 50%. Jika terdapat `C` krew aktif, setiap jawapan betul menambah `9/C` peratus dan kombo tiga betul menambah `18/C` peratus. Tiga soalan dan kombo penuh memberikan `45/C` peratus kepada setiap krew. Sabotaj berjaya −25%; tersilap +5%; tamat masa tanpa menjawab 0%. Jumlah dikepit pada 0–100 dan dibundarkan satu tempat perpuluhan pada akhir pusingan.

Contoh 4 pemain: 3 krew × 15% = +45%. Dengan sabotaj berjaya, perubahan bersih ialah +20%, sama seperti pasukan 8 pemain apabila semua krew sempurna. Pelarasan ini ialah permulaan imbangan; keseronokan sebenar perlu dicuba dengan murid.

## Terbit melalui GitHub Pages

Projek ini sudah mengandungi aliran GitHub Actions dalam `.github/workflows/pages.yml`.

1. Cipta repositori GitHub bernama `sifir-kami` dengan cabang `main`.
2. Muat naik kandungan projek, termasuk folder `dist` dan `.github`. Jangan muat naik ZIP tanpa mengekstraknya. Jika menggunakan muat naik web, pastikan fail workflow turut dicipta di `.github/workflows/pages.yml`.
3. Buka **Settings → Pages → Build and deployment → Source → GitHub Actions**.
4. Pada tab **Actions**, jalankan **Publish Sifir Kami to GitHub Pages**, atau lakukan push baharu ke `main`.
5. Buka URL yang tertera pada deployment. Lazimnya `https://NAMA-PENGGUNA.github.io/sifir-kami/`.

Tiada API key, pangkalan data atau pelayan aplikasi diperlukan. Fail menggunakan pautan relatif supaya laluan repositori GitHub Pages berfungsi. Folder `.openai` ialah metadata pratonton Sites dan tidak diperlukan untuk GitHub; workflow hanya menerbitkan `dist`.

Rujukan: [GitHub Pages melalui GitHub Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Uji pada komputer

Jangan buka `index.html` menggunakan `file://` kerana pelayar menyekat modul JavaScript. Dari folder projek, jalankan `python -m http.server 8000 --directory dist`, kemudian buka `http://localhost:8000`.

Uji logik permainan dengan Node.js 20+: `npm test`. Tidak perlu `npm install`: enjin Phaser 3.90.0 sudah disertakan di `dist/vendor`.

## Webapp pada telefon

Pada iPhone, buka laman HTTPS dalam Safari, pilih **Share → Add to Home Screen**. Pada Android, gunakan pilihan pemasangan aplikasi pelayar jika tersedia. Permainan boleh dibuka semula tanpa internet selepas semua aset berjaya dicache pada lawatan pertama. Fon web mempunyai pengganti tempatan. Pengesahan akaun untuk URL pratonton persendirian mungkin masih memerlukan internet; GitHub Pages biasa tidak memerlukan akaun untuk bermain.

Kemas kini service worker menunggu semua tab versi lama ditutup supaya misi aktif tidak terganggu. Apabila menerbitkan versi baharu, tukar versi cache dalam `dist/sw.js` serta nombor versi paparan dan `package.json`.

## Struktur

- `dist/index.html` — rangka semantik dan taklimat permainan.
- `dist/style.css` — reka bentuk responsif, safe area iPhone dan mod kurang pergerakan.
- `dist/app.js` — skrin, pemasa, tirai privasi dan interaksi.
- `dist/game.js` — penjana matematik, skor, pusingan dan undian.
- `dist/scene.js` — adegan Phaser, sprite watak asli dan animasi.
- `dist/assets/station.png` — latar stesen yang dijana untuk projek ini.
- `dist/sw.js`, `dist/manifest.webmanifest` — cache dan metadata PWA.
- `tests/game.test.js` — ujian logik dan simulasi permainan.

## Skop dan privasi

Versi ini ialah **pass-and-play pada satu peranti**, bukan multiplayer online atau permainan bebas bergerak dengan bilik rangkaian. Watak pada stesen boleh digerakkan dengan mengetik lantai; tugasan dan undian ialah aliran permainan utama. Nama dan pilihan sifir disimpan pada peranti ini sahaja; peranan, undi dan sesi aktif tidak disimpan selepas muat semula. Tiada analitik atau penghantaran keputusan murid.

Peranan disembunyikan pada paparan biasa, tetapi aplikasi sisi klien tidak boleh menghalang seseorang yang sengaja memeriksa memori dengan alat pembangun. Main mengikut peraturan bersama.

Enjin: [Phaser](https://docs.phaser.io/) 3.90.0, lesen MIT, salinan lesen dalam `dist/vendor/PHASER-LICENSE.md`. Watak menggunakan sprite prosedural asal, bukan aset Among Us. Fon pilihan Baloo 2 dan DM Sans diminta melalui Google Fonts; pelayar menggunakan fon sistem jika tidak tersedia.
