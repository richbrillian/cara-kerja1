import React from 'react';
import {AbsoluteFill, Audio, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

export type ReelsProps = {
  /** path foto di folder public, mis. "foto/a.jpg" (kosong = latar warna) */
  foto: string | null;
  /** kalimat besar di video */
  teks: string;
  /** file musik di folder public */
  musikFile: string | null;
  volumeMusik: number;
  /** tulisan kecil di bawah (nama halaman), boleh kosong */
  handle: string;
  /** warna cadangan kalau tidak ada foto */
  warna: string;
};

const FONT = 'Inter, "Noto Sans", Arial, sans-serif';

export const Reels: React.FC<ReelsProps> = ({foto, teks, musikFile, volumeMusik, handle, warna}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();

  // foto bergerak pelan (zoom dan geser) supaya terasa hidup
  const t = frame / durationInFrames;
  const zoom = 1.04 + t * 0.12;
  const geserX = interpolate(t, [0, 1], [-18, 18]);
  const geserY = interpolate(t, [0, 1], [10, -14]);

  const kata = teks.split(/\s+/).filter(Boolean);
  const mulai = 14; // frame awal teks
  const perKata = Math.max(3, Math.min(7, Math.floor((durationInFrames * 0.45) / kata.length)));

  const fadeAkhir = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#111', opacity: fadeAkhir}}>
      {foto ? (
        <AbsoluteFill style={{overflow: 'hidden'}}>
          <Img
            src={staticFile(foto)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `translate(${geserX}px, ${geserY}px) scale(${zoom})`,
            }}
          />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{background: `linear-gradient(160deg, ${warna}, #1b1b2f)`}} />
      )}

      {/* gradasi gelap supaya tulisan terbaca */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.45) 35%, rgba(0,0,0,0) 62%)',
        }}
      />

      <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 300}}>
        <div
          style={{
            width: 900,
            textAlign: 'center',
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 70,
            lineHeight: 1.22,
            color: '#fff',
            textShadow: '0 4px 18px rgba(0,0,0,0.7)',
          }}
        >
          {kata.map((k, i) => {
            const awal = mulai + i * perKata;
            const o = interpolate(frame, [awal, awal + 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
            const y = interpolate(frame, [awal, awal + 6], [18, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
            return (
              <span key={i} style={{display: 'inline-block', opacity: o, transform: `translateY(${y}px)`, marginRight: 16}}>
                {k}
              </span>
            );
          })}
        </div>
        {handle ? (
          <div
            style={{
              marginTop: 36,
              fontFamily: FONT,
              fontSize: 34,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.8)',
              opacity: interpolate(frame, [mulai + kata.length * perKata, mulai + kata.length * perKata + 12], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          >
            {handle}
          </div>
        ) : null}
      </AbsoluteFill>

      {musikFile ? (
        <Audio
          src={staticFile(musikFile)}
          loop
          volume={(f) =>
            interpolate(f, [0, 20, durationInFrames - 30, durationInFrames], [0, volumeMusik, volumeMusik, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })
          }
        />
      ) : null}
    </AbsoluteFill>
  );
};
