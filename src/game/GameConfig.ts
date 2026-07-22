export const CONFIG = {
  lanes: [-3.2, 0, 3.2],
  segmentLength: 32,
  segmentCount: 7,
  initialSpeed: 15,
  maxSpeed: 31,
  gravity: 28,
  jumpVelocity: 10.5,
  slideDuration: 0.72,
  powerupDuration: 7,
  colors: { yellow: "#f6c739", black: "#090909", white: "#f7f5ef" },
} as const;

export type Quality = "auto" | "high" | "medium" | "low";
export type PowerupKind = "magnet" | "shield";
