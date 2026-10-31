// Pemakaian:  node scripts/build.mjs            -> semua episode
//             node scripts/build.mjs 01-listrik -> satu episode (boleh beberapa, pisahkan koma)
// Langkah per episode: buat suara gratis (edge-tts) -> render video MP4 -> out/<episode>.mp4
import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const dir = 'episodes';
const want = (process.argv[2] || '').split(',').map((s) => s.trim()).filter(Boolean);
const ids = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))
  .sort()
  .filter((id) => want.length === 0 || want.some((w) => id === w || id.startsWith(w)));

if (!ids.length) {
  console.error('Tidak ada episode yang cocok.');
  process.exit(1);
}
fs.mkdirSync('out', {recursive: true});
const extra = (process.env.REMOTION_EXTRA || '').split(' ').filter(Boolean);

function tts(text, voice, rate, file) {
  for (let n = 1; n <= 3; n++) {
    try {
      execFileSync(
        'python3',
        ['-m', 'edge_tts', '--voice', voice, `--rate=${rate}`, '--text', text, '--write-media', file],
        {stdio: 'inherit'},
      );
      if (fs.statSync(file).size > 1000) return true;
    } catch {
      console.warn(`Suara gagal dibuat (percobaan ${n}/3)`);
    }
  }
  fs.rmSync(file, {force: true});
  return false;
}

for (const id of ids) {
  const ep = JSON.parse(fs.readFileSync(`${dir}/${id}.json`, 'utf8'));
  ep.id = id;
  const voice = ep.suara || 'id-ID-ArdiNeural';
  const rate = ep.kecepatan || '+5%';
  fs.mkdirSync(`public/audio/${id}`, {recursive: true});

  for (let i = 0; i < ep.adegan.length; i++) {
    const a = ep.adegan[i];
    if (process.env.SKIP_VOICE) {
      a.audio = null;
      continue;
    }
    // nama file memuat hash teks: narasi yang tidak berubah tidak dibuat ulang
    const hash = crypto.createHash('md5').update(a.narasi + voice + rate).digest('hex').slice(0, 8);
    const rel = `audio/${id}/${i}-${hash}.mp3`;
    if (!fs.existsSync(`public/${rel}`) && !tts(a.narasi, voice, rate, `public/${rel}`)) {
      if (process.env.REQUIRE_VOICE) {
        console.error('Suara gagal dibuat, proses dibatalkan.');
        process.exit(1);
      }
      a.audio = null;
      continue;
    }
    a.audio = rel;
  }

  fs.writeFileSync(`out/${id}.props.json`, JSON.stringify({episode: ep}));
  if (process.env.SKIP_RENDER) continue;
  console.log(`\n=== Render ${id} ===`);
  execFileSync(
    'npx',
    ['remotion', 'render', 'src/index.ts', 'Video', `out/${id}.mp4`, `--props=out/${id}.props.json`, ...extra],
    {stdio: 'inherit'},
  );
}
