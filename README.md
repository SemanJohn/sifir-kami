# Sifir Kami — Misi Angkasa

Permainan web 2D berbahasa Melayu untuk 3–8 pemain sekolah rendah. Satu peranti diserahkan bergilir. Mod Mini mengaktifkan 2 krew dan 1 penyamar untuk tepat 3 pemain; mod Klasik mempunyai seorang penyamar, manakala Misi+ mempunyai dua penyamar apabila ada 7–8 pemain.

Main: [Sifir Kami](https://semanjohn.github.io/sifir-kami/). Versi semasa: **v2.2.0**.

## Pembaikan v2.2.0

- **Pemasa giliran berhenti selepas soalan ketiga.** Sebelum ini kiraan terus berjalan pada skrin tamat tugasan, jadi penyamar yang menjawab dengan tenang boleh kehilangan peluang memilih kekuatan serangan apabila masa habis. Kini kiraan dibekukan untuk semua peranan dengan paparan yang sama, jadi tempoh giliran masih tidak membocorkan peranan.
- **Papan kekunci fizikal boleh menaip jawapan.** Selepas soalan baharu dilukis fokus dilepaskan supaya papan kekunci telefon tidak terbuka; akibatnya kekunci nombor pada komputer riba tidak sampai ke papan nombor. Pendengar kekunci kini berada pada dokumen dan mengabaikan medan nama, tirai keselamatan dan panel bantuan.
- **Animasi tidak lagi bertimbun ketika pentas tersembunyi.** Pada telefon, kanvas stesen disembunyikan semasa bermain dan gelung Phaser tidur, jadi konfeti serta reaksi watak tidak pernah tamat dan meletus sekaligus apabila lobi kembali. Kesan kini hanya dimainkan apabila pentas benar-benar dilihat.
- **Watak tidak dibina semula tanpa sebab.** Setiap pertukaran skrin, ketikan lobi dan peristiwa saiz semula membina semula kesemua sprite, memutuskan animasi apungan dan membazir kuasa. Susunan kini mempunyai cap jari; pembinaan semula hanya berlaku apabila saiz kanvas, tetapan pergerakan atau senarai pemain berubah.
- **Muat pertama lebih ringan.** Gambar rupa watak hanya dikodkan kepada PNG apabila benar-benar dipaparkan, bukan kesemua 20 sekali gus ketika aplikasi dibuka.
- **Ralat framebuffer Phaser dihapuskan.** Apabila skrin bertukar dan kanvas stesen disembunyikan, arahan tidur ditangguhkan satu bingkai. Gelung Phaser kadangkala sempat melangkah dahulu, melihat ruang 0×0 dan membuang `Framebuffer status: Incomplete Attachment` yang boleh mengosongkan kanvas. Pentas kini ditidurkan serta-merta; membangunkannya masih ditangguhkan supaya susun atur sempat menetap. Diukur dengan menogol Tetapan guru ↔ lobi: **3 ralat dalam 54 togol sebelum ini, 0 dalam 144 togol selepas pembaikan**.
- **Nama Home Screen lebih kemas.** `apple-mobile-web-app-title` dan `mobile-web-app-capable` ditambah supaya ikon iPhone dan Android memaparkan "Sifir Kami".

Diuji dengan main penuh 3 dan 8 pemain pada 375×667, 390×844, landskap 844×390 dan desktop 1280×800: tiada ralat konsol dan tiada tatal halaman.

## Pembaikan v2.1.1

- Pulihkan fail latar lengkap yang terpotong semasa pemindahan ke GitHub.
- Sahkan cap jari aset sebelum penerbitan; cache PWA menolak latar yang rosak.
- Watak menggunakan petak berasingan mengikut saiz pentas. Ketikan lantai tidak lagi mengumpulkan watak di satu tempat; nama juga boleh ditekan untuk menyunting pemain.
- Ringkaskan teks berulang dan kekalkan label Pemain/Sifir pada telefon.
- Sahkan skrin asal bagi butang pertukaran giliran dan tolak jawapan Boss selepas masa tamat.

Kemas kini v2.1.0 meringankan muat turun, mengukuhkan paparan kanvas telefon dan membetulkan peraturan pariti semua mod. Kemas kini v2.0.0 menambah pemulihan misi, laporan kekal, animasi reaksi, peristiwa angkasa, Boss Sifir dan pilihan kekuatan sabotaj.

## Prestasi & kestabilan v2.1.0

- Latar stesen ditukar kepada WebP dan ikon dimampatkan tanpa menukar rupa asal.
- Fon Baloo 2 dan DM Sans disimpan dalam aplikasi supaya paparan tidak bergantung pada Google Fonts atau rangkaian sekolah.
- Ikon maskable khusus ditambah untuk pemasangan Home Screen Android.
- Enjin animasi tidur apabila pentas tersembunyi dan hanya bangun selepas saiz kanvas sah, mengelakkan kanvas 0×0 pada telefon.
- Konfeti mengikut lebar serta tinggi sebenar skrin, dan paparan bateri awal mengikut tetapan guru.
- Penyamar menang apabila bilangannya menyamai krew dalam Mini, Klasik dan Misi+.

## Misi Angkasa v2.0.0

- Misi yang terganggu disimpan secara automatik. Lobi menawarkan **Sambung misi** pada titik selamat tanpa mendedahkan peranan.
- Sehingga 30 laporan misi disimpan pada peranti. Tetapan guru memaparkan ringkasan ketepatan dan masa purata setiap murid serta eksport CSV gabungan.
- Watak kini mempunyai reaksi melompat, bergegar, meraikan dan terpelanting ketika disingkirkan. Jawapan pula menerima kesan visual kombo, betul dan salah.
- Setiap pusingan menerima satu peristiwa bersama: Graviti Rendah, Hujan Meteor, Aurora Tenaga atau Gerhana Pantas.
- Jika penyamar masih hidup selepas undian terakhir, semua pemain menghadapi Boss Sifir: 3 soalan dalam 30 saat dan sekurang-kurangnya 2 perlu tepat.
- Penyamar boleh melancarkan 10%, 25% atau semua tenaga sabotaj. Baki yang tidak digunakan kekal disimpan.
- **Main semula · pemain sama** mengocok peranan dan turutan tanpa perlu menyediakan semula lobi.

## Cuba dan main

1. Lobi ialah skrin kapal interaktif. Tekan **＋** untuk menambah pemain; tekan mana-mana watak untuk mengubah nama atau membuangnya. Tekan **Sifir** dalam animasi dan pilih sekurang-kurangnya dua sifir (1–12), kemudian tekan **Mula misi** di bawah kapal.
2. Ikut nama pada skrin. Tekan dan tahan untuk melihat peranan; lepaskan untuk menutupnya.
3. Setiap pemain, termasuk penyamar, menjawab tiga soalan darab dengan menaip sendiri pada papan nombor. Selepas soalan ketiga, krew boleh tamatkan giliran; penyamar memilih serangan **10%**, **25%**, semua tenaga atau menyimpannya.
4. Bateri dan petunjuk tanpa nama dipaparkan selepas semua giliran. Bincang sehingga 90 saat, kemudian undi seorang demi seorang. Pemain hanya boleh memilih pemain aktif yang lain; undi diri sendiri tidak dibenarkan.
5. Undi seri atau undi “Langkau” tertinggi menyebabkan tiada penyingkiran. Pemain yang disingkirkan menjadi pemerhati.

Krew menang jika bateri mencapai 100%, semua penyamar disingkirkan atau Boss Sifir ditewaskan. Penyamar menang apabila bateri mencapai 0%, bilangannya menyamai krew atau pasukan gagal melawan Boss Sifir. Keputusan bateri didahulukan sebelum mesyuarat. Lalai 3 pusingan; guru boleh memilih 2–5.

## Mod Mini 3 pemain v1.5.0

- Diaktifkan secara automatik apabila tepat 3 pemain menyertai misi: 2 krew dan 1 penyamar.
- Undian Pusingan 1 ialah amaran selamat; tiada sesiapa disingkirkan.
- Mulai Pusingan 2, penyamar yang disingkirkan memberi kemenangan kepada krew. Jika seorang krew disingkirkan, penyamar menang kerana nisbah menjadi 1 lawan 1.
- Bateri dan kesukaran kekal dinormalkan supaya permainan tiga orang masih seimbang.

## Galeri watak v1.6.0

- Tekan watak dalam lobi untuk menukar nama dan memilih rupa pemain.
- Terdapat 20 watak asli dengan gabungan warna, ekspresi dan aksesori seperti telinga kucing, arnab, mahkota, fon kepala, bunga, topi cef dan cermin mata.
- Watak yang sedang digunakan pemain lain dipaparkan sebagai terkunci dan tidak boleh dipilih.
- Pilihan watak disimpan bersama nama pemain dan kumpulan kelas pada peranti.

## Sabotaj pilihan v1.4.0

- Penyamar menerima soalan sifir yang sama seperti krew. Jawapan tepat berturut-turut memberi tenaga sabotaj **+5%, +8%, kemudian +12%**.
- Selepas soalan ketiga, butang rahsia membolehkan penyamar menggunakan semua tenaga tersimpan. Jika tidak ditekan, tenaga dibawa ke pusingan seterusnya sehingga maksimum **50%**.
- Dalam Misi+ dengan dua penyamar aktif, ganjaran tenaga dibahagi dua supaya jumlah kekuatan pasukan kekal seimbang.
- Hanya serangan yang benar-benar dilancarkan mengurangkan bateri. Pusingan tanpa serangan tidak menghasilkan sebarang log sabotaj atau “tiada gangguan”.
- Ketika panel sifir atau penyunting nama dibuka, interaksi kanvas watak dimatikan supaya sentuhan sifir 2–5 tidak membuka skrin ubah nama di belakang.

## Soalan seragam & ANU v1.3.0

- Krew dan penyamar menerima bentuk soalan darab serta maklum balas skrin yang sama. Ini menguji sifir penyamar tanpa membocorkan peranan melalui rupa tugasan.
- Jawapan tepat krew mengecas kapal; jawapan tepat penyamar mengumpul tenaga untuk serangan pilihan selepas tugasan.
- Butang **ANU · Cari faktor hilang** ditambah dalam panel pemilihan sifir. Apabila aktif, satu daripada tiga soalan setiap giliran dipilih secara rawak sebagai `? × 8 = 48` atau `6 × ? = 48`.
- Laporan guru kini mengira ketepatan sifir semua pemain, termasuk penyamar, dan CSV menandai soalan ANU.

## Lobi interaktif v1.2.0

- Animasi kapal memenuhi ruang utama lobi; borang pemain yang berasingan dibuang.
- Watak ialah kawalan pemain: tekan watak untuk mengubah nama atau membuang pemain, dan gunakan butang ＋ untuk menambah sehingga 8 pemain.
- Pemilihan sifir dan pratetap Asas/Sukar/Semua berada dalam panel di atas animasi.
- Hanya butang **Mula misi** berada di bawah animasi.
- Saiz pentas, susunan watak dan kawalan menyesuaikan diri mengikut ruang skrin, orientasi dan jenis input telefon, tablet atau komputer.

## Gabungan v1.1.1

Gabungan ini mengadaptasi idea dan komponen daripada ZIP edisi Claude yang dibekalkan pengguna. Notis lesen asal dikekalkan dalam `CLAUDE-EDITION-LICENSE.md`.

- **Dikekalkan daripada versi asal:** watak berwajah comel yang sama, latar stesen, Phaser 3.90.0, susun atur satu skrin, pengesahan sentuhan setiap soalan, larangan undi diri sendiri, dan bateri dikira pada akhir pusingan.
- **Pembelajaran Claude:** soalan adaptif berasaskan kesilapan dalam misi semasa, laporan murid/sifir, eksport CSV, maklum balas sentuhan ringan dan petunjuk ringkas selepas jawapan salah.
- **Kaedah Sifir Juara:** semua tiga jawapan ditaip sendiri pada papan nombor terbina dalam; ⌫ memadam dan ✓ menghantar. Tiada pilihan jawapan untuk diteka.
- **Tetapan guru:** buka ⚙ di lobi. Pilih mod, 2–5 pusingan, 10–90 saat giliran, 30–240 saat mesyuarat, bateri mula 20–80%, tanpa pemasa, teks besar, animasi berkurang dan simpan/muat kumpulan 3–8 murid.
- **Misi+ pilihan:** dua penyamar untuk 7–8 pemain, pusingan pertama hanya amaran, krisis mulai pusingan 2. Satu kombo krew membaiki krisis (+6%); tiada kombo menyebabkan −8%. Penyamar juga menang apabila bilangannya menyamai krew.
- **Privasi permainan:** log tidak menyenaraikan nama pelaku. Kesilapan matematik tidak terus membocorkan peranan. Rakan penyamar hanya didedahkan pada kad peranan rahsia.
- **Laporan pembelajaran:** soalan yang telah dilihat tetapi kehabisan masa direkod salah sekali; soalan yang belum pernah dipaparkan tidak direka sebagai jawapan salah. Data sedikit ditandai, bukan dilabel mahir.
- **Paparan:** tetapan, sifir laporan dan murid dipaginasi. Papan nombor terbina dalam tidak memanggil papan kekunci telefon. Skrin selesai menyediakan butang untuk menamatkan giliran awal; CSV menyimpan semua jawapan.

Misi aktif dan maksimum 30 laporan disimpan setempat pada peranti. Aplikasi menyemak versi baharu ketika dilancarkan, kembali aktif, dan setiap 15 minit; muat semula ditangguhkan sehingga kembali ke lobi supaya misi tidak terganggu. CSV melindungi nama yang menyerupai formula spreadsheet.

## Kemas kini v1.0.1

- Gaya hover terhad kepada tetikus. Jawapan baharu memerlukan tekan dan lepas pada soalan yang sama; sentuhan lama dan klik sintetik tidak terbawa ke soalan seterusnya.
- Calon undian mengecualikan pengundi sendiri. Peraturan sama disahkan semasa merekod dan mengira undi.
- Paparan mengikut tinggi ruang skrin semasa, tanpa tatal halaman. Lobi dua langkah, nama berhalaman, bantuan berhalaman, dan susunan melintang untuk telefon dipusingkan. Peta stesen disembunyikan pada skrin permainan telefon untuk memberi ruang kepada soalan.
- Footer serta arahan berulang dibuang. Maklumat peraturan kekal dalam butang bantuan.

## Naik taraf daripada spesifikasi asal

| Perkara | Pelaksanaan semasa |
| --- | --- |
| Penjana soalan boleh tersangkut pada pengganda 1 | Pilihan jawapan dibina daripada himpunan terhingga dan dikocok Fisher–Yates |
| Tugasan penyamar berbeza dan boleh membocorkan peranan | Semua peranan menerima paparan soalan darab yang sama; kesan bateri diproses secara rahsia |
| 7 krew boleh mengecas kapal terlalu cepat | Jumlah cas maksimum krew aktif dinormalkan kepada +45% setiap pusingan |
| Turutan giliran boleh menentukan kemenangan bateri | Semua perubahan bateri dikira serentak pada akhir pusingan |
| Identiti boleh bocor melalui tempoh giliran / log | Tempoh sama untuk semua dalam mod berpemasa; log agregat tanpa nama; giliran dikocok setiap pusingan |
| Peraturan seri / langkau tidak jelas | Undi seri atau langkau tertinggi: tiada penyingkiran |
| Tekan jawapan / undi berganda | Jawapan dikunci selepas pilihan; pengesahan undi sekali sahaja |
| Aplikasi bertukar tab | Peranan ditutup dan tugasan/undian ditutup dengan tirai; pemasa berasaskan masa sebenar terus berjalan |

### Bateri seimbang

Bateri mula 50%. Jika terdapat `C` krew aktif, setiap jawapan betul menambah `9/C` peratus dan kombo tiga betul menambah `18/C` peratus. Tiga soalan dan kombo penuh memberikan `45/C` peratus kepada setiap krew. Streak tiga jawapan tepat memberi penyamar 5% + 8% + 12% = 25% tenaga. Serangan hanya berlaku apabila butang rahsia ditekan; tamat masa atau pilihan simpan tidak mengubah bateri. Jumlah dikepit pada 0–100 dan dibundarkan satu tempat perpuluhan pada akhir pusingan.

Contoh 4 pemain: 3 krew × 15% = +45%. Dengan sabotaj berjaya, perubahan bersih ialah +20%, sama seperti pasukan 8 pemain apabila semua krew sempurna. Pelarasan ini ialah permulaan imbangan; keseronokan sebenar perlu dicuba dengan murid.

Dalam kedua-dua mod, jumlah tenaga baharu daripada streak sempurna semua penyamar kekal 25% sepusingan dan dibahagi antara penyamar aktif. Setiap penyamar boleh menyimpan sehingga 50% dan menggunakan semua simpanannya dalam satu serangan. Bonus/penalti krisis dikira sekali sebelum bateri dikepit.

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

Pada iPhone, buka laman HTTPS dalam Safari, pilih **Share → Add to Home Screen**. Pada Android, gunakan pilihan pemasangan aplikasi pelayar jika tersedia. Ikon baharu menggunakan maskot angkasawan comel Sifir Kami. Permainan boleh dibuka semula tanpa internet selepas semua aset berjaya dicache pada lawatan pertama. Fon web mempunyai pengganti tempatan. Pengesahan akaun untuk URL pratonton persendirian mungkin masih memerlukan internet; GitHub Pages biasa tidak memerlukan akaun untuk bermain.

Service worker mengaktifkan cache baharu selepas semua aset dimuat turun. Aplikasi menyemak kemas kini ketika dilancarkan, kembali aktif, dan setiap 15 minit. Muat semula berlaku hanya ketika berada di lobi; sesi dan laporan aktif diteruskan sehingga selamat. Apabila menerbitkan versi baharu, tukar versi cache dalam `dist/sw.js` serta nombor versi paparan dan `package.json`.

## Struktur

- `dist/index.html` — rangka semantik dan taklimat permainan.
- `dist/style.css` — reka bentuk responsif, safe area iPhone dan mod kurang pergerakan.
- `dist/app.js` — skrin, pemasa, tirai privasi dan interaksi.
- `dist/input.js` — pengesahan sentuhan mengikut soalan dan pointer, kelas peranti, petak watak dan cap jari susunan pentas.
- `dist/settings.js` — tetapan guru dan kumpulan setempat.
- `dist/learning.js` — statistik adaptif, laporan dan CSV.
- `dist/session.js` — pemulihan misi dan sejarah laporan setempat.
- `dist/merge.css` — papan nombor, tetapan dan laporan satu skrin.
- `dist/game.js` — penjana matematik, skor, pusingan dan undian.
- `dist/scene.js` — adegan Phaser, sprite watak asli dan animasi.
- `dist/assets/station.webp` — latar stesen ringan yang dijana untuk projek ini.
- `dist/assets/icon-*.png` — ikon Home Screen biasa dan maskable.
- `dist/assets/fonts/` — fon setempat serta lesen SIL OFL.
- `dist/sw.js`, `dist/manifest.webmanifest` — cache dan metadata PWA.
- `tests/game.test.js` — ujian logik dan simulasi permainan.

## Skop dan privasi

Versi ini ialah **pass-and-play pada satu peranti**, bukan multiplayer online atau permainan bebas bergerak dengan bilik rangkaian. Watak pada stesen boleh digerakkan dengan mengetik lantai; tugasan dan undian ialah aliran permainan utama. Nama, pilihan sifir, sesi aktif dan laporan disimpan pada peranti ini sahaja. Tiada analitik atau penghantaran keputusan murid.

Peranan disembunyikan pada paparan biasa, tetapi aplikasi sisi klien tidak boleh menghalang seseorang yang sengaja memeriksa memori dengan alat pembangun. Main mengikut peraturan bersama.

Enjin: [Phaser](https://docs.phaser.io/) 3.90.0, lesen MIT, salinan lesen dalam `dist/vendor/PHASER-LICENSE.md`. Watak menggunakan sprite prosedural asal, bukan aset Among Us. Fon Baloo 2 dan DM Sans disimpan bersama aplikasi dengan lesen SIL OFL supaya tersedia di luar talian.
