import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { COLORS, SMS_TEXT } from '../constants';

export const SceneSmsSent: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // "Mark Done" button appears
  const buttonOpacity = interpolate(frame, [0, 0.4 * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Button press
  const pressFrame = 0.8 * fps;
  const buttonPress = spring({
    frame: frame - Math.round(pressFrame),
    fps,
    config: { damping: 8, stiffness: 200 },
  });
  const buttonScale = frame > pressFrame
    ? interpolate(buttonPress, [0, 0.5, 1], [1, 0.9, 1])
    : 1;

  // Message bubble flies out
  const bubbleDelay = 1.2 * fps;
  const bubbleSpring = spring({
    frame: frame - Math.round(bubbleDelay),
    fps,
    config: { damping: 12 },
  });
  const bubbleX = frame > bubbleDelay
    ? interpolate(bubbleSpring, [0, 1], [0, 200])
    : 0;
  const bubbleY = frame > bubbleDelay
    ? interpolate(bubbleSpring, [0, 1], [0, -120])
    : 0;
  const bubbleScale = frame > bubbleDelay ? bubbleSpring : 0;

  // SMS text fades in
  const textDelay = 1.8 * fps;
  const textOpacity = interpolate(
    frame,
    [textDelay, textDelay + 0.5 * fps],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Sent checkmark
  const checkDelay = 2.3 * fps;
  const checkSpring = spring({
    frame: frame - Math.round(checkDelay),
    fps,
    config: { damping: 10 },
  });
  const checkScale = frame > checkDelay ? checkSpring : 0;

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
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 30,
          position: 'relative',
        }}
      >
        {/* Mark Done button */}
        <div
          style={{
            opacity: buttonOpacity,
            transform: `scale(${buttonScale})`,
            backgroundColor: COLORS.primary,
            color: COLORS.white,
            borderRadius: 10,
            padding: '14px 40px',
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          {frame > pressFrame ? 'Sending SMS...' : 'Mark Done'}
        </div>

        {/* Flying message bubble */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(calc(-50% + ${bubbleX}px), calc(-50% + ${bubbleY}px)) scale(${bubbleScale})`,
            opacity: bubbleScale,
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill={COLORS.primary}
          >
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </div>

        {/* SMS content card */}
        <div
          style={{
            opacity: textOpacity,
            backgroundColor: COLORS.white,
            borderRadius: 16,
            border: `1px solid ${COLORS.primaryLight}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            padding: '24px 32px',
            maxWidth: 440,
            position: 'relative',
          }}
        >
          {/* SMS icon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: COLORS.primaryLight,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={COLORS.primary}
                strokeWidth="2"
              >
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: COLORS.secondary,
              }}
            >
              SMS Notification
            </span>
          </div>

          {/* Message text */}
          <div
            style={{
              fontSize: 15,
              lineHeight: 1.6,
              color: COLORS.dark,
            }}
          >
            <div>{SMS_TEXT.tagalog}</div>
            <div
              style={{
                color: COLORS.secondary,
                marginTop: 4,
                fontSize: 13,
                borderTop: `1px solid ${COLORS.primaryLight}`,
                paddingTop: 8,
              }}
            >
              {SMS_TEXT.english}
            </div>
          </div>

          {/* Sent checkmark */}
          <div
            style={{
              position: 'absolute',
              top: -12,
              right: -12,
              transform: `scale(${checkScale})`,
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: COLORS.success,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={COLORS.white}
              strokeWidth="3"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
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
        3. SMS sent automatically
      </div>
    </AbsoluteFill>
  );
};
