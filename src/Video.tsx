import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type {Adegan, Props} from './types';

export const PAD = 12; // jeda kecil di akhir tiap adegan (frame)

const FONT = '"Inter","Noto Sans","Segoe UI",system-ui,sans-serif';
const EMOJI = '"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const fmt = (n: number) =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/* ---------- latar bergerak ---------- */
const Bg: React.FC<{warna: string}> = ({warna}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{background: `radial-gradient(circle at 50% 28%, ${warna}33 0%, #0B1A33 38%, #060C1A 80%)`}}
    >
      {Array.from({length: 16}).map((_, i) => {
        const x = (i * 197) % 1080;
        const y = 1920 - ((f * (0.5 + (i % 5) * 0.25) * 2 + i * 260) % 2100) + 80;
        const s = 8 + (i % 4) * 5;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: s,
              height: s,
              borderRadius: '50%',
              background: warna,
              opacity: 0.12 + 0.05 * (i % 4),
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const Header: React.FC<{channel: string; warna: string; total: number}> = ({channel, warna, total}) => {
  const f = useCurrentFrame();
  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 60,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: '#8FA3C2',
          fontFamily: FONT,
          fontSize: 30,
          fontWeight: 800,
          letterSpacing: 6,
        }}
      >
        {channel}
      </div>
      <div
        style={{
          position: 'absolute',
          top: 125,
          left: 70,
          right: 70,
          height: 10,
          borderRadius: 5,
          background: 'rgba(255,255,255,0.14)',
          overflow: 'hidden',
        }}
      >
        <div style={{width: `${(f / total) * 100}%`, height: '100%', background: warna}} />
      </div>
    </>
  );
};

/* ---------- teks karaoke ---------- */
const chunkify = (text: string): string[] => {
  const out: string[] = [];
  let cur: string[] = [];
  for (const w of text.split(/\s+/).filter(Boolean)) {
    cur.push(w);
    if (cur.length >= 3 || /[.,?!]$/.test(w)) {
      out.push(cur.join(' '));
      cur = [];
    }
  }
  if (cur.length) out.push(cur.join(' '));
  return out;
};

const Karaoke: React.FC<{text: string; talkEnd: number; warna: string}> = ({text, talkEnd, warna}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const chunks = React.useMemo(() => chunkify(text), [text]);
  const w = chunks.map((c) => c.length + 5);
  const total = w.reduce((a, b) => a + b, 0);
  const t = Math.min(f / talkEnd, 0.9999) * total;
  let acc = 0;
  let idx = chunks.length - 1;
  for (let i = 0; i < chunks.length; i++) {
    if (t < acc + w[i]) {
      idx = i;
      break;
    }
    acc += w[i];
  }
  const startW = w.slice(0, idx).reduce((s, x) => s + x, 0);
  const startF = (startW / total) * talkEnd;
  const pop = spring({frame: f - startF, fps, config: {damping: 12, stiffness: 220}});
  return (
    <div
      style={{
        position: 'absolute',
        left: 60,
        right: 60,
        top: 1320,
        height: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      <div style={{transform: `scale(${0.82 + 0.18 * Math.min(pop, 1.12)})`, lineHeight: 1.25}}>
        <span
          style={{
            fontFamily: FONT,
            fontSize: 84,
            fontWeight: 900,
            color: '#0B1A33',
            background: warna,
            padding: '2px 24px',
            borderRadius: 26,
            boxDecorationBreak: 'clone',
            WebkitBoxDecorationBreak: 'clone',
          }}
        >
          {chunks[idx]}
        </span>
      </div>
    </div>
  );
};

/* ---------- satu adegan ---------- */
const Scene: React.FC<{a: Adegan; nomor: number; warna: string; d: number}> = ({a, nomor, warna, d}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const talkEnd = d - PAD;
  const t = Math.min(f / talkEnd, 1);
  const o = interpolate(f, [0, 5, d - 5, d], [0, 1, 1, 0], clamp);
  const pop = Math.min(spring({frame: f, fps, config: {damping: 10, stiffness: 120}}), 1.15);
  const float = Math.sin(f / 9) * 10;
  const ti = interpolate(f, [8, 22], [0, 1], clamp);

  const angkaNum = a.angka && /^[\d.]+$/.test(a.angka) ? parseInt(a.angka.replace(/\./g, ''), 10) : null;
  const prog = interpolate(f, [4, 45], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const angkaText = angkaNum !== null ? fmt(angkaNum * prog) : a.angka;

  const alur = a.alur ?? [];
  const nodeSize = alur.length > 5 ? 110 : 130;
  const aktif = Math.min(alur.length - 1, Math.floor(Math.min(t * 1.15, 0.999) * alur.length));

  return (
    <AbsoluteFill style={{opacity: o}}>
      {a.tipe === 'langkah' && (
        <div
          style={{
            position: 'absolute',
            top: 190,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: FONT,
            fontSize: 40,
            fontWeight: 900,
            letterSpacing: 8,
            color: warna,
          }}
        >
          LANGKAH {nomor}
        </div>
      )}

      {/* gambar utama: emoji besar atau angka besar */}
      <div
        style={{
          position: 'absolute',
          top: 250,
          left: 0,
          right: 0,
          height: 480,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {angkaText ? (
          <>
            <div
              style={{
                fontFamily: FONT,
                fontWeight: 900,
                fontSize: angkaText.length > 7 ? 150 : 210,
                color: warna,
                lineHeight: 1,
                transform: `scale(${0.7 + 0.3 * pop})`,
              }}
            >
              {angkaText}
            </div>
            {a.satuan && (
              <div style={{fontFamily: FONT, fontSize: 56, fontWeight: 800, color: '#fff', marginTop: 12}}>
                {a.satuan}
              </div>
            )}
          </>
        ) : (
          <div
            style={{
              fontFamily: EMOJI,
              fontSize: 300,
              lineHeight: 1,
              transform: `translateY(${float}px) scale(${0.4 + 0.6 * pop}) rotate(${(1 - Math.min(pop, 1)) * -20}deg)`,
              filter: `drop-shadow(0 0 60px ${warna}AA)`,
            }}
          >
            {a.emoji}
          </div>
        )}
      </div>

      {/* judul */}
      <div
        style={{
          position: 'absolute',
          top: 760,
          left: 60,
          right: 60,
          textAlign: 'center',
          fontFamily: FONT,
          fontSize: 76,
          fontWeight: 900,
          lineHeight: 1.1,
          color: '#fff',
          opacity: ti,
          transform: `translateY(${(1 - ti) * 40}px)`,
        }}
      >
        {a.judul}
      </div>

      {/* alur emoji yang menyala berurutan */}
      {alur.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 985,
            left: 30,
            right: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {alur.map((e, k) => {
            const nyala = k <= aktif;
            const now = k === aktif;
            return (
              <React.Fragment key={k}>
                <div
                  style={{
                    width: nodeSize,
                    height: nodeSize,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: EMOJI,
                    fontSize: nodeSize * 0.58,
                    background: now ? `${warna}44` : 'rgba(255,255,255,0.08)',
                    border: `4px solid ${now ? warna : 'rgba(255,255,255,0.15)'}`,
                    opacity: nyala ? (now ? 1 : 0.55) : 0.15,
                    transform: `scale(${now ? 1.15 : 1})`,
                  }}
                >
                  {e}
                </div>
                {k < alur.length - 1 && (
                  <div style={{fontFamily: FONT, fontSize: 44, fontWeight: 900, color: warna, opacity: nyala ? 1 : 0.15}}>
                    ›
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* perumpamaan */}
      {a.analogi && (
        <div
          style={{
            position: 'absolute',
            top: alur.length ? 1140 : 1000,
            left: 70,
            right: 70,
            padding: '20px 30px',
            borderRadius: 30,
            background: 'rgba(255,255,255,0.08)',
            border: `3px solid ${warna}66`,
            fontFamily: FONT,
            fontSize: 38,
            lineHeight: 1.3,
            color: '#E8F0FF',
            textAlign: 'center',
            opacity: interpolate(f, [talkEnd * 0.3, talkEnd * 0.3 + 14], [0, 1], clamp),
          }}
        >
          💭 {a.analogi}
        </div>
      )}

      {/* tombol follow di penutup */}
      {a.tipe === 'penutup' && (
        <div
          style={{
            position: 'absolute',
            top: 1010,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            transform: `scale(${1 + 0.06 * Math.sin(f / 4)})`,
          }}
        >
          <div
            style={{
              fontFamily: FONT,
              fontSize: 60,
              fontWeight: 900,
              background: warna,
              color: '#0B1A33',
              padding: '18px 60px',
              borderRadius: 60,
            }}
          >
            + FOLLOW
          </div>
        </div>
      )}

      <Karaoke text={a.narasi} talkEnd={talkEnd} warna={warna} />
    </AbsoluteFill>
  );
};

/* ---------- video utama ---------- */
export const Video: React.FC<Props> = ({episode, durasi}) => {
  const d = durasi ?? episode.adegan.map(() => 180);
  const total = d.reduce((x, y) => x + y, 0);
  let start = 0;
  let langkah = 0;
  return (
    <AbsoluteFill style={{backgroundColor: '#060C1A'}}>
      <Bg warna={episode.warna} />
      {episode.adegan.map((a, i) => {
        const from = start;
        start += d[i];
        const nomor = a.tipe === 'langkah' ? ++langkah : 0;
        return (
          <Sequence key={i} from={from} durationInFrames={d[i]}>
            <Scene a={a} nomor={nomor} warna={episode.warna} d={d[i]} />
            {a.audio ? <Audio src={staticFile(a.audio)} /> : null}
          </Sequence>
        );
      })}
      <Header channel={episode.channel} warna={episode.warna} total={total} />
    </AbsoluteFill>
  );
};
