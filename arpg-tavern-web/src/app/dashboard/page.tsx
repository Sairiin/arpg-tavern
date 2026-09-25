"use client";

import "./dashboard.css";
import Link from "next/link";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";

const games = [
  {
    name: "Path of Exile 1",
    slug: "poe1",
    description:
      "Custodisci le tue build dell'esilio originale, con link, note e varianti.",
    status: "Archivio disponibile",
  },
  {
    name: "Path of Exile 2",
    slug: "poe2",
    description:
      "Salva, organizza e consulta i link alle tue build PoE 2.",
    status: "Archivio disponibile",
  },
  {
    name: "Diablo II",
    slug: "diablo-2",
    description:
      "Raccogli le tue configurazioni classiche, farm route e link utili.",
    status: "Archivio disponibile",
  },
  {
    name: "Diablo IV",
    slug: "diablo-4",
    description:
      "Organizza build, paragon board, equipaggiamento e risorse della stagione.",
    status: "Archivio disponibile",
  },
  {
    name: "Last Epoch",
    slug: "last-epoch",
    description:
      "Tieni insieme build planner, monoliti, benedizioni e note di crafting.",
    status: "Archivio disponibile",
  },
  {
    name: "Grim Dawn",
    slug: "grim-dawn",
    description:
      "Conserva le build del Cairn, le devozioni e i link ai planner.",
    status: "Archivio disponibile",
  },
] as const;

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsCheckingAuth(false);

      if (!currentUser) {
        router.replace("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  async function handleSignOut() {
    await signOut(auth);
    router.push("/");
  }

  if (isCheckingAuth) {
    return (
      <main className="dashboard-page dashboard-loading">
        <p>Il locandiere sta preparando il tavolo...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  const adventurerName = user.displayName || "Avventuriero";
  const initial = adventurerName.charAt(0).toUpperCase();

  return (
    <main className="dashboard-page">
      <header className="dashboard-topbar">
        <Link className="brand brand-build-library" href="/">
          <span className="brand-mark brand-build-book" aria-hidden="true">
            <img
              src="/images/build-grimoire.png"
              alt=""
              className="brand-build-book-image"
            />
          </span>

          <span className="brand-text">
            <small>La casa dei theorycrafter</small>
            Le mie build
          </span>
        </Link>

        <div className="adventurer-menu">
          <span className="adventurer-avatar">
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />
            ) : (
              initial
            )}
          </span>

          <div>
            <small>Avventuriero</small>
            <strong>{adventurerName}</strong>
          </div>

          <button type="button" onClick={handleSignOut}>
            Esci
          </button>
        </div>
      </header>

      <section
        className="game-selector dashboard-game-selector"
        aria-labelledby="game-selector-title"
      >
        <div className="game-selector-heading">
          <p className="eyebrow">Scegli il tuo grimorio</p>
          <h1 id="game-selector-title">Quale mondo vuoi esplorare?</h1>
          <p>
            Seleziona un gioco per entrare nel suo archivio personale di build.
          </p>
        </div>

        <Link
          className="dashboard-community-tile"
          href="/community"
          aria-label="Apri Community Builds"
        >
          <span className="dashboard-community-tile-emblem" aria-hidden="true" />
          <span className="dashboard-community-tile-copy">
            <span className="game-card-kicker">La gilda degli avventurieri</span>
            <strong>Community Builds</strong>
            <span>Esplora, vota e importa le build condivise.</span>
          </span>
          <span className="dashboard-community-tile-action" aria-hidden="true">
            Apri la community ↗
          </span>
        </Link>

        <div className="game-selector-grid">
          {games.map((game) => (
            <Link
              key={game.slug}
              className={`game-card game-card-${game.slug}`}
              href={`/library/${game.slug}`}
            >
              <img
                className="game-card-background"
                src={`/images/game-backgrounds/${game.slug}.jpg`}
                alt=""
                aria-hidden="true"
              />
              <img
                className="game-card-crest"
                src={`/images/crests/${game.slug}.png`}
                alt=""
                aria-hidden="true"
              />
              <span className="game-card-kicker">{game.status}</span>
              <h2>{game.name}</h2>
              <p>{game.description}</p>
              <span className="game-card-action">
                Apri archivio <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
