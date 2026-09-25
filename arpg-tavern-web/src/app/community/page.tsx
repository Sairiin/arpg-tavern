"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { addDoc, collection, collectionGroup, onSnapshot, query, serverTimestamp, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import {
  getClassBackgroundImage,
  getClassCrestImage,
} from "@/lib/games/class-crests";
import "../dashboard/dashboard.css";
import "./community.css";

type CommunityBuild = {
  id: string;
  ownerId: string;
  title: string;
  game: string;
  characterClass: string;
  patch: string;
  category: string;
  updatedAt?: { seconds?: number } | null;
  viewCount?: number;
  importCount?: number;
  voteScore?: number;
  voteCount?: number;
  documentPath: string;
  data: Record<string, unknown>;
};

const gameLabels: Record<string, string> = {
  poe1: "Path of Exile 1",
  poe2: "Path of Exile 2",
  "diablo-2": "Diablo II",
  "diablo-4": "Diablo IV",
  "last-epoch": "Last Epoch",
  "grim-dawn": "Grim Dawn",
};

function normalizeGameSlug(value: string) {
  const normalized = value.trim().toLocaleLowerCase("it");

  if (normalized === "path of exile 2" || normalized === "poe 2") {
    return "poe2";
  }

  if (normalized === "path of exile 1" || normalized === "poe 1") {
    return "poe1";
  }

  return normalized;
}

function formatDate(timestamp?: { seconds?: number } | null) {
  if (!timestamp?.seconds) return "Data non disponibile";
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" }).format(
    new Date(timestamp.seconds * 1000),
  );
}

export default function CommunityBuildsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [builds, setBuilds] = useState<CommunityBuild[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [gameFilter, setGameFilter] = useState("");
  const [buildView, setBuildView] = useState<"cards" | "list" | "columns">("list");
  const [error, setError] = useState("");
  const [importingId, setImportingId] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsCheckingAuth(false);
      if (!currentUser) router.replace("/login");
    });
  }, [router]);

  useEffect(() => {
    if (!user) return;
    setError("");
    const buildsQuery = query(
      collectionGroup(db, "builds"),
      where("visibility", "==", "public"),
    );
    return onSnapshot(
      buildsQuery,
      (snapshot) => {
        setBuilds(
          snapshot.docs.map((document) => {
            const data = document.data();
            return {
              id: document.id,
              ownerId: document.ref.parent.parent?.id || "",
              documentPath: document.ref.path,
              data,
              title: String(data.title || "Build senza nome"),
              game: String(data.game || ""),
              characterClass: String(data.characterClass || "Classe non indicata"),
              patch: String(data.patch || "Patch non indicata"),
              category: String(data.category || "Generale"),
              updatedAt: data.updatedAt as CommunityBuild["updatedAt"],
              viewCount: Number(data.viewCount || 0),
              importCount: Number(data.importCount || 0),
              voteScore: Number(data.voteScore || 0),
              voteCount: Number(data.voteCount || 0),
            };
          }),
        );
      },
      (snapshotError) => {
        console.error("Errore catalogo Community Builds:", snapshotError);
        setError("Non è stato possibile caricare le build pubbliche.");
      },
    );
  }, [user]);

  async function importBuild(build: CommunityBuild) {
    if (!user || importingId) {
      return;
    }

    setImportingId(build.id);
    setError("");
    setSuccessMessage("");

    try {
      await addDoc(collection(db, "users", user.uid, "builds"), {
        ...build.data,
        visibility: "private",
        importedFrom: {
          path: build.documentPath,
          importedAt: serverTimestamp(),
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSuccessMessage(`La build "${build.title}" è stata importata nella tua libreria.`);
    } catch (importError) {
      console.error("Errore importazione build:", importError);
      setError("Non è stato possibile importare la build.");
    } finally {
      setImportingId("");
    }
  }

  const games = useMemo(
    () => Array.from(new Set(builds.map((build) => build.game).filter(Boolean))).sort(),
    [builds],
  );

  const filteredBuilds = useMemo(() => {
    const normalized = searchTerm.trim().toLocaleLowerCase("it");
    return [...builds]
      .filter((build) => !gameFilter || normalizeGameSlug(build.game) === normalizeGameSlug(gameFilter))
      .filter((build) => {
        if (!normalized) return true;
        return [build.title, build.game, build.characterClass, build.patch, build.category]
          .join(" ")
          .toLocaleLowerCase("it")
          .includes(normalized);
      })
      .sort((first, second) =>
        (second.updatedAt?.seconds ?? 0) - (first.updatedAt?.seconds ?? 0),
      );
  }, [builds, gameFilter, searchTerm]);

  const rankings = useMemo(() => {
    const grouped = new Map<string, CommunityBuild[]>();

    for (const build of filteredBuilds) {
      const gameKey = normalizeGameSlug(build.game);
      const current = grouped.get(gameKey) ?? [];
      current.push(build);
      grouped.set(gameKey, current);
    }

    return Array.from(grouped.entries())
      .map(([game, gameBuilds]) => ({
        game,
        total: gameBuilds.length,
        builds: [...gameBuilds]
          .sort((first, second) => {
            const firstScore =
              (first.voteScore ?? 0) * 3 +
              (first.importCount ?? 0) * 2 +
              (first.viewCount ?? 0) * 0.25;
            const secondScore =
              (second.voteScore ?? 0) * 3 +
              (second.importCount ?? 0) * 2 +
              (second.viewCount ?? 0) * 0.25;
            return secondScore - firstScore;
          })
          .slice(0, 5),
      }))
      .sort((first, second) => second.total - first.total);
  }, [filteredBuilds]);


  if (isCheckingAuth) {
    return <main className="dashboard-page community-page"><p>Il locandiere sta aprendo il catalogo...</p></main>;
  }

  return (
    <main className="dashboard-page community-page">
      <header className="community-header">
        <div>
          <p className="eyebrow">Archivio condiviso</p>
          <h1>Community Builds</h1>
          <p>Esplora e importa le build pubblicate dalla community.</p>
        </div>
        <Link className="button button-secondary" href="/dashboard">Torna al dashboard</Link>
      </header>
      <section className="community-toolbar" aria-label="Filtri build pubbliche">
        <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Cerca build..." />
        <select value={gameFilter} onChange={(event) => setGameFilter(event.target.value)}>
          <option value="">Tutti i giochi</option>
          {games.map((game) => <option key={game} value={game}>{gameLabels[game] || game}</option>)}
        </select>

        <div className="community-view-switcher" aria-label="Visualizzazione build">
          <button
            type="button"
            className={`community-view-button ${buildView === "cards" ? "is-active" : ""}`}
            onClick={() => setBuildView("cards")}
            aria-pressed={buildView === "cards"}
          >
            ▦ Card
          </button>
          <button
            type="button"
            className={`community-view-button ${buildView === "list" ? "is-active" : ""}`}
            onClick={() => setBuildView("list")}
            aria-pressed={buildView === "list"}
          >
            ☰ Lista
          </button>
            <button
              type="button"
              className={`community-view-button ${buildView === "columns" ? "is-active" : ""}`}
              onClick={() => setBuildView("columns")}
              aria-pressed={buildView === "columns"}
            >
              ▦ Due colonne
            </button>
        </div>
      </section>
      {rankings.length > 0 && (
        <section className="community-rankings" aria-label="Classifiche Community">
          <div className="community-rankings-heading">
            <div>
              <p className="eyebrow">Classifiche</p>
              <h2>Classifiche Community per gioco</h2>
              <p>Voti, importazioni e visualizzazioni determinano la posizione.</p>
            </div>
          </div>
          <div className="community-rankings-grid">
            {rankings.map((ranking) => (
              <article className="community-ranking" key={ranking.game}>
                <header>
                  <div>
                    <span className="saved-build-game">
                      {gameLabels[ranking.game] || ranking.game}
                    </span>
                    <h3>{ranking.total} build pubbliche</h3>
                  </div>
                  <span className="community-ranking-badge">★</span>
                </header>
                <ol>
                  {ranking.builds.map((build) => (
                    <li key={build.id}>
                      <Link href={`/community/builds/${build.ownerId}/${build.id}`}>
                        <span>{build.title}</span>
                        <small>
                          {build.characterClass} · ★ {build.voteScore ?? 0} · ↓ {build.importCount ?? 0} · ◉ {build.viewCount ?? 0}
                        </small>
                      </Link>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </section>
      )}
      {error && <p className="community-error">{error}</p>}
      {successMessage && <p className="community-success">{successMessage}</p>}
      {!error && filteredBuilds.length === 0 && <p className="community-empty">Nessuna build pubblica trovata.</p>}
      <section className={`game-builds-grid builds-view-${buildView}`} aria-label="Build pubbliche">
        {filteredBuilds.map((build) => (
          <article
            className="saved-build-card saved-build-card-clickable community-build-card"
            key={`${build.game}-${build.id}`}
            style={
              getClassBackgroundImage(build.characterClass)
                ? {
                    backgroundImage: `linear-gradient(rgba(15, 9, 5, .72), rgba(15, 9, 5, .9)), url(${getClassBackgroundImage(build.characterClass)})`,
                  }
                : undefined
            }
          >
            <Link
              className="community-card-main-link saved-build-card-top"
              href={`/community/builds/${build.ownerId}/${build.id}`}
              aria-label={`Apri la build ${build.title}`}
            >
              <span className="community-card-crest" aria-hidden="true">
                {getClassCrestImage(build.game, build.characterClass) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getClassCrestImage(build.game, build.characterClass) ?? ""}
                    alt=""
                  />
                ) : (
                  <span>◈</span>
                )}
              </span>
              <div className="community-card-copy">
                <span className="saved-build-game">
                  {gameLabels[build.game] || build.game || "Gioco non indicato"}
                </span>
                <span className="saved-build-title-row">
                  <h2>{build.title}</h2>
                </span>
                <span className="saved-build-meta">
                  {build.characterClass} · {build.patch} · {build.category}
                </span>
              </div>
            </Link>
            <footer className="community-build-card-footer">
              <span>Pubblicata · {formatDate(build.updatedAt)}</span>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => void importBuild(build)}
                disabled={importingId === build.id}
              >
                {importingId === build.id ? "Importazione..." : "Importa build"}
              </button>
            </footer>
          </article>
        ))}
      </section>
    </main>
  );
}
