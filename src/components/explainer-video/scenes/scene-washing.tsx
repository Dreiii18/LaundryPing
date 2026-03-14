import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { COLORS } from '../constants';

export const SceneWashing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Card entrance
  const cardSpring = spring({ frame, fps, config: { damping: 200 } });
  const cardScale = interpolate(cardSpring, [0, 1], [0.9, 1]);
  const cardOpacity = cardSpring;

  // Washing machine drum rotation (continuous)
  const rotation = interpolate(frame, [0, durationInFrames], [0, 720]);

  // Status badge transition: "In Progress" -> "Complete"
  const isComplete = frame > 1.8 * fps;
  const completeSpring = spring({
    frame: frame - Math.round(1.8 * fps),
    fps,
    config: { damping: 12 },
  });

  // Clock fast-forward animation
  const clockRotation = interpolate(
    frame,
    [0.3 * fps, 1.8 * fps],
    [0, 360 * 3],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Dots animation for loading
  const dotCount = Math.floor((frame / (fps * 0.4)) % 4);

  // Step label
  const labelOpacity = interpolate(frame, [0.2 * fps, 0.5 * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          opacity: cardOpacity,
          transform: `scale(${cardScale})`,
          backgroundColor: COLORS.white,
          borderRadius: 16,
          border: `1px solid ${COLORS.primaryLight}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          padding: 40,
          width: 420,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
        }}
      >
        {/* Machine header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: COLORS.dark,
            }}
          >
            Machine #3
          </div>

          {/* Status badge */}
          <div
            style={{
              backgroundColor: isComplete
                ? COLORS.successLight
                : COLORS.primaryLight,
              color: isComplete ? COLORS.success : COLORS.primary,
              fontSize: 13,
              fontWeight: 600,
              padding: '6px 14px',
              borderRadius: 20,
              transform: `scale(${isComplete ? 0.8 + completeSpring * 0.2 : 1})`,
            }}
          >
            {isComplete
              ? 'Complete'
              : `In Progress${'.'.repeat(dotCount)}`}
          </div>
        </div>

        {/* Washing machine icon */}
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: 70,
            backgroundColor: COLORS.bg,
            border: `3px solid ${isComplete ? COLORS.success : COLORS.primary}`,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Rotating drum pattern */}
          <svg
            width="90"
            height="90"
            viewBox="0 0 90 90"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <circle
              cx="45"
              cy="45"
              r="35"
              fill="none"
              stroke={isComplete ? COLORS.success : COLORS.primary}
              strokeWidth="2"
              opacity={0.3}
            />
            {[0, 60, 120, 180, 240, 300].map((angle) => (
              <circle
                key={angle}
                cx={45 + 25 * Math.cos((angle * Math.PI) / 180)}
                cy={45 + 25 * Math.sin((angle * Math.PI) / 180)}
                r="6"
                fill={isComplete ? COLORS.success : COLORS.primary}
                opacity={0.2}
              />
            ))}
            <circle
              cx="45"
              cy="45"
              r="8"
              fill={isComplete ? COLORS.success : COLORS.primary}
              opacity={0.4}
            />
          </svg>

          {/* Complete checkmark overlay */}
          {isComplete && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.85)',
                opacity: completeSpring,
              }}
            >
              <svg
                width="50"
                height="50"
                viewBox="0 0 24 24"
                fill="none"
                stroke={COLORS.success}
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
          )}
        </div>

        {/* Clock / timer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: COLORS.secondary,
            fontSize: 15,
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={COLORS.secondary}
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path
              d="M12 6v6l4 2"
              style={{
                transform: `rotate(${clockRotation}deg)`,
                transformOrigin: '12px 12px',
              }}
            />
          </svg>
          <span>{isComplete ? 'Done!' : 'Washing...'}</span>
        </div>
      </div>

      {/* Step label */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          opacity: labelOpacity,
          fontSize: 18,
          fontWeight: 600,
          color: COLORS.secondary,
        }}
      >
        2. Machine runs
      </div>
    </AbsoluteFill>
  );
};
