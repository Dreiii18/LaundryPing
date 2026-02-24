import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { COLORS, SMS_TEXT } from '../constants';

export const SceneCustomerPing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Phone slides up
  const phoneSpring = spring({ frame, fps, config: { damping: 15 } });
  const phoneY = interpolate(phoneSpring, [0, 1], [300, 0]);

  // Notification bar appears
  const notifDelay = 0.6 * fps;
  const notifSpring = spring({
    frame: frame - Math.round(notifDelay),
    fps,
    config: { damping: 12 },
  });
  const notifY = frame > notifDelay
    ? interpolate(notifSpring, [0, 1], [-20, 0])
    : -20;
  const notifOpacity = frame > notifDelay ? notifSpring : 0;

  // Tagalog line appears
  const tagalogDelay = 1.2 * fps;
  const tagalogOpacity = interpolate(
    frame,
    [tagalogDelay, tagalogDelay + 0.4 * fps],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // English line appears
  const englishDelay = 1.8 * fps;
  const englishOpacity = interpolate(
    frame,
    [englishDelay, englishDelay + 0.4 * fps],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Thumbs up / happy indicator
  const thumbsDelay = 2.5 * fps;
  const thumbsSpring = spring({
    frame: frame - Math.round(thumbsDelay),
    fps,
    config: { damping: 8 },
  });
  const thumbsScale = frame > thumbsDelay ? thumbsSpring : 0;

  // Fade out for seamless loop
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 0.8 * fps, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Step label
  const labelOpacity = interpolate(frame, [0.3 * fps, 0.6 * fps], [0, 1], {
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
        opacity: fadeOut,
      }}
    >
      {/* Phone frame */}
      <div
        style={{
          transform: `translateY(${phoneY}px)`,
          width: 300,
          height: 520,
          backgroundColor: COLORS.dark,
          borderRadius: 36,
          padding: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Phone screen */}
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: COLORS.white,
            borderRadius: 24,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Status bar */}
          <div
            style={{
              padding: '14px 20px 8px',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              fontWeight: 600,
              color: COLORS.dark,
            }}
          >
            <span>9:41</span>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill={COLORS.dark}>
                <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3a4.237 4.237 0 00-6 0zm-4-4l2 2a7.074 7.074 0 0110 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
              </svg>
              <svg width="18" height="14" viewBox="0 0 24 14" fill={COLORS.dark}>
                <rect x="0" y="4" width="3" height="10" rx="1" />
                <rect x="5" y="2" width="3" height="12" rx="1" />
                <rect x="10" y="0" width="3" height="14" rx="1" />
              </svg>
            </div>
          </div>

          {/* Notification banner */}
          <div
            style={{
              margin: '8px 10px',
              opacity: notifOpacity,
              transform: `translateY(${notifY}px)`,
              backgroundColor: COLORS.bg,
              borderRadius: 14,
              padding: '12px 14px',
              border: `1px solid ${COLORS.primaryLight}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  backgroundColor: COLORS.primaryLight,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill={COLORS.primary}
                >
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: COLORS.dark,
                }}
              >
                LaundryPing
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: COLORS.secondary,
                  marginLeft: 'auto',
                }}
              >
                now
              </span>
            </div>

            {/* Tagalog */}
            <div
              style={{
                opacity: tagalogOpacity,
                fontSize: 13,
                lineHeight: 1.5,
                color: COLORS.dark,
              }}
            >
              {SMS_TEXT.tagalog}
            </div>

            {/* Separator */}
            <div
              style={{
                opacity: englishOpacity,
                height: 1,
                backgroundColor: COLORS.primaryLight,
                margin: '6px 0',
              }}
            />

            {/* English */}
            <div
              style={{
                opacity: englishOpacity,
                fontSize: 12,
                lineHeight: 1.5,
                color: COLORS.secondary,
              }}
            >
              {SMS_TEXT.english}
            </div>
          </div>

          {/* Happy indicator */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                transform: `scale(${thumbsScale})`,
                opacity: thumbsScale,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: COLORS.successLight,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={COLORS.success}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 10v12" />
                  <path d="M15 5.88L14 10h5.83a2 2 0 011.92 2.56l-2.33 8A2 2 0 0117.5 22H4a2 2 0 01-2-2v-8a2 2 0 012-2h2.76a2 2 0 001.79-1.11L12 2h0a3.13 3.13 0 013 3.88z" />
                </svg>
              </div>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: COLORS.success,
                }}
              >
                Customer notified!
              </span>
            </div>
          </div>

          {/* Home indicator */}
          <div
            style={{
              padding: '8px 0 12px',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 120,
                height: 4,
                borderRadius: 2,
                backgroundColor: COLORS.dark,
                opacity: 0.15,
              }}
            />
          </div>
        </div>
      </div>

      {/* Step label */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          opacity: labelOpacity * fadeOut,
          fontSize: 18,
          fontWeight: 600,
          color: COLORS.secondary,
        }}
      >
        4. Customer gets a text
      </div>
    </AbsoluteFill>
  );
};
