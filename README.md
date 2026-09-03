# Sifir Kami — Misi Angkasa

Permainan web 2D berbahasa Melayu untuk 4–8 pemain sekolah rendah. Satu peranti diserahkan bergilir. Klasik mempunyai seorang penyamar; mod Misi+ mempunyai dua penyamar apabila ada 7–8 pemain.

Main: [Sifir Kami](https://semanjohn.github.io/sifir-kami/).

## Cuba dan main

1. Isi 4–8 nama berbeza pada langkah **Krew**, kemudian pilih sekurang-kurangnya dua sifir (1–12) pada langkah **Sifir** dan tekan **Mula misi**. Nama dipaparkan empat pada satu halaman.
2. Ikut nama pada skrin. Tekan dan tahan untuk melihat peranan; lepaskan untuk menutupnya.
3. Krew menjawab tiga soalan darab. Penyamar mencari nombor bukan gandaan (1 tugasan dalam Klasik, 3 dalam Misi+). Lalai satu giliran ialah 25 saat. Mulai pusingan 2, soalan kedua ditaip pada papan nombor; guru boleh mengubahnya.
4. Bateri dan petunjuk tanpa nama dipaparkan selepas semua giliran. Bincang sehingga 90 saat, kemudian undi seorang demi seorang. Pemain hanya boleh memilih pemain aktif yang lain; undi diri sendiri tidak dibenarkan.
5. Undi seri atau undi “Langkau” tertinggi menyebabkan tiada penyingkiran. Pemain yang disingkirkan menjadi pemerhati.

Krew menang jika bateri mencapai 100% atau semua penyamar disingkirkan. Penyamar menang apabila bateri mencapai 0% atau kekal aktif selepas undian terakhir. Keputusan bateri didahulukan sebelum mesyuarat. Lalai 3 pusingan; guru boleh memilih 2–6.

## Gabungan v1.1.0

Gabungan ini mengadaptasi idea dan komponen daripada ZIP edisi Claude yang dibekalkan pengguna. Notis lesen asal dikekalkan dalam `CLAUDE-EDITION-LICENSE.md`.

- **Dikekalkan daripada versi asal:** watak berwajah comel yang sama, latar stesen, Phaser 3.90.0, susun atur satu skrin, pengesahan sentuhan setiap soalan, larangan undi diri sendiri, dan bateri dikira pada akhir pusingan.
- **Pembelajaran Claude:** soalan adaptif berasaskan kesilapan dalam misi semasa, pengalih perhatian bermakna, satu soalan taip setiap giliran dari pusingan dipilih, laporan murid/sifir dan eksport CSV.
- **Tetapan guru:** buka ⚙ di lobi. Pilih mod, 2–6 pusingan, 10–90 saat giliran, 30–240 saat mesyuarat, bateri mula 20–80%, tanpa pemasa, teks besar, animasi berkurang dan simpan/muat kumpulan 4–8 murid.
- **Misi+ pilihan:** dua penyamar untuk 7–8 pemain, pusingan pertama hanya amaran, krisis mulai pusingan 2. Satu kombo krew membaiki krisis (+6%); tiada kombo menyebabkan −8%. Penyamar juga menang apabila bilangannya menyamai krew.
- **Privasi permainan:** log tidak menyenaraikan nama pelaku. Kesilapan matematik tidak terus membocorkan peranan. Rakan penyamar hanya didedahkan pada kad peranan rahsia.
- **Laporan yang berbeza:** ketepatan sifir darab tidak dicampur dengan ketepatan mencari bukan gandaan. Soalan yang telah dilihat tetapi kehabisan masa direkod salah sekali; soalan yang belum pernah dipaparkan tidak direka sebagai jawapan salah. Data sedikit ditandai, bukan dilabel mahir.
- **Paparan:** tetapan, sifir laporan dan murid dipaginasi. Papan nombor terbina dalam tidak memanggil papan kekunci telefon. Butang anak panah menukar halaman laporan; CSV menyimpan semua jawapan.

Laporan hanya dalam memori: eksport sebelum main semula atau muat semula. Nama kumpulan dan tetapan disimpan setempat. Muat semula automatik hanya berlaku di lobi, bukan semasa misi atau membaca laporan. CSV melindungi nama yang menyerupai formula spreadsheet.

## Kemas kini v1.0.1

- Gaya hover terhad kepada tetikus. Jawapan baharu memerlukan tekan dan lepas pada soalan yang sama; sentuhan lama dan klik sintetik tidak terbawa ke soalan seterusnya.
- Calon undian mengecualikan pengundi sendiri. Peraturan sama disahkan semasa merekod dan mengira undi.
- Paparan mengikut tinggi ruang skrin semasa, tanpa tatal halaman. Lobi dua langkah, nama berhalaman, bantuan berhalaman, dan susunan melintang untuk telefon dipusingkan. Peta stesen disembunyikan pada skrin permainan telefon untuk memberi ruang kepada soalan.
- Footer serta arahan berulang dibuang. Maklumat peraturan kekal dalam butang bantuan.

## Naik taraf daripada spesifikasi asal

| Perkara | Pelaksanaan semasa |
| --- | --- |
| Penjana soalan boleh tersangkut pada pengganda 1 | Pilihan jawapan dibina daripada himpunan terhingga dan dikocok Fisher–Yates |
| Sabotaj Sifir 1 tiada jawapan bukan gandaan | Sifir 1 kekal untuk krew; sabotaj memilih sifir terpilih yang lebih besar daripada 1 |
| 7 krew boleh mengecas kapal terlalu cepat | Jumlah cas maksimum krew aktif dinormalkan kepada +45% setiap pusingan |
| Turutan giliran boleh menentukan kemenangan bateri | Semua perubahan bateri dikira serentak pada akhir pusingan |
| Identiti boleh bocor melalui tempoh giliran / log | Tempoh sama untuk semua dalam mod berpemasa; log agregat tanpa nama; giliran dikocok setiap pusingan |
| Peraturan seri / langkau tidak jelas | Undi seri atau langkau tertinggi: tiada penyingkiran |
| Tekan jawapan / undi berganda | Jawapan dikunci selepas pilihan; pengesahan undi sekali sahaja |
| Aplikasi bertukar tab | Peranan ditutup dan tugasan/undian ditutup dengan tirai; pemasa berasaskan masa sebenar terus berjalan |

### Bateri seimbang

Bateri mula 50%. Jika terdapat `C` krew aktif, setiap jawapan betul menambah `9/C` peratus dan kombo tiga betul menambah `18/C` peratus. Tiga soalan dan kombo penuh memberikan `45/C` peratus kepada setiap krew. Sabotaj berjaya −25%; tersilap +5%; tamat masa tanpa menjawab 0%. Jumlah dikepit pada 0–100 dan dibundarkan satu tempat perpuluhan pada akhir pusingan.

Contoh 4 pemain: 3 krew × 15% = +45%. Dengan sabotaj berjaya, perubahan bersih ialah +20%, sama seperti pasukan 8 pemain apabila semua krew sempurna. Pelarasan ini ialah permulaan imbangan; keseronokan sebenar perlu dicuba dengan murid.

Dalam Misi+, jumlah sabotaj sempurna semua penyamar kekal −25% sepusingan, dibahagi kepada `3 × bilangan penyamar aktif` tugasan. Semua cubaan tersilap memberikan +5% keseluruhan; tamat masa neutral. Bonus/penalti krisis dikira sekali sebelum bateri dikepit. Ini mengelakkan bilangan pemain dan turutan giliran mengubah imbangan asas.

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

Service worker mengaktifkan cache baharu selepas semua aset dimuat turun. Aplikasi memuat semula secara automatik hanya ketika berada di lobi; sesi dan laporan aktif diteruskan. Untuk menaik taraf versi lama, tutup dan buka semula aplikasi selepas kemas kini dimuat turun. Apabila menerbitkan versi baharu, tukar versi cache dalam `dist/sw.js` serta nombor versi paparan dan `package.json`.

## Struktur

- `dist/index.html` — rangka semantik dan taklimat permainan.
- `dist/style.css` — reka bentuk responsif, safe area iPhone dan mod kurang pergerakan.
- `dist/app.js` — skrin, pemasa, tirai privasi dan interaksi.
- `dist/input.js` — pengesahan sentuhan mengikut soalan dan pointer.
- `dist/settings.js` — tetapan guru dan kumpulan setempat.
- `dist/learning.js` — statistik adaptif, laporan dan CSV.
- `dist/merge.css` — papan nombor, tetapan dan laporan satu skrin.
- `dist/game.js` — penjana matematik, skor, pusingan dan undian.
- `dist/scene.js` — adegan Phaser, sprite watak asli dan animasi.
- `dist/assets/station.png` — latar stesen yang dijana untuk projek ini.
- `dist/sw.js`, `dist/manifest.webmanifest` — cache dan metadata PWA.
- `tests/game.test.js` — ujian logik dan simulasi permainan.

## Skop dan privasi

Versi ini ialah **pass-and-play pada satu peranti**, bukan multiplayer online atau permainan bebas bergerak dengan bilik rangkaian. Watak pada stesen boleh digerakkan dengan mengetik lantai; tugasan dan undian ialah aliran permainan utama. Nama dan pilihan sifir disimpan pada peranti ini sahaja; peranan, undi dan sesi aktif tidak disimpan selepas muat semula. Tiada analitik atau penghantaran keputusan murid.

Peranan disembunyikan pada paparan biasa, tetapi aplikasi sisi klien tidak boleh menghalang seseorang yang sengaja memeriksa memori dengan alat pembangun. Main mengikut peraturan bersama.

Enjin: [Phaser](https://docs.phaser.io/) 3.90.0, lesen MIT, salinan lesen dalam `dist/vendor/PHASER-LICENSE.md`. Watak menggunakan sprite prosedural asal, bukan aset Among Us. Fon pilihan Baloo 2 dan DM Sans diminta melalui Google Fonts; pelayar menggunakan fon sistem jika tidak tersedia.
