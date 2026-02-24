export const COLORS = {
  primary: '#0d968b',
  primaryLight: 'rgba(13, 150, 139, 0.1)',
  dark: '#111817',
  secondary: '#618986',
  bg: '#f6f8fa',
  white: '#ffffff',
  success: '#22c55e',
  successLight: 'rgba(34, 197, 94, 0.1)',
} as const;

export const VIDEO = {
  width: 1280,
  height: 720,
  fps: 30,
} as const;

/** Scene durations in seconds */
export const SCENE_DURATION = {
  startJob: 4,
  washing: 3,
  smsSent: 3,
  customerPing: 4,
} as const;

/** Total duration in seconds */
export const TOTAL_DURATION =
  SCENE_DURATION.startJob +
  SCENE_DURATION.washing +
  SCENE_DURATION.smsSent +
  SCENE_DURATION.customerPing;

/** Scene durations in frames (at 30fps) */
export const SCENE_FRAMES = {
  startJob: SCENE_DURATION.startJob * VIDEO.fps,
  washing: SCENE_DURATION.washing * VIDEO.fps,
  smsSent: SCENE_DURATION.smsSent * VIDEO.fps,
  customerPing: SCENE_DURATION.customerPing * VIDEO.fps,
} as const;

export const TOTAL_FRAMES = TOTAL_DURATION * VIDEO.fps;

export const SMS_TEXT = {
  tagalog: 'Tapos na ang inyong labada sa LaundryPing.',
  english: 'Your laundry is ready for pickup. Thank you!',
} as const;
