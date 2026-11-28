export const MUSIC_VOLUME = 0.5

function MusicControl({ audioRef, isPlaying }) {
  function togglePlayback() {
    const audio = audioRef.current
    if (!audio) return

    if (audio.paused) {
      audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }

  return (
    <button
      aria-label={isPlaying ? 'Pausar música' : 'Reproducir música'}
      className="music-control"
      onClick={togglePlayback}
      title={isPlaying ? 'Pausar música' : 'Reproducir música'}
      type="button"
    >
      <span aria-hidden="true" className={`music-control__icon ${isPlaying ? 'music-control__icon--pause' : ''}`}>
        {isPlaying ? 'Ⅱ' : '♫'}
      </span>
    </button>
  )
}

export default MusicControl