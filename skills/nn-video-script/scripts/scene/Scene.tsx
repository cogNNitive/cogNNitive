/**
 * skills/nn-video-script/scripts/scene/Scene.tsx
 *
 * Renders one Remotion scene: background (image or color), narration audio, the
 * scene title, and any overlay components. Purely presentational — all timing and
 * geometry come from the manifest track the CLI passes through `inputProps`.
 */

import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, useVideoConfig } from 'remotion';
import { LowerThird } from './overlays/LowerThird';
import { KineticTitle } from './overlays/KineticTitle';
import { ConceptCallout } from './overlays/ConceptCallout';

type Overlay = {
  id: string;
  type: 'lowerThird' | 'kineticTitle' | 'conceptCallout';
  fromFrame: number;
  durationInFrames: number;
  config: Record<string, unknown>;
};

type AudioBinding = {
  id: string;
  assetPath: string;
  fromFrame: number;
  durationInFrames: number;
  volume?: number;
};

type SceneTrack = {
  id: string;
  fromFrame: number;
  durationInFrames: number;
  sceneType?: string;
  props?: Record<string, unknown>;
};

export const Scene: React.FC<{
  scene: SceneTrack;
  audio?: AudioBinding[];
  overlays?: Overlay[];
}> = ({ scene, audio = [], overlays = [] }) => {
  const { fps } = useVideoConfig();
  const props = scene.props || {};

  const backgroundImage = resolveBackgroundImage(props);
  const title = (props.title as string) || '';

  return (
    <Sequence from={scene.fromFrame} durationInFrames={scene.durationInFrames}>
      <AbsoluteFill style={{ backgroundColor: '#0b0b0f' }}>
        {backgroundImage ? (
          <AbsoluteFill>
            <Img src={backgroundImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </AbsoluteFill>
        ) : null}

        {scene.sceneType === 'chapter_title' && title ? (
          <AbsoluteFill
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              color: '#ffffff',
              fontFamily: 'sans-serif',
              fontSize: 96,
              fontWeight: 800,
              textAlign: 'center',
              padding: 80,
            }}
          >
            {title}
          </AbsoluteFill>
        ) : null}

        {audio.map((track) => (
          <Sequence key={track.id} from={track.fromFrame - scene.fromFrame} durationInFrames={track.durationInFrames}>
            <Audio src={track.assetPath} volume={track.volume ?? 1} />
          </Sequence>
        ))}

        {overlays.map((overlay) =>
          renderOverlay(overlay, overlay.fromFrame - scene.fromFrame, fps),
        )}
      </AbsoluteFill>
    </Sequence>
  );
};

function resolveBackgroundImage(props: Record<string, unknown>): string | null {
  const layers = (props.layers as Record<string, unknown>[]) || [];
  for (const layer of layers) {
    const src = (layer.layer_asset_source as string) || (layer.src as string);
    if (src) return src;
  }
  return null;
}

function renderOverlay(overlay: Overlay, localFrom: number, fps: number): React.ReactNode {
  const common = { durationInFrames: overlay.durationInFrames };
  switch (overlay.type) {
    case 'lowerThird':
      return (
        <Sequence key={overlay.id} from={localFrom} {...common}>
          <LowerThird config={overlay.config} />
        </Sequence>
      );
    case 'kineticTitle':
      return (
        <Sequence key={overlay.id} from={localFrom} {...common}>
          <KineticTitle config={overlay.config} fps={fps} />
        </Sequence>
      );
    case 'conceptCallout':
      return (
        <Sequence key={overlay.id} from={localFrom} {...common}>
          <ConceptCallout config={overlay.config} />
        </Sequence>
      );
    default:
      return null;
  }
}
