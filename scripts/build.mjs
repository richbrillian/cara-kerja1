// Pemakaian:  node scripts/build.mjs            -> semua episode
//             node scripts/build.mjs 01-listrik -> satu episode (boleh beberapa, pisahkan koma)
// Per episode: suara (ElevenLabs bila ada kunci API, kalau tidak suara gratis edge-tts)
//              -> musik latar orisinal -> render MP4 ke out/<episode>.mp4
import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {bikinMusik} from './musik.mjs';

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
const cfg = fs.existsSync('pengaturan.json') ? JSON.parse(fs.readFileSync('pengaturan.json', 'utf8')) : {};
const elKey = process.env.ELEVENLABS_API_KEY || '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');

function ttsEdge(text, voice, rate, file) {
  for (let n = 1; n <= 3; n++) {
    try {
      execFileSync(
        'python3',
        ['-m', 'edge_tts', '--voice', voice, `--rate=${rate}`, '--text', text, '--write-media', file],
        {stdio: 'inherit'},
      );
      if (fs.statSync(file).size > 1000) return true;
    } catch {
      console.warn(`Suara gratis gagal dibuat (percobaan ${n}/3)`);
    }
  }
  fs.rmSync(file, {force: true});
  return false;
}

async function ttsEleven({text, prev, next, voiceId, model, settings, file}) {
  for (let n = 1; n <= 3; n++) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: {'xi-api-key': elKey, 'Content-Type': 'application/json'},
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: settings,
        ...(prev ? {previous_text: prev} : {}),
        ...(next ? {next_text: next} : {}),
      }),
    });
    if (res.ok) {
      fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      return true;
    }
    console.warn(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
    if (![429, 500, 502, 503, 504].includes(res.status)) return false;
    await sleep(3000 * n);
  }
  return false;
}

for (const id of ids) {
  const base = JSON.parse(fs.readFileSync(`${dir}/${id}.json`, 'utf8'));
  // pengaturan.json memberi nilai bawaan; isi file episode menang
  const ep = {...(cfg.default || {}), ...((cfg.episode || {})[id] || {}), ...base};
  ep.id = id;

  const pakaiEl = !!elKey && !!ep.suaraEl;
  const model = ep.modelEl || cfg.model || 'eleven_multilingual_v2';
  const settings = {
    stability: 0.5,
    similarity_boost: 0.8,
    style: 0.3,
    use_speaker_boost: true,
    speed: 1.0,
    ...(cfg.suaraPengaturan || {}),
  };
  const voice = ep.suara || 'id-ID-ArdiNeural';
  const rate = ep.kecepatan || '+5%';
  const mesin = pakaiEl ? `el|${ep.suaraEl}|${model}|${JSON.stringify(settings)}` : `edge|${voice}|${rate}`;
  console.log(`\n[${id}] suara: ${process.env.SKIP_VOICE ? 'dilewati' : pakaiEl ? 'ElevenLabs' : 'gratis (edge-tts)'}`);

  fs.mkdirSync(`public/audio/${id}`, {recursive: true});
  for (let i = 0; i < ep.adegan.length; i++) {
    const a = ep.adegan[i];
    if (process.env.SKIP_VOICE) {
      a.audio = null;
      continue;
    }
    // nama file memuat hash teks + mesin: tidak berubah = tidak dibuat ulang (hemat kredit)
    const rel = `audio/${id}/${i}-${md5(a.narasi + mesin).slice(0, 8)}.mp3`;
    const abs = `public/${rel}`;
    let ok = fs.existsSync(abs);
    if (!ok) {
      ok = pakaiEl
        ? await ttsEleven({
            text: a.narasi,
            prev: ep.adegan[i - 1]?.narasi,
            next: ep.adegan[i + 1]?.narasi,
            voiceId: ep.suaraEl,
            model,
            settings,
            file: abs,
          })
        : ttsEdge(a.narasi, voice, rate, abs);
    }
    if (!ok) {
      if (process.env.REQUIRE_VOICE) {
        console.error('Suara gagal dibuat, proses dibatalkan.');
        process.exit(1);
      }
      a.audio = null;
      continue;
    }
    a.audio = rel;
  }

  // musik latar: gaya bawaan (dibuat lewat kode) atau file milik sendiri di public/musik/
  ep.musikFile = null;
  const m = ep.musik;
  if (m && m !== 'tanpa') {
    fs.mkdirSync('public/musik', {recursive: true});
    if (/\.(mp3|wav|m4a|ogg)$/i.test(m)) {
      if (fs.existsSync(`public/musik/${m}`)) ep.musikFile = `musik/${m}`;
      else console.warn(`File musik public/musik/${m} tidak ditemukan, video dibuat tanpa musik.`);
    } else {
      const f = `public/musik/${id}-${m}.wav`;
      bikinMusik(m, f, parseInt(md5(id).slice(0, 6), 16));
      ep.musikFile = `musik/${id}-${m}.wav`;
    }
  }
  ep.volumeMusik = ep.volumeMusik ?? cfg.volumeMusik ?? 0.13;

  fs.writeFileSync(`out/${id}.props.json`, JSON.stringify({episode: ep}));
  if (process.env.SKIP_RENDER) continue;
  console.log(`=== Render ${id} ===`);
  execFileSync(
    'npx',
    ['remotion', 'render', 'src/index.ts', 'Video', `out/${id}.mp4`, `--props=out/${id}.props.json`, ...extra],
    {stdio: 'inherit'},
  );
}
