import { toggleAmbientMuted, unlockAmbient, useAmbientUI } from '../audio/ambient'
import { useInputMode } from '../audio/inputMode'

/**
 * The only visible control for the background music. It is quiet on purpose:
 *   - hidden while the music is not meant to be heard (the hero)
 *   - before the browser has allowed sound: a small "Tap for sound" chip. It only appears when
 *     the visitor has not clicked / tapped / pressed a key anywhere yet (any of those unlocks
 *     the sound on its own, silently) — see audio/ambient.ts.
 *   - afterwards: a small speaker button to mute / unmute.
 */
export default function SoundToggle() {
  const { unlocked, muted, active } = useAmbientUI()
  const mode = useInputMode()

  return (
    <div className={`sound-dock${active ? ' is-on' : ''}`}>
      {!unlocked ? (
        <button
          type="button"
          className="sound-btn sound-prompt"
          onClick={unlockAmbient}
          aria-label="Turn on background music"
          tabIndex={active ? 0 : -1}
        >
          <span className="sound-bars" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>{mode === 'touch' ? 'Tap for sound' : 'Click for sound'}</span>
        </button>
      ) : (
        <button
          type="button"
          className={`sound-btn sound-toggle${muted ? ' is-muted' : ''}`}
          onClick={toggleAmbientMuted}
          aria-pressed={muted}
          aria-label={muted ? 'Unmute background music' : 'Mute background music'}
          title={muted ? 'Sound off' : 'Sound on'}
          tabIndex={active ? 0 : -1}
        >
          <span className="sound-bars" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </button>
      )}
    </div>
  )
}
