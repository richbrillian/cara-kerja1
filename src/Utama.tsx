import React from 'react';
import {Audio, interpolate, staticFile, useVideoConfig} from 'remotion';
import {Video} from './Video';
import type {Props} from './types';

// Video + musik latar (pelan di bawah suara, muncul dan menghilang halus)
export const Utama: React.FC<Props> = (props) => {
  const {durationInFrames} = useVideoConfig();
  const {episode} = props;
  const vol = episode.volumeMusik ?? 0.13;
  return (
    <>
      <Video {...props} />
      {episode.musikFile ? (
        <Audio
          src={staticFile(episode.musikFile)}
          loop
          volume={(f) =>
            interpolate(f, [0, 30, durationInFrames - 60, durationInFrames], [0, vol, vol, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })
          }
        />
      ) : null}
    </>
  );
};
