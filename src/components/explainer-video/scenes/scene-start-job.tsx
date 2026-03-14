import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { COLORS } from '../constants';

export const SceneStartJob: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Card fade in
  const cardOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const cardY = interpolate(frame, [0, 0.5 * fps], [30, 0], {
    extrapolateRight: 'clamp',
  });

  // Form elements stagger in
  const dropdownOpacity = interpolate(
    frame,
    [0.4 * fps, 0.8 * fps],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const phoneOpacity = interpolate(frame, [0.6 * fps, 1 * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Cursor appears and clicks button
  const cursorOpacity = interpolate(
    frame,
    [1.5 * fps, 1.7 * fps],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const cursorX = interpolate(frame, [1.5 * fps, 2.2 * fps], [200, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cursorY = interpolate(frame, [1.5 * fps, 2.2 * fps], [-80, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Button press animation
  const buttonPress = spring({
    frame: frame - Math.round(2.3 * fps),
    fps,
    config: { damping: 8, stiffness: 200 },
  });
  const buttonScale = interpolate(buttonPress, [0, 0.5, 1], [1, 0.92, 1]);

  // Success confirmation
  const showSuccess = frame > 2.8 * fps;
  const successSpring = spring({
    frame: frame - Math.round(2.8 * fps),
    fps,
    config: { damping: 12 },
  });
  const successScale = showSuccess ? successSpring : 0;

  // Step label
  const labelOpacity = interpolate(frame, [0.2 * fps, 0.6 * fps], [0, 1], {
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
      {/* Dashboard card */}
      <div
        style={{
          opacity: cardOpacity,
          transform: `translateY(${cardY}px)`,
          backgroundColor: COLORS.white,
          borderRadius: 16,
          border: `1px solid ${COLORS.primaryLight}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          padding: 40,
          width: 480,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: COLORS.dark,
            marginBottom: 24,
          }}
        >
          Start New Job
        </div>

        {/* Machine dropdown */}
        <div style={{ opacity: dropdownOpacity, marginBottom: 16 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: COLORS.secondary,
              marginBottom: 6,
            }}
          >
            Machine
          </div>
          <div
            style={{
              backgroundColor: COLORS.bg,
              border: `1px solid ${COLORS.primaryLight}`,
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 15,
              color: COLORS.dark,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>Machine #3</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={COLORS.secondary}
              strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>

        {/* Phone field */}
        <div style={{ opacity: phoneOpacity, marginBottom: 24 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: COLORS.secondary,
              marginBottom: 6,
            }}
          >
            Customer Phone
          </div>
          <div
            style={{
              backgroundColor: COLORS.bg,
              border: `1px solid ${COLORS.primaryLight}`,
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 15,
              color: COLORS.dark,
            }}
          >
            0917-123-4567
          </div>
        </div>

        {/* Start button */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              transform: `scale(${buttonScale})`,
              backgroundColor: COLORS.primary,
              color: COLORS.white,
              borderRadius: 10,
              padding: '12px 0',
              textAlign: 'center' as const,
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {showSuccess ? 'Job Started!' : 'Start Job'}
          </div>

          {/* Cursor */}
          <div
            style={{
              position: 'absolute',
              right: 60 + cursorX,
              bottom: -10 + cursorY,
              opacity: cursorOpacity,
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill={COLORS.dark}
            >
              <path d="M5 3l14 8-6.5 1.5L11 19z" />
            </svg>
          </div>
        </div>

        {/* Success checkmark */}
        <div
          style={{
            marginTop: 16,
            textAlign: 'center' as const,
            transform: `scale(${successScale})`,
            opacity: successScale,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: COLORS.successLight,
              color: COLORS.success,
              fontSize: 14,
              fontWeight: 600,
              padding: '8px 16px',
              borderRadius: 8,
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={COLORS.success}
              strokeWidth="2.5"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Job Started Successfully!
          </div>
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
        1. Start a job
      </div>
    </AbsoluteFill>
  );
};
