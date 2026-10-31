// Pembuat musik latar ORISINAL lewat kode: tidak ada sampel/lagu orang lain,
// jadi bebas hak cipta dan aman dimonetisasi.
// Pemakaian:  node scripts/musik.mjs <ceria|tenang|misteri|energik> <file.wav> [bibit]
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

const SR = 44100;

// bar = urutan akor (nada dasar MIDI, 'M' = mayor, 'm' = minor)
const GAYA = {
  ceria: {bpm: 104, bar: [[48, 'M'], [55, 'M'], [57, 'm'], [53, 'M']], drum: 'pop', arp: 8, melodi: 1, pad: 0.1},
  tenang: {bpm: 76, bar: [[57, 'm'], [53, 'M'], [48, 'M'], [55, 'M']], drum: 'none', arp: 4, melodi: 0.5, pad: 0.14},
  misteri: {bpm: 90, bar: [[50, 'm'], [55, 'm'], [58, 'M'], [57, 'M']], drum: 'heart', arp: 4, melodi: 0.7, pad: 0.12},
  energik: {bpm: 120, bar: [[55, 'M'], [50, 'M'], [52, 'm'], [48, 'M']], drum: 'four', arp: 8, melodi: 1, pad: 0.09},
};

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const TWO_PI = Math.PI * 2;

export function bikinMusik(gaya, outFile, bibit = 1) {
  const g = GAYA[gaya];
  if (!g) throw new Error(`Gaya musik tidak dikenal: ${gaya} (pilih: ${Object.keys(GAYA).join(', ')})`);

  let seed = (bibit >>> 0) || 1;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const beat = 60 / g.bpm;
  const barDur = beat * 4;
  const bars = 16;
  const N = Math.round(bars * barDur * SR);
  const buf = new Float32Array(N + SR * 4); // ruang ekor nada

  const add = (t0, len, gen) => {
    const s0 = Math.floor(t0 * SR);
    const n = Math.floor(len * SR);
    for (let i = 0; i < n; i++) {
      const j = s0 + i;
      if (j >= buf.length) break;
      buf[j] += gen(i / SR);
    }
  };

  const pad = (m, t0, dur, amp) => {
    const f = hz(m);
    add(t0, dur + 0.6, (t) => {
      const att = Math.min(1, t / 0.45);
      const rel = t > dur ? Math.max(0, 1 - (t - dur) / 0.6) : 1;
      return amp * att * rel * (0.5 * Math.sin(TWO_PI * f * t) + 0.5 * Math.sin(TWO_PI * f * 1.004 * t));
    });
  };
  const pluck = (m, t0, amp) => {
    const f = hz(m);
    add(t0, 0.6, (t) => amp * Math.exp(-t * 7) * Math.min(1, t / 0.004) * (Math.sin(TWO_PI * f * t) + 0.25 * Math.sin(TWO_PI * 2 * f * t) * Math.exp(-t * 10)));
  };
  const bell = (m, t0, amp) => {
    const f = hz(m);
    add(t0, 1.6, (t) => amp * Math.exp(-t * 3.2) * Math.min(1, t / 0.01) * (Math.sin(TWO_PI * f * t) + 0.4 * Math.sin(TWO_PI * 2 * f * t) + 0.15 * Math.sin(TWO_PI * 3 * f * t)));
  };
  const bass = (m, t0, amp) => {
    const f = hz(m);
    add(t0, beat * 2, (t) => amp * Math.min(1, t / 0.01) * Math.exp(-t * 2.2) * (Math.sin(TWO_PI * f * t) + 0.2 * Math.sin(TWO_PI * 2 * f * t)));
  };
  const kick = (t0, amp) =>
    add(t0, 0.3, (t) => amp * Math.exp(-t * 10) * Math.sin(TWO_PI * (45 * t + (90 * (1 - Math.exp(-30 * t))) / 30)));
  const hat = (t0, amp) => {
    let prev = 0;
    add(t0, 0.08, (t) => {
      const n = rand() * 2 - 1;
      const v = n - prev;
      prev = n;
      return amp * Math.exp(-t * 70) * v;
    });
  };

  const melodiRitme = [[0, 1.5, 2.5], [0, 2, 3], [1, 2.5], [0.5, 2, 3.5], [0, 1, 2, 3]];

  for (let b = 0; b < bars; b++) {
    const [root, type] = g.bar[b % 4];
    const tone = [0, type === 'M' ? 4 : 3, 7];
    const t0 = b * barDur;

    // pad akor
    for (const iv of tone) pad(root + 12 + iv, t0, barDur - 0.05, g.pad);
    // bass
    bass(root - 12, t0, 0.32);
    if (g.drum !== 'none' && g.drum !== 'heart') bass(root - 12, t0 + beat * 2, 0.26);

    // arpeggio
    const langkah = g.arp; // 8 = per setengah ketuk, 4 = per ketuk
    const pola = langkah === 8 ? [0, 1, 2, 1, 0, 1, 2, 1] : [0, 2, 1, 2];
    for (let s = 0; s < langkah; s++) {
      const iv = tone[pola[s]];
      pluck(root + 24 + iv, t0 + (s * barDur) / langkah, langkah === 8 ? 0.13 : 0.16);
    }

    // melodi sederhana dari nada akor (aman, selalu selaras), mulai bar ke-5
    if (b >= 4 && g.melodi > 0 && rand() < g.melodi) {
      const ritme = melodiRitme[Math.floor(rand() * melodiRitme.length)];
      for (const pos of ritme) {
        const iv = tone[Math.floor(rand() * 3)];
        bell(root + 24 + 12 * (rand() < 0.35 ? 1 : 0) + iv, t0 + pos * beat, 0.09);
      }
    }

    // perkusi
    if (g.drum === 'pop') {
      kick(t0, 0.5);
      kick(t0 + beat * 2, 0.45);
      for (let k = 0; k < 4; k++) hat(t0 + (k + 0.5) * beat, 0.05);
    } else if (g.drum === 'four') {
      for (let k = 0; k < 4; k++) {
        kick(t0 + k * beat, 0.5);
        hat(t0 + (k + 0.5) * beat, 0.05);
      }
    } else if (g.drum === 'heart') {
      kick(t0, 0.3);
      kick(t0 + beat * 0.75, 0.22);
      kick(t0 + beat * 2, 0.3);
      kick(t0 + beat * 2.75, 0.22);
    }
  }

  // sambung ekor ke awal supaya loop mulus
  const out = new Float32Array(N);
  for (let i = 0; i < buf.length; i++) out[i % N] += buf[i];

  // soft-clip lalu normalisasi puncak
  let peak = 0;
  for (let i = 0; i < N; i++) {
    out[i] = Math.tanh(out[i] * 1.2);
    peak = Math.max(peak, Math.abs(out[i]));
  }
  const gain = peak > 0 ? 0.85 / peak : 1;

  // tulis WAV 16-bit mono
  const data = Buffer.alloc(N * 2);
  for (let i = 0; i < N; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[i] * gain)) * 32767), i * 2);
  const head = Buffer.alloc(44);
  head.write('RIFF', 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write('WAVEfmt ', 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22);
  head.writeUInt32LE(SR, 24);
  head.writeUInt32LE(SR * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write('data', 36);
  head.writeUInt32LE(data.length, 40);
  fs.writeFileSync(outFile, Buffer.concat([head, data]));
  return outFile;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [gaya, file, bibit] = process.argv.slice(2);
  if (!gaya || !file) {
    console.error('Pemakaian: node scripts/musik.mjs <gaya> <file.wav> [bibit]');
    process.exit(1);
  }
  console.log('Musik dibuat:', bikinMusik(gaya, file, Number(bibit) || 1));
}
