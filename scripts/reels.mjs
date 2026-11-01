// Membuat reels dari foto sendiri + kata di reels/kata.json + musik orisinal.
// Pemakaian:  node scripts/reels.mjs [jumlah|all] [mulaiDariNomor]
//   foto  : taruh di public/foto/ (jpg, jpeg, png, webp). Dipakai bergiliran.
//   kata  : reels/kata.json -> [{"teks": "...", "caption": "..."}]
//   hasil : out/reels-01.mp4 + out/reels-01.txt (caption siap salin)
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {bikinMusik} from './musik.mjs';

const kata = JSON.parse(fs.readFileSync('reels/kata.json', 'utf8'));
const jumlah = process.argv[2] === 'all' ? kata.length : Number(process.argv[2]) || 5;
const mulai = (Number(process.argv[3]) || 1) - 1;
const handle = process.env.REELS_HANDLE ?? '';
const extra = (process.env.REMOTION_EXTRA || '').split(' ').filter(Boolean);

const fotoDir = 'public/foto';
const foto = fs.existsSync(fotoDir)
  ? fs.readdirSync(fotoDir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort()
  : [];
if (!foto.length) console.warn('Belum ada foto di public/foto/. Reels dibuat dengan latar warna.');

const gaya = ['tenang', 'ceria', 'tenang', 'misteri'];
const warna = ['#8e44ad', '#c0392b', '#16a085', '#2c3e50', '#d35400'];
fs.mkdirSync('out', {recursive: true});
fs.mkdirSync('public/musik', {recursive: true});

for (let n = 0; n < jumlah; n++) {
  const idx = (mulai + n) % kata.length;
  const nomor = String(mulai + n + 1).padStart(2, '0');
  const g = gaya[idx % gaya.length];
  const musikFile = `musik/reels-${g}.wav`;
  if (!fs.existsSync(`public/${musikFile}`)) bikinMusik(g, `public/${musikFile}`, 11 + idx);

  const props = {
    foto: foto.length ? `foto/${foto[idx % foto.length]}` : null,
    teks: kata[idx].teks,
    musikFile,
    volumeMusik: 0.5,
    handle,
    warna: warna[idx % warna.length],
  };
  const pf = `out/reels-${nomor}.props.json`;
  fs.writeFileSync(pf, JSON.stringify(props));
  fs.writeFileSync(`out/reels-${nomor}.txt`, `${kata[idx].teks}\n\n${kata[idx].caption}\n`);
  console.log(`=== Reels ${nomor}: ${kata[idx].teks} ===`);
  execFileSync('npx', ['remotion', 'render', 'src/index.ts', 'Reels', `out/reels-${nomor}.mp4`, `--props=${pf}`, ...extra], {
    stdio: 'inherit',
  });
}
