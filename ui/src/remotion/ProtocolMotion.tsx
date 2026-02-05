import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig, AbsoluteFill } from 'remotion';

export const ProtocolMotion: React.FC = () => {
  const frame = useCurrentFrame();
  const { width: _width, height: _height, fps: _fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 40], [0, 0.4], {
    extrapolateRight: 'clamp',
  });

  const rotation = interpolate(frame, [0, 150], [0, 45]);

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ opacity, textAlign: 'center' }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 400 + i * 200,
              height: 400 + i * 200,
              border: '1px solid rgba(0, 242, 255, 0.2)',
              transform: `translate(-50%, -50%) rotate(${rotation * (i % 2 === 0 ? 1 : -1)}deg)`,
              transition: 'all 0.5s ease',
            }}
          />
        ))}
        <h1 style={{ 
          color: 'white', 
          fontSize: 40, 
          fontWeight: 300, 
          letterSpacing: 25, 
          textTransform: 'uppercase',
          opacity: 0.5 
        }}>
          PYXIS
        </h1>
      </div>
    </AbsoluteFill>
  );
};
