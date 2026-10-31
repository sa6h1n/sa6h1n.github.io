/**
 * Shared, mutable audio levels (0–1), written every frame by the music player
 * and read every frame by the 3D scene and the "Life in Stereo" equalizer.
 *   bass — smoothed low-end energy (glow / bloom swell)
 *   kick — spikes on each drum hit, decays fast (flash / bounce)
 */
export const audioLevel = { bass: 0, kick: 0 }
