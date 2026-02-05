import React from 'react';
import { Composition } from 'remotion';
import { ProtocolMotion } from './ProtocolMotion';

export const RemotionVideo: React.FC = () => {
  return (
    <>
      <Composition
        id="ProtocolFlow"
        component={ProtocolMotion}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
