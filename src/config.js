// Build-time settings, read from .env (see README). Vite replaces these at build time.

const env = import.meta.env;

/** Public web version of the game. Challenge links point here. */
export const PUBLIC_URL = env.VITE_PUBLIC_URL || '';

/** Google Play listing. When set, the web version shows a download link. */
export const PLAY_URL = env.VITE_PLAY_URL || '';

/**
 * Lets players type their name into the challenge. The name never leaves the
 * device except inside the message the player decides to send. Set
 * VITE_ALLOW_PLAYER_NAME=false if you want the app to ask for nothing at all.
 */
export const ALLOW_PLAYER_NAME = env.VITE_ALLOW_PLAYER_NAME !== 'false';

/**
 * Privacy policy. Google Play requires a link inside the app as well as in the
 * listing. The app opens the public copy (system browser); the web version
 * falls back to the bundled page when PUBLIC_URL is not set.
 */
export const PRIVACY_URL = PUBLIC_URL ? new URL('privacy.html', PUBLIC_URL).href : 'privacy.html';
