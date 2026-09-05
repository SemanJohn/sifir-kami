# Arahan kerja Claude — Sifir Kami

## Matlamat projek

Sifir Kami ialah permainan web 2D pass-and-play untuk 3–8 murid. Semua perubahan mesti mengekalkan privasi peranan, pengalaman satu skrin pada telefon, permainan luar talian dan kaedah menjawab menggunakan papan nombor terbina dalam.

Versi semasa: `2.1.1`. Baca `README.md` sebelum mengubah kod kerana peraturan permainan, sejarah ciri dan struktur fail diterangkan di sana.

## Sebelum mula

```bash
git pull origin main
npm test
python -m http.server 8000 --directory dist
```

Buka `http://localhost:8000`. Jangan uji melalui `file://` kerana modul JavaScript dan service worker tidak akan berfungsi dengan betul.

## Fail utama

- `dist/app.js` — aliran skrin, pemasa dan interaksi.
- `dist/game.js` — soalan, bateri, pusingan, sabotaj dan undian.
- `dist/scene.js` — Phaser, latar, watak dan animasi.
- `dist/input.js` — pengesahan input dan susunan watak.
- `dist/style.css` dan `dist/merge.css` — susun atur responsif satu skrin.
- `dist/settings.js` — tetapan guru dan kumpulan pemain.
- `dist/session.js` — sambung misi dan laporan setempat.
- `dist/sw.js` — cache PWA dan kemas kini Home Screen.
- `tests/` — ujian peraturan dan kestabilan.

## Peraturan yang wajib dikekalkan

1. Pemain tidak boleh mengundi diri sendiri.
2. Sentuhan atau klik daripada soalan lama tidak boleh menjawab soalan baharu.
3. Krew dan penyamar menerima rupa soalan darab yang sama.
4. Penyamar hanya menyerang apabila memilih butang sabotaj; tenaga yang tidak digunakan dibawa ke pusingan seterusnya.
5. Log tidak boleh mendedahkan nama atau peranan pelaku.
6. Mod Mini mesti berfungsi dengan tepat 3 pemain; tetapan menyokong 2–5 pusingan.
7. Lobi dan skrin permainan mesti muat dalam ruang paparan telefon tanpa tatal halaman.
8. Watak yang telah digunakan tidak boleh dipilih pemain lain.
9. Ketikan pada panel atau butang tidak boleh tembus ke kanvas Phaser di belakang.
10. Misi aktif tidak boleh dimuat semula secara paksa apabila service worker menemui versi baharu.

## Aset dan latar

Jangan salin aset binari melalui paparan terminal atau teks base64 yang boleh dipotong. `dist/assets/station.webp` mesti kekal lengkap. Ujian kestabilan menyemak saiz, cap jari dan panjang RIFF aset ini. Jika latar diganti dengan sengaja, kemas kini cap jari yang berkaitan dalam `dist/sw.js` dan `tests/stability.test.js`.

Watak menggunakan sprite prosedural asal projek. Jangan gunakan aset Among Us berhak cipta. Lesen Phaser dan fon dalam folder aset mesti dikekalkan.

## Cara membuat penambahbaikan

- Utamakan masalah yang dapat dilihat atau diterbitkan semula.
- Buat perubahan kecil mengikut satu tujuan dan tambah ujian untuk peraturan permainan atau regresi yang penting.
- Uji saiz telefon potret, telefon landskap, tablet dan desktop.
- Semak keadaan pemain 3 hingga 8 orang, pusingan 2 hingga 5, pemasa hidup/mati dan mod teks besar.
- Pastikan semua butang boleh ditekan, fokus papan kekunci jelas dan sasaran sentuhan sesuai untuk murid.
- Elakkan arahan berulang pada skrin. Simpan penerangan panjang dalam panel bantuan.

## Sebelum commit dan push

```bash
npm test
git diff --check
git status --short
```

Jika keluaran web berubah, naikkan versi secara konsisten dalam `package.json`, `dist/index.html` dan nama cache `dist/sw.js`. Pastikan senarai aset luar talian lengkap. Commit hanya fail sumber yang berkaitan; jangan commit fail sementara atau arkib ZIP.

Selepas push ke `main`, pastikan GitHub Actions **Publish Sifir Kami to GitHub Pages** selesai dengan status berjaya. URL produksi ialah <https://semanjohn.github.io/sifir-kami/>.

## Format laporan kepada Azizi

Terangkan dalam Bahasa Melayu yang mudah:

- apa yang dibetulkan;
- mengapa masalah berlaku;
- ujian yang telah lulus;
- nombor versi dan pautan aplikasi;
- perkara khusus yang masih perlu dicuba pada iPhone sebenar.

Jangan menyatakan aplikasi bebas bug tanpa bukti. Jika ada kegagalan penerbitan atau ujian, nyatakan dengan terus dan baiki sebelum menamatkan kerja.
