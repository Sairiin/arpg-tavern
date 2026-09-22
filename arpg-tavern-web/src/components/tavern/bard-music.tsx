"use client";

import { useEffect, useRef, useState } from "react";

const BARD_PREFERENCE_KEY = "arpg-tavern-bard-preference";
const BARD_VOLUME_KEY = "arpg-tavern-bard-volume";
const BARD_TRACK_KEY = "arpg-tavern-bard-track";

/*
  Sostituisci o aggiungi righe in base ai file realmente presenti
  nella cartella public/audio.
*/
const PLAYLIST = [
  {
    title: "Claudio contro Morfeo",
    source: "/audio/Claudio_contro_Morfeo.mp3",
  },
  {
    title: "Datti all'ippica",
    source: "/audio/Datti_all_ippica.mp3",
  },
  {
    title: "Il Maestro del Rinvio",
    source: "/audio/Il_Maestro_del_Rinvio.mp3",
  },
  {
    title: "Il Mimo dell'Atto Uno",
    source: "/audio/Il_Mimo_dell_Atto_Uno.mp3",
  },
  {
    title: "Il Re Senza Bussola",
    source: "/audio/Il_Re_Senza_Bussola.mp3",
  },
  {
    title: "Il maestro del disastro",
    source: "/audio/Il_maestro_del_disastro.mp3",
  },
  {
    title: "Il re col cuore stretto",
    source: "/audio/Il_re_col_cuore_stretto.mp3",
  },
  {
    title: "L'eroe di cartone",
    source: "/audio/L_eroe_di_cartone.mp3",
  },
  {
    title: "Lo spadone e il fango",
    source: "/audio/Lo_spadone_e_il_fango.mp3",
  },
  {
    title: "Peppe e la Carta che Fuma",
    source: "/audio/Peppe_e_la_Carta_che_Fuma.mp3",
  },
  {
    title: "Quiet Hour at the Inn",
    source: "/audio/Quiet_Hour_at_the_Inn.mp3",
  },
  {
    title: "Senza gloria e senza onore",
    source: "/audio/Senza_gloria_e_senza_onor.mp3",
  },
  {
    title: "Storie di pazzi al focolare",
    source: "/audio/Storie_di_pazzi_al_focolare.mp3",
  },
  {
    title: "Ambiente della Taverna",
    source: "/audio/tavern-ambience.mp3",
  },
] as const;




type BardPreference = "on" | "off";

function getBardPreference(): BardPreference | null {
  const value = window.localStorage.getItem(BARD_PREFERENCE_KEY);

  return value === "on" || value === "off" ? value : null;
}

function getBardVolume(): number {
  const storedValue = Number(window.localStorage.getItem(BARD_VOLUME_KEY));

  if (Number.isFinite(storedValue) && storedValue >= 0 && storedValue <= 1) {
    return storedValue;
  }

  return 0.2;
}

function getInitialTrackIndex() {
  const storedValue = Number(window.localStorage.getItem(BARD_TRACK_KEY));

  if (
    Number.isInteger(storedValue) &&
    storedValue >= 0 &&
    storedValue < PLAYLIST.length
  ) {
    return storedValue;
  }

  return 0;
}

export function BardMusic() {
  const audioReference = useRef<HTMLAudioElement | null>(null);
  const shouldAutoplayNextTrack = useRef(false);

  const [isReady, setIsReady] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isMusicOn, setIsMusicOn] = useState(false);
  const [volume, setVolume] = useState(0.2);
  const [trackIndex, setTrackIndex] = useState(0);
  const [message, setMessage] = useState("");

  const currentTrack = PLAYLIST[trackIndex];

  useEffect(() => {
    const savedPreference = getBardPreference();
    const savedVolume = getBardVolume();
    const savedTrackIndex = getInitialTrackIndex();

    setVolume(savedVolume > 0 ? savedVolume : 0.2);
    setTrackIndex(savedTrackIndex);
    setIsMusicOn(savedPreference === "on");
    setShowWelcome(savedPreference === null);
    setIsReady(true);
  }, []);

  useEffect(() => {
    const audio = audioReference.current;

    if (!audio) {
      return;
    }

    audio.volume = volume;
  }, [volume]);
  
useEffect(() => {
  const audio = audioReference.current;

  if (!audio) {
    return;
  }

  audio.volume = volume;
}, [volume]);
  useEffect(() => {
  const audio = audioReference.current;

  if (!audio || !isReady) {
    return;
  }

  audio.load();

  if (!isMusicOn) {
    shouldAutoplayNextTrack.current = false;
    audio.pause();
    return;
  }

  shouldAutoplayNextTrack.current = true;

  void audio.play().catch((error) => {
    console.error("Impossibile avviare la musica del bardo:", error);
    shouldAutoplayNextTrack.current = false;
    setIsMusicOn(false);
    window.localStorage.setItem(BARD_PREFERENCE_KEY, "off");
    setMessage(
      "Il bardo non riesce ad avviare il brano. Puoi riprovare dal pulsante musicale."
    );
  });
}, [isMusicOn, isReady, trackIndex]);

  function saveTrackIndex(nextTrackIndex: number) {
    window.localStorage.setItem(BARD_TRACK_KEY, String(nextTrackIndex));
  }

  function enableMusic() {
    const audio = audioReference.current;
    const safeVolume = volume > 0 ? volume : 0.2;

    setVolume(safeVolume);
    setShowWelcome(false);
    setMessage("");
    setIsMusicOn(true);

    window.localStorage.setItem(BARD_VOLUME_KEY, String(safeVolume));
    window.localStorage.setItem(BARD_PREFERENCE_KEY, "on");

    if (audio) {
      audio.volume = safeVolume;
      audio.muted = false;

      void audio.play().catch((error) => {
        console.error("Impossibile avviare la musica del bardo:", error);
        setIsMusicOn(false);
        window.localStorage.setItem(BARD_PREFERENCE_KEY, "off");
        setMessage(
          "Il bardo non riesce ad avviare il brano. Puoi riprovare dal pulsante musicale.",
        );
      });
    }
  }

  function declineMusic() {
    setShowWelcome(false);
    setIsMusicOn(false);
    shouldAutoplayNextTrack.current = false;
    window.localStorage.setItem(BARD_PREFERENCE_KEY, "off");
  }

  function toggleMusic() {
    setMessage("");

    if (isMusicOn) {
      setIsMusicOn(false);
      shouldAutoplayNextTrack.current = false;
      window.localStorage.setItem(BARD_PREFERENCE_KEY, "off");
      return;
    }

    setIsMusicOn(true);
    window.localStorage.setItem(BARD_PREFERENCE_KEY, "on");
  }

  function handleVolumeChange(nextVolume: number) {
    const safeVolume = Math.max(0, Math.min(1, nextVolume));

    setVolume(safeVolume);
    window.localStorage.setItem(BARD_VOLUME_KEY, String(safeVolume));
  }

  function playTrackAt(nextTrackIndex: number) {
    const safeTrackIndex =
      (nextTrackIndex + PLAYLIST.length) % PLAYLIST.length;

    setMessage("");
    setTrackIndex(safeTrackIndex);
    saveTrackIndex(safeTrackIndex);

    if (!isMusicOn) {
      setIsMusicOn(true);
      window.localStorage.setItem(BARD_PREFERENCE_KEY, "on");
    }
  }

  function playNextTrack() {
    playTrackAt(trackIndex + 1);
  }

  function playPreviousTrack() {
    playTrackAt(trackIndex - 1);
  }

  function handleTrackEnded() {
    if (!shouldAutoplayNextTrack.current) {
      return;
    }

    playNextTrack();
  }

  function handleAudioError() {
    shouldAutoplayNextTrack.current = false;
    setIsMusicOn(false);
    window.localStorage.setItem(BARD_PREFERENCE_KEY, "off");
    setMessage(
      `Il bardo non trova “${currentTrack.title}”. Controlla il percorso ${currentTrack.source}.`
    );
  }

  if (!isReady) {
    return null;
  }

  return (
    <>
      <audio
        ref={audioReference}
        key={currentTrack.source}
        preload="metadata"
        onEnded={handleTrackEnded}
        onError={handleAudioError}
      >
        <source src={currentTrack.source} type="audio/mpeg" />
      </audio>

      {showWelcome && (
        <div
          className="bard-welcome-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bard-welcome-title"
        >
          <section className="bard-welcome-modal">
            <div className="bard-welcome-symbol" aria-hidden="true">
              ♫
            </div>

            <p className="bard-welcome-eyebrow">Un tavolo vicino al fuoco</p>

            <h2 id="bard-welcome-title">
              Ti piacerebbe sentire il nostro bardo?
            </h2>

            <p>
              Il bardo suonerà una selezione di brani della taverna. Potrai
              cambiare canzone, volume o interrompere la musica in ogni momento.
            </p>

            <div className="bard-welcome-actions">
              <button
                className="bard-button bard-button-primary"
                type="button"
                onClick={enableMusic}
              >
                <span aria-hidden="true">♫</span>
                Sì, accendi la musica
              </button>

              <button
                className="bard-button bard-button-secondary"
                type="button"
                onClick={declineMusic}
              >
                Non ora
              </button>
            </div>
          </section>
        </div>
      )}

      <section className="bard-player" aria-label="Musica della taverna">
        <button
          className="bard-skip-button"
          type="button"
          onClick={playPreviousTrack}
          aria-label="Brano precedente"
          title="Brano precedente"
        >
          <span aria-hidden="true">‹</span>
        </button>

        <button
          className={`bard-toggle ${isMusicOn ? "bard-toggle-on" : ""}`}
          type="button"
          onClick={toggleMusic}
          aria-pressed={isMusicOn}
          title={isMusicOn ? "Metti in pausa la musica" : "Avvia la musica"}
        >
          <span aria-hidden="true">{isMusicOn ? "♫" : "♪"}</span>

          <span className="bard-toggle-label">
            {isMusicOn ? "Bardo on" : "Bardo off"}
          </span>
        </button>

        <button
          className="bard-skip-button"
          type="button"
          onClick={playNextTrack}
          aria-label="Brano successivo"
          title="Brano successivo"
        >
          <span aria-hidden="true">›</span>
        </button>

        <label className="bard-volume">
          <span className="bard-volume-icon" aria-hidden="true">
            🔊
          </span>
          <span className="sr-only">Volume della musica</span>

          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(volume * 100)}
            onChange={(event) =>
              handleVolumeChange(Number(event.target.value) / 100)
            }
            aria-label="Volume della musica"
          />
        </label>

        {isMusicOn && (
          <p className="bard-current-track" aria-live="polite">
            {currentTrack.title}
          </p>
        )}
      </section>

      {message && <p className="bard-status-message">{message}</p>}
    </>
  );
}