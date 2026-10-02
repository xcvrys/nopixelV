import type { FirewallRunConfig } from "./types";

export const BOARD_WIDTH = 970;
export const BOARD_HEIGHT = 485;
export const LANE_COUNT = 6;
export const LANE_WIDTH = BOARD_WIDTH / LANE_COUNT;
/** The player chip. */
export const ELEMENT_SIZE = 24;
/** A sealed wall block. */
export const BLOCK_SIZE = 36;
/** Vertical distance between consecutive wall rows. */
export const WALL_SPACING = 256;
/** Player centre sits 57px above the bottom line. */
export const PLAYER_CENTER_Y = BOARD_HEIGHT - 57;
export const START_LANE = 2;
/** ponytail: a backgrounded tab delivers one huge delta; clamp it so a stall costs time, not the run. */
export const MAX_STEP_SECONDS = 0.1;

export const FIREWALL_RUN_CONFIG: FirewallRunConfig = {
  runSeconds: 20,
  wallSpeed: 480,
};
