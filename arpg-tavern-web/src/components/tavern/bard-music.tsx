"use client";

import { useEffect, useRef, useState } from "react";

const BARD_PREFERENCE_KEY = "arpg-tavern-bard-preference";
const BARD_VOLUME_KEY = "arpg-tavern-bard-volume";

type BardPreference = "on" | "off";

function getBardPreference(): BardPreference | null {
  const value = window.localStorage.getItem(BARD_PREFERENCE_KEY);

  if (value === "on" || value === "off") {
    return value;
  }

  return null;
}

function getBardVolume(): number {
  const value = Number(window.localStorage.getItem(BARD_VOLUME_KEY));

  if (Number.isFinite(value) && value >= 0 && value <= 1) {
    return value;
  }

  return 0.2;
}

export function BardMusic() {
  const audioReference = useRef<HTMLAudioElement | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isMusicOn, setIsMusicOn] = useState(false);
  const [volume, setVolume] = useState(0.2);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const savedPreference = getBardPreference();
    const savedVolume = getBardVolume();

    setVolume(savedVolume);
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

    if (!audio || !isReady) {
      return;
    }

    if (!isMusicOn) {
      audio.pause();
      return;
    }

    void audio.play().catch((error) => {
      console.error("Impossibile avviare la musica della taverna:", error);
      setIsMusicOn(false);
      window.localStorage.setItem(BARD_PREFERENCE_KEY, "off");
      setMessage(
        "Il bardo non riesce ad avviare la musica. Puoi riprovare dal pulsante in basso a destra."
      );
    });
  }, [isMusicOn, isReady]);

  function enableMusicFromWelcome() {
    const audio = audioReference.current;

    setShowWelcome(false);
    setMessage("");

    if (!audio) {
      return;
    }

    audio.volume = volume;

    void audio
      .play()
      .then(() => {
        setIsMusicOn(true);
        window.localStorage.setItem(BARD_PREFERENCE_KEY, "on");
      })
      .catch((error) => {
        console.error("Impossibile avviare la musica della taverna:", error);
        setIsMusicOn(false);
        window.localStorage.setItem(BARD_PREFERENCE_KEY, "off");
        setMessage(
          "Il bardo non riesce ad avviare la musica. Puoi riprovare dal pulsante in basso a destra."
        );
      });
  }

  function declineMusic() {
    setShowWelcome(false);
    setIsMusicOn(false);
    setMessage("");
    window.localStorage.setItem(BARD_PREFERENCE_KEY, "off");
  }

  function toggleMusic() {
    const audio = audioReference.current;
    const nextMusicState = !isMusicOn;

    setMessage("");

    if (!nextMusicState) {
      audio?.pause();
      setIsMusicOn(false);
      window.localStorage.setItem(BARD_PREFERENCE_KEY, "off");
      return;
    }

    if (!audio) {
      return;
    }

    audio.volume = volume;

    void audio
      .play()
      .then(() => {
        setIsMusicOn(true);
        window.localStorage.setItem(BARD_PREFERENCE_KEY, "on");
      })
      .catch((error) => {
        console.error("Impossibile avviare la musica della taverna:", error);
        setIsMusicOn(false);
        window.localStorage.setItem(BARD_PREFERENCE_KEY, "off");
        setMessage(
          "Il bardo non riesce ad avviare la musica. Controlla che tavern-ambience.mp3 sia presente nella cartella public/audio."
        );
      });
  }

  function handleVolumeChange(nextVolume: number) {
    const safeVolume = Math.max(0, Math.min(1, nextVolume));

    setVolume(safeVolume);
    window.localStorage.setItem(BARD_VOLUME_KEY, String(safeVolume));
  }

  if (!isReady) {
    return null;
  }

  return (
    <>
      <audio
        ref={audioReference}
        src="/audio/tavern-ambience.mp3"
        loop
        preload="metadata"
      />

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
              Una musica discreta accompagnerà la tua avventura. Potrai
              disattivarla in qualunque momento dal pulsante musicale in basso
              a destra.
            </p>

            <div className="bard-welcome-actions">
              <button
                className="bard-button bard-button-primary"
                type="button"
                onClick={enableMusicFromWelcome}
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

      <section
        className="bard-player"
        aria-label="Controlli musica della taverna"
      >
        <button
          className={`bard-toggle ${isMusicOn ? "bard-toggle-on" : ""}`}
          type="button"
          onClick={toggleMusic}
          aria-pressed={isMusicOn}
          title={isMusicOn ? "Disattiva musica" : "Attiva musica"}
        >
          <span aria-hidden="true">{isMusicOn ? "♫" : "♪"}</span>
          <span>{isMusicOn ? "Bardo on" : "Bardo off"}</span>
        </button>

        {isMusicOn && (
          <label className="bard-volume">
            <span className="sr-only">Volume della musica</span>

            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(volume * 100)}
              onChange={(event) =>
                handleVolumeChange(Number(event.target.value) / 100)
              }
            />
          </label>
        )}
      </section>

      {message && <p className="bard-status-message">{message}</p>}
    </>
  );
}