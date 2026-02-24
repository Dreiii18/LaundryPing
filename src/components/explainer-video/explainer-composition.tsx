import { AbsoluteFill, Series } from 'remotion';
import { SCENE_FRAMES, COLORS } from './constants';
import { SceneStartJob } from './scenes/scene-start-job';
import { SceneWashing } from './scenes/scene-washing';
import { SceneSmsSent } from './scenes/scene-sms-sent';
import { SceneCustomerPing } from './scenes/scene-customer-ping';

export const ExplainerComposition: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <Series>
        <Series.Sequence durationInFrames={SCENE_FRAMES.startJob}>
          <SceneStartJob />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENE_FRAMES.washing}>
          <SceneWashing />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENE_FRAMES.smsSent}>
          <SceneSmsSent />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENE_FRAMES.customerPing}>
          <SceneCustomerPing />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
