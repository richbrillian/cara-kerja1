# Cara Kerja Sehari-hari: pabrik video otomatis

Satu file naskah (`episodes/xx.json`) menjadi satu video vertikal lengkap dengan suara.
Suara Indonesia gratis (edge-tts) dan render berjalan di GitHub Actions, jadi tidak memakai kredit Claude.

## Buat video dari HP
1. Buka repo di aplikasi GitHub, atau `github.dev`, lalu tambah/ubah file di folder `episodes/`.
2. Simpan (commit). Video otomatis dibuat ± 5 menit per episode.
   Atau: tab **Actions → Buat video → Run workflow**, isi nama episode (kosong = semua).
3. Hasilnya ada di tab **Releases**. Ketuk file `.mp4`, lalu simpan ke galeri.

## Isi naskah (contoh ada di `episodes/01-listrik.json`)
Tiap adegan punya: `tipe` (hook / langkah / fakta / penutup), `emoji`, `judul` (pendek),
`narasi` (kalimat yang diucapkan dan jadi teks karaoke).
Opsional: `angka` + `satuan` (angka besar yang menghitung naik), `alur` (deretan emoji yang
menyala berurutan), `analogi` (perumpamaan sehari-hari, maks ± 85 huruf).
Suara: `id-ID-ArdiNeural` (pria) atau `id-ID-GadisNeural` (wanita).

## Resep naskah yang menarik untuk orang awam
- Adegan pertama: pertanyaan yang bikin penasaran ("Kok bisa?").
- Satu adegan = satu ide. Narasi 2–3 kalimat pendek.
- Pakai perumpamaan benda sehari-hari (dinamo sepeda, selang air, kode morse).
- Tulis angka dalam kata di `narasi` ("lima ratus ribu volt") supaya suaranya benar.
- Penutup: sebut topik besok + ajak follow.

## Di laptop (opsional)
```
npm install
pip install edge-tts
node scripts/build.mjs 01-listrik    # hasil: out/01-listrik.mp4
```
