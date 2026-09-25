"use client";

import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { auth } from "@/lib/firebase/client";

const features = [
  {
    icon: "⚔",
    title: "Forgia la tua build",
    available: true,
    description:
      "Raccogli skill, equipaggiamento, obiettivi e note nel tuo grimorio personale.",
  },
  {
    icon: "⌛",
    title: "Ricorda le stagioni",
    available: false,
    description:
      "Ogni patch, league e ciclo resta collegato alla versione corretta della build.",
  },
  {
    icon: "↔",
    title: "Confronta le varianti",
    available: false,
    description:
      "Metti a confronto setup, snapshot e alternative prima di investire risorse.",
  },
  {
    icon: "✦",
    title: "Consulta il saggio",
    available: false,
    description:
      "L'assistente AI analizzerà priorità, difese, obiettivi e prossimi upgrade.",
  },
];

const gameNames = [
  "Path of Exile 2",
  "Path of Exile",
  "Diablo IV",
  "Last Epoch",
  "Altri ARPG",
];

export default function HomePage() {
  const router = useRouter();
  const [isEntering, setIsEntering] = useState(false);

  async function enterTavern() {
    if (isEntering) return;

    setIsEntering(true);

    try {
      if (auth.currentUser) {
        router.push("/dashboard");
        return;
      }

      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push("/dashboard");
    } catch (error) {
      console.error("Firebase Google Sign-In error:", error);
      alert(
        "Non è stato possibile completare l'accesso con Google. Riprova tra poco."
      );
    } finally {
      setIsEntering(false);
    }
  }

  return (
    <main className="site-shell">
      <header className="tavern-facade-header">
        <div className="tavern-facade-background" aria-hidden="true" />

        <div className="tavern-facade-content">
          <a
            className="tavern-facade-signboard-link"
            href="/"
            aria-label="ARPG Tavern — torna alla home"
          >
            <img
              className="tavern-facade-signboard"
              src="/images/arpg-tavern-signboard-burned-oak.png"
              alt="La Casa dei Theorycrafter — ARPG Tavern"
            />
          </a>

          <nav
            className="tavern-facade-navigation"
            aria-label="Navigazione principale"
          >
            <a href="#home">Home</a>
            <a href="#features">La taverna</a>
            <a href="#games">Mondi</a>
            <a href="#journey">Il viaggio</a>
          </nav>
        </div>
      </header>
<section className="tavern-door-motto" aria-labelledby="tavern-door-title">
  <div className="tavern-door-motto-inner">
    

    <h1 id="tavern-door-title">
      Costruisci la tua leggenda.
      <span>Una build alla volta.</span>
    </h1>

    
  </div>
</section>
      <section id="home" className="hero-scene">
        <div className="hero-overlay" />

        <div className="hero-content">
          <div className="hero-chicken-heading">
            <p className="eyebrow">
              Il rifugio dei viandanti delle stagioni
            </p>

            <p className="hero-description">
              Un luogo caldo tra una spedizione e l&apos;altra. Conserva le tue
              build, le loro versioni e le varianti.
            </p>
          </div>


          <button
            type="button"
            className="tavern-chicken-entry"
            onClick={enterTavern}
            disabled={isEntering}
            aria-label="Entra nella taverna con Google"
          >
            <img
              className="tavern-chicken-entry-image"
              src="/images/tavern-roast-chicken.png"
              alt=""
            />
            <span className="tavern-chicken-entry-label">
              {isEntering ? "Accesso..." : "Entra"}
            </span>
            <span className="tavern-chicken-entry-subtitle">
              {isEntering
                ? "Apertura del registro..."
                : "Accedi con Google e raggiungi le tue build"}
            </span>
          </button>
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
            <article
              className={`feature-card${feature.available ? " feature-card-available" : " feature-card-coming-soon"}`}
              key={feature.title}
              aria-label={
                feature.available
                  ? feature.title
                  : `${feature.title} — in arrivo`
              }
            >
              {!feature.available && (
                <span className="feature-coming-soon" aria-label="In arrivo">
                  In arrivo
                </span>
              )}

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
            <span aria-hidden="true"><span className="site-guild-emblem" aria-hidden="true" /></span>
            Registro dell&apos;avventuriero
            <span aria-hidden="true"><span className="site-guild-emblem" aria-hidden="true" /></span>
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