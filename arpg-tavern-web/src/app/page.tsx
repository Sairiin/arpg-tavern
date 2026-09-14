"use client";

import { useEffect, useRef, useState } from "react";

const features = [
  {
    icon: "⚔",
    title: "Forgia la tua build",
    description:
      "Raccogli skill, equipaggiamento, obiettivi e note nel tuo grimorio personale."
  },
  {
    icon: "⌛",
    title: "Ricorda le stagioni",
    description:
      "Ogni patch, league e ciclo resta collegato alla versione corretta della build."
  },
  {
    icon: "↔",
    title: "Confronta le varianti",
    description:
      "Metti a confronto setup, snapshot e alternative prima di investire risorse."
  },
  {
    icon: "✦",
    title: "Consulta il saggio",
    description:
      "L'assistente AI analizzerà priorità, difese, obiettivi e prossimi upgrade."
  }
];

const gameNames = [
  "Path of Exile 2",
  "Path of Exile",
  "Diablo IV",
  "Last Epoch",
  "Altri ARPG"
];

export default function HomePage() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [audioAvailable, setAudioAvailable] = useState(true);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (!musicEnabled) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    audio.play().catch(() => {
      setMusicEnabled(false);
      setAudioAvailable(false);
    });
  }, [musicEnabled]);

  function toggleMusic() {
    if (!audioAvailable) {
      return;
    }

    setMusicEnabled((currentValue) => !currentValue);
  }

  return (
    <main className="site-shell">
      <audio
        ref={audioRef}
        loop
        preload="metadata"
        onError={() => {
          setMusicEnabled(false);
          setAudioAvailable(false);
        }}
      >
        <source src="/audio/tavern-ambience.mp3" type="audio/mpeg" />
        <source src="/audio/tavern-ambience.ogg" type="audio/ogg" />
      </audio>

      <section className="hero-scene">
        <div className="hero-overlay" />

        <nav className="topbar">
          <a className="brand" href="#home" aria-label="ARPG Tavern home">
            <span className="brand-mark">✦</span>

            <span className="brand-text">
              <small>La casa dei theorycrafter</small>
              ARPG Tavern
            </span>
          </a>

          <div className="navigation">
            <a href="#features">La taverna</a>
            <a href="#games">Mondi</a>
            <a href="#journey">Il viaggio</a>
          </div>

          <button
            type="button"
            className={`music-button ${musicEnabled ? "is-playing" : ""}`}
            onClick={toggleMusic}
            disabled={!audioAvailable}
            aria-pressed={musicEnabled}
            aria-label={
              audioAvailable
                ? musicEnabled
                  ? "Disattiva la musica"
                  : "Attiva la musica"
                : "Musica non disponibile"
            }
          >
            <span className="music-icon" aria-hidden="true">
              {musicEnabled ? "♫" : "♩"}
            </span>

            <span>
              {audioAvailable
                ? musicEnabled
                  ? "Musica attiva"
                  : "Musica spenta"
                : "Aggiungi audio"}
            </span>
          </button>
        </nav>

        <div id="home" className="hero-content">
          <p className="eyebrow">Il rifugio dei viandanti delle stagioni</p>

          <h1>
            Costruisci la tua leggenda.
            <span>Una build alla volta.</span>
          </h1>

          <p className="hero-description">
            Un luogo caldo tra una spedizione e l&apos;altra. Conserva le tue
            build, le loro versioni, le varianti e il cammino attraverso ogni
            stagione del tuo ARPG preferito.
          </p>

          <div className="hero-actions">
            <a className="button button-gold" href="/login">
              <span className="button-rune" aria-hidden="true">
                ✦
              </span>
              Entra nella taverna
              <span className="button-arrow" aria-hidden="true">
                →
              </span>
            </a>

            <a className="button button-wood" href="#journey">
              <span className="button-rune" aria-hidden="true">
                ◆
              </span>
              Scopri il registro
            </a>
          </div>

          <div className="hero-note">
            <span aria-hidden="true">✦</span>
            La prima stagione della taverna sta per iniziare
          </div>
        </div>

        <div className="hero-bottom-fade" />
      </section>

      <section id="features" className="features-section">
        <div className="section-heading">
          <p className="eyebrow">Sul tavolo del cartografo</p>
          <h2>La tua sala delle build</h2>
          <p>
            Un archivio personale per ogni idea, modifica e avventura che vale
            la pena ricordare.
          </p>
        </div>

        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <div className="feature-icon" aria-hidden="true">
                {feature.icon}
              </div>

              <h3>{feature.title}</h3>
              <p>{feature.description}</p>

              <span className="card-mark card-mark-top" aria-hidden="true">
                ◆
              </span>

              <span className="card-mark card-mark-bottom" aria-hidden="true">
                ◆
              </span>
            </article>
          ))}
        </div>
      </section>

      <section id="games" className="games-section">
        <div className="map-card">
          <div className="map-card-content">
            <p className="eyebrow">Mappe e portali</p>
            <h2>Un tavolo per ogni mondo</h2>
            <p>
              Il progetto inizierà con Path of Exile 2, ma l&apos;archivio è
              progettato per accogliere giochi, patch, cicli e stagioni di
              tutta la comunità ARPG.
            </p>
          </div>

          <div className="game-list" aria-label="Giochi pianificati">
            {gameNames.map((game) => (
              <span className="game-pill" key={game}>
                <b aria-hidden="true">◆</b>
                {game}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="journey" className="journey-section">
        <div className="quest-board">
          <div className="quest-board-title">
            <span aria-hidden="true">✦</span>
            Registro dell&apos;avventuriero
            <span aria-hidden="true">✦</span>
          </div>

          <div className="quest-list">
            <article>
              <b>01</b>
              <div>
                <h3>Apri la taverna</h3>
                <p>Fondazioni, atmosfera e identità del progetto.</p>
              </div>
            </article>

            <article>
              <b>02</b>
              <div>
                <h3>Firma il registro</h3>
                <p>Accesso Google con Firebase e profilo personale.</p>
              </div>
            </article>

            <article>
              <b>03</b>
              <div>
                <h3>Custodisci le build</h3>
                <p>Versioni, snapshot, varianti e confronti salvati.</p>
              </div>
            </article>

            <article>
              <b>04</b>
              <div>
                <h3>Consulta il saggio</h3>
                <p>Patch automatiche e assistenza AI verificabile.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <footer className="footer">
        <span>ARPG Tavern</span>
        <span>Forgiato per chi non smette mai di theorycraftare.</span>
      </footer>
    </main>
  );
}