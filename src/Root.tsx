import React from 'react';
import {CalculateMetadataFunction, Composition, staticFile} from 'remotion';
import {getAudioDurationInSeconds} from '@remotion/media-utils';
import sample from '../episodes/01-listrik.json';
import {PAD, Video} from './Video';
import type {Episode, Props} from './types';

const FPS = 30;

// Durasi tiap adegan mengikuti panjang suara (kalau belum ada suara: perkiraan dari jumlah kata)
const hitungDurasi: CalculateMetadataFunction<Props> = async ({props}) => {
  const durasi = await Promise.all(
    props.episode.adegan.map(async (a) => {
      if (a.audio) {
        const s = await getAudioDurationInSeconds(staticFile(a.audio));
        return Math.ceil(s * FPS) + PAD;
      }
      const kata = a.narasi.split(/\s+/).length;
      return Math.max(75, Math.ceil((kata / 2.5) * FPS)) + PAD;
    }),
  );
  return {durationInFrames: durasi.reduce((x, y) => x + y, 0), props: {...props, durasi}};
};

export const Root: React.FC = () => (
  <Composition
    id="Video"
    component={Video}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={900}
    defaultProps={{episode: sample as unknown as Episode}}
    calculateMetadata={hitungDurasi}
  />
);
