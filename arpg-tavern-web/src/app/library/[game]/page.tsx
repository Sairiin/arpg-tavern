"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import type { BuildRecord } from "@/lib/builds/types";
import {
  getBuildSourceLabel,
  getBuildSourceUrl,
} from "@/lib/builds/source-label";
import { BuildVariantCount } from "@/components/library/build-variant-count";
import {
  getClassBackgroundImage,
  getClassCrestImage,
} from "@/lib/games/class-crests";
import { GAME_CLASSES, type GameSlug } from "@/lib/games/classes";
import "../../dashboard/dashboard.css";

const games = {
  poe1: {
    name: "Path of Exile 1",
    shortName: "PoE 1",
  },
  poe2: {
    name: "Path of Exile 2",
    shortName: "PoE 2",
  },
  "diablo-2": {
    name: "Diablo II",
    shortName: "Diablo II",
  },
  "diablo-4": {
    name: "Diablo IV",
    shortName: "Diablo IV",
  },
  "last-epoch": {
    name: "Last Epoch",
    shortName: "Last Epoch",
  },
  "grim-dawn": {
    name: "Grim Dawn",
    shortName: "Grim Dawn",
  },
} as const;

function isGameSlug(value: string): value is GameSlug {
  return value in games;
}

function truncateBuildTitle(title: string, maxLength = 46) {
  const normalizedTitle = title.trim();

  if (normalizedTitle.length <= maxLength) {
    return normalizedTitle;
  }

  return `${normalizedTitle.slice(0, maxLength - 1).trimEnd()}…`;
}

function mapBuild(
  id: string,
  data: Record<string, unknown>
): BuildRecord {
  const sourceUrl = String(data.sourceUrl || data.buildLink || "");

  return {
    id,
    title: String(data.title || "Build senza nome"),
    game: String(data.game || "") as BuildRecord["game"],
    characterClass: String(data.characterClass || ""),
    patch: String(data.patch || ""),
    category: String(data.category || "") as BuildRecord["category"],
    visibility: String(data.visibility || "private") as BuildRecord["visibility"],
    notes: String(data.notes || ""),
    sourceUrl,
    archived: data.archived === true,
    createdAt: data.createdAt as BuildRecord["createdAt"],
    updatedAt: data.updatedAt as BuildRecord["updatedAt"],
  };
}

export default function GameLibraryPage() {
  const params = useParams<{ game: string }>();
  const router = useRouter();
  const gameSlug = params.game;

  const [user, setUser] = useState<User | null>(null);
  const [builds, setBuilds] = useState<BuildRecord[]>([]);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoadingBuilds, setIsLoadingBuilds] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [characterClass, setCharacterClass] = useState("");
  const [patch, setPatch] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [buildLink, setBuildLink] = useState("");
  const [sourceKind, setSourceKind] = useState<
    "manual" | "planner" | "guide" | "external"
  >("manual");

  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "archived" | "all">(
    "active"
  );
  const [sortOption, setSortOption] = useState<
    "updated-desc" | "updated-asc" | "title-asc" | "class-asc" | "patch-asc"
  >("updated-desc");

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

  useEffect(() => {
    if (!user || !isGameSlug(gameSlug)) {
      setBuilds([]);
      return;
    }

    setIsLoadingBuilds(true);
    setError("");

    const buildsQuery = query(
      collection(db, "users", user.uid, "builds"),
      where("game", "==", gameSlug),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      buildsQuery,
      (snapshot) => {
        setBuilds(
          snapshot.docs.map((document) =>
            mapBuild(document.id, document.data())
          )
        );
        setIsLoadingBuilds(false);
      },
      (snapshotError) => {
        console.error("Errore lettura build:", snapshotError);
        setError(
          "Non è stato possibile leggere le build. Verifica le regole e gli indici Firestore."
        );
        setIsLoadingBuilds(false);
      }
    );

    return () => unsubscribe();
  }, [user, gameSlug]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsModalOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  if (!isGameSlug(gameSlug)) {
    return null;
  }

  const currentGame = games[gameSlug];

  const classOptions = Array.from(
    new Set(
      builds
        .map((build) => build.characterClass.trim())
        .filter(Boolean)
    )
  ).sort((first, second) => first.localeCompare(second, "it"));

  const categoryOptions = Array.from(
    new Set(
      builds
        .map((build) => build.category.trim())
        .filter(Boolean)
    )
  ).sort((first, second) => first.localeCompare(second, "it"));

  const normalizedSearchTerm = searchTerm.trim().toLocaleLowerCase("it");

  const filteredBuilds = builds.filter((build) => {
    const isArchived = Boolean(build.archived);

    if (statusFilter === "active" && isArchived) {
      return false;
    }

    if (statusFilter === "archived" && !isArchived) {
      return false;
    }

    if (classFilter && build.characterClass !== classFilter) {
      return false;
    }

    if (categoryFilter && build.category !== categoryFilter) {
      return false;
    }

    if (!normalizedSearchTerm) {
      return true;
    }

    return [
      build.title,
      build.characterClass,
      build.category,
      build.patch,
      build.notes,
    ]
      .join(" ")
      .toLocaleLowerCase("it")
      .includes(normalizedSearchTerm);
  });

  const sortedBuilds = [...filteredBuilds].sort((first, second) => {
    const firstUpdatedAt = first.updatedAt?.seconds ?? 0;
    const secondUpdatedAt = second.updatedAt?.seconds ?? 0;

    switch (sortOption) {
      case "updated-asc":
        return firstUpdatedAt - secondUpdatedAt;

      case "title-asc":
        return first.title.localeCompare(second.title, "it");

      case "class-asc":
        return first.characterClass.localeCompare(second.characterClass, "it");

      case "patch-asc":
        return first.patch.localeCompare(second.patch, "it");

      case "updated-desc":
      default:
        return secondUpdatedAt - firstUpdatedAt;
    }
  });

  function openModal() {
    setError("");
    setIsModalOpen(true);
  }

  function closeModal() {
    if (!isSaving) {
      setIsModalOpen(false);
    }
  }

  function resetForm() {
    setTitle("");
    setCharacterClass("");
    setPatch("");
    setCategory("");
    setNotes("");
    setBuildLink("");
    setSourceKind("manual");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    if (!title.trim()) {
      setError("Inserisci un nome per la build.");
      return;
    }

    if (!characterClass.trim()) {
      setError("Seleziona una classe per assegnare lo stemma alla build.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await addDoc(collection(db, "users", user.uid, "builds"), {
        title: title.trim(),
        game: gameSlug,
        characterClass: characterClass.trim(),
        patch: patch.trim(),
        category: category.trim(),
        notes: notes.trim(),
        buildLink: buildLink.trim(),
        ...(buildLink.trim()
          ? {
              sourceUrl: buildLink.trim(),
              sourceType:
                sourceKind === "planner" ? "pob-link" : "manual",
            }
          : {
              sourceType: "manual",
            }),
        visibility: "private",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      resetForm();
      setIsModalOpen(false);
    } catch (saveError) {
      console.error("Errore salvataggio build:", saveError);
      setError(
        "Non è stato possibile salvare la build. Verifica le regole Firestore."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isCheckingAuth) {
    return (
      <main className="dashboard-page dashboard-loading">
        <p>Il locandiere sta aprendo il grimorio...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="dashboard-page game-library-page">
      <header className="dashboard-topbar">
        <Link className="brand brand-build-library" href="/dashboard">
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

        <Link className="library-back-link" href="/dashboard">
          ← Tutti i giochi
        </Link>
      </header>

      <section className="game-library-header">
        <div>
          <p className="eyebrow">Archivio personale</p>
          <h1>{currentGame.name}</h1>
          <p>
            Tutte le tue build per {currentGame.shortName}, raccolte in un solo
            grimorio.
          </p>
        </div>

        <div className="game-library-actions">
          <span className="game-library-build-count" aria-live="polite">
            <strong>{builds.length}</strong>
            <span>{builds.length === 1 ? "build salvata" : "build salvate"}</span>
          </span>

          <button
            className="new-build-button"
            type="button"
            onClick={openModal}
          >
            <span>Nuova build</span>
          </button>
        </div>
      </section>

      <section className="game-builds-list" aria-labelledby="my-builds-title">
        <div className="builds-section-heading builds-section-heading-compact">
          <span className="sr-only" id="my-builds-title">
            Le mie build
          </span>


        </div>

        {!isLoadingBuilds && builds.length > 0 && (
          <section className="builds-filter-panel" aria-label="Filtra le build">
            <label className="builds-search-field">
              <span className="sr-only">Cerca build</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Cerca per nome, classe, patch o note..."
              />
            </label>

            <div className="builds-filter-controls">
              <label>
                <span>Classe</span>
                <select
                  value={classFilter}
                  onChange={(event) => setClassFilter(event.target.value)}
                >
                  <option value="">Tutte le classi</option>
                  {classOptions.map((gameClass) => (
                    <option key={gameClass} value={gameClass}>
                      {gameClass}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Categoria</span>
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                >
                  <option value="">Tutte le categorie</option>
                  {categoryOptions.map((buildCategory) => (
                    <option key={buildCategory} value={buildCategory}>
                      {buildCategory}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Stato</span>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as "active" | "archived" | "all"
                    )
                  }
                >
                  <option value="active">Attive</option>
                  <option value="archived">Archiviate</option>
                  <option value="all">Tutte</option>
                </select>
              </label>

              <label>
                <span>Ordina</span>
                <select
                  value={sortOption}
                  onChange={(event) =>
                    setSortOption(
                      event.target.value as
                        | "updated-desc"
                        | "updated-asc"
                        | "title-asc"
                        | "class-asc"
                        | "patch-asc"
                    )
                  }
                >
                  <option value="updated-desc">Modifica più recente</option>
                  <option value="updated-asc">Modifica meno recente</option>
                  <option value="title-asc">Titolo A–Z</option>
                  <option value="class-asc">Classe A–Z</option>
                  <option value="patch-asc">Patch / stagione A–Z</option>
                </select>
              </label>

              {(searchTerm || classFilter || categoryFilter || statusFilter !== "active" || sortOption !== "updated-desc") && (
                <button
                  className="builds-clear-filters"
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setClassFilter("");
                    setCategoryFilter("");
                    setStatusFilter("active");
                    setSortOption("updated-desc");
                  }}
                >
                  Azzera filtri
                </button>
              )}
            </div>
          </section>
        )}

        {isLoadingBuilds && (
          <div className="builds-empty-state">
            <span aria-hidden="true">⌛</span>
            <p>Il locandiere sta sfogliando le tue pergamene...</p>
          </div>
        )}

        {error && !isModalOpen && (
          <div className="builds-empty-state builds-error-state">
            <span aria-hidden="true">!</span>
            <p>{error}</p>
          </div>
        )}

        {!isLoadingBuilds && !error && builds.length === 0 && (
          <div className="builds-empty-state">
            <span aria-hidden="true">✦</span>
            <p>
              Non hai ancora salvato build per {currentGame.shortName}. Crea la
              prima con il pulsante “Nuova build”.
            </p>
          </div>
        )}

        {!isLoadingBuilds && !error && builds.length > 0 && filteredBuilds.length === 0 && (
          <div className="builds-empty-state builds-no-results-state">
            <span aria-hidden="true">⌕</span>
            <p>Nessuna build corrisponde ai filtri selezionati.</p>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => {
                setSearchTerm("");
                setClassFilter("");
                setCategoryFilter("");
                setStatusFilter("active");
              }}
            >
              Mostra le build attive
            </button>
          </div>
        )}

        {!isLoadingBuilds && sortedBuilds.length > 0 && (
          <div className="game-builds-grid">
            {sortedBuilds.map((build) => (
              <Link
                className="saved-build-card saved-build-card-clickable"
                key={build.id}
                href={`/library/${gameSlug}/${build.id}`}
              >
                {getClassBackgroundImage(build.characterClass) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="saved-build-background"
                    src={getClassBackgroundImage(build.characterClass) ?? ""}
                    alt=""
                    aria-hidden="true"
                  />
                )}

                <div className="saved-build-card-top">
                  {getClassCrestImage(gameSlug, build.characterClass) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className="saved-build-class-crest"
                      src={getClassCrestImage(
                        gameSlug,
                        build.characterClass
                      ) ?? ""}
                      alt={`Stemma ${build.characterClass || "build"}`}
                    />
                  ) : (
                    <span
                      className="saved-build-class-fallback"
                      aria-hidden="true"
                    >
                      ◈
                    </span>
                  )}

                  <div>
                    <p className="saved-build-game">{currentGame.shortName}</p>
                    <div className="saved-build-title-row">
                      <h3 title={build.title}>
                        {truncateBuildTitle(build.title)}
                      </h3>
                      <span
                        className={
                          build.archived
                            ? "saved-build-status saved-build-status-archived"
                            : "saved-build-status saved-build-status-active"
                        }
                      >
                        {build.archived ? "Archiviata" : "Attiva"}
                      </span>
                    </div>

                    {(build.characterClass || build.category || build.patch) && (
                      <p className="saved-build-meta">
                        {[build.characterClass, build.category, build.patch]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}

                    {build.notes && (
                      <p className="saved-build-notes">{build.notes}</p>
                    )}

                    <div className="saved-build-card-badges">
                      {build.category && (
                        <span
                          className={`saved-build-category saved-build-category-${build.category
                            .toLocaleLowerCase("it")
                            .replaceAll(" ", "-")}`}
                        >
                          {build.category}
                        </span>
                      )}

                      {getBuildSourceLabel(getBuildSourceUrl(build)) && (
                        <span
                          className={`saved-build-source saved-build-source-${
                            getBuildSourceLabel(getBuildSourceUrl(build))?.key
                          }`}
                        >
                          {getBuildSourceLabel(getBuildSourceUrl(build))?.label}
                        </span>
                      )}

                      <BuildVariantCount userId={user.uid} buildId={build.id} />
                    </div>
                  </div>
                </div>

                {getBuildSourceUrl(build) && (
                  <span className="saved-build-link">
                    Vedi dettagli ↗
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {isModalOpen && (
        <div
          className="build-modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <section
            className="build-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-build-title"
          >
            <div className="build-modal-header">
              <div>
                <p className="eyebrow">Nuova pergamena</p>
                <h2 id="new-build-title">
                  Nuova build — {currentGame.shortName}
                </h2>
              </div>

              <button
                className="build-modal-close"
                type="button"
                onClick={closeModal}
                aria-label="Chiudi il form"
                disabled={isSaving}
              >
                ×
              </button>
            </div>

            <form className="build-modal-form" onSubmit={handleSubmit}>
              <label>
                Nome build *
                <input
                  autoFocus
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Es. Lightning Arrow Deadeye"
                  required
                />
              </label>

              <div className="build-modal-form-grid">
                <label>
                  Classe / personaggio *
                  <select
                    value={characterClass}
                    onChange={(event) =>
                      setCharacterClass(event.target.value)
                    }
                    required
                  >
                    <option value="">Seleziona una classe</option>
                    {GAME_CLASSES[gameSlug as GameSlug].map((gameClass) => (
                      <option key={gameClass} value={gameClass}>
                        {gameClass}
                      </option>
                    ))}
                  </select>

                  {characterClass &&
                    getClassCrestImage(gameSlug, characterClass) && (
                      <span className="build-class-preview">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            getClassCrestImage(gameSlug, characterClass) ?? ""
                          }
                          alt={`Stemma ${characterClass}`}
                        />
                        <span>
                          <small>Stemma assegnato</small>
                          {characterClass}
                        </span>
                      </span>
                    )}
                </label>

                <label>
                  Patch o stagione
                  <input
                    value={patch}
                    onChange={(event) => setPatch(event.target.value)}
                    placeholder="Es. 0.3 / Season 10"
                  />
                </label>
              </div>

              <label>
                Categoria
                <input
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="Es. Mapping, Bossing, Leveling"
                />
              </label>

              <div className="build-modal-form-grid">
                <label>
                  Tipo fonte
                  <select
                    value={sourceKind}
                    onChange={(event) =>
                      setSourceKind(
                        event.target.value as
                          | "manual"
                          | "planner"
                          | "guide"
                          | "external"
                      )
                    }
                  >
                    <option value="manual">Compilata manualmente</option>
                    <option value="planner">Planner / Path of Building</option>
                    <option value="guide">Guida o video esterno</option>
                    <option value="external">Altro link esterno</option>
                  </select>
                </label>

                <label>
                  Link build / planner
                  <input
                    type="url"
                    value={buildLink}
                    onChange={(event) => setBuildLink(event.target.value)}
                    placeholder={
                      sourceKind === "planner"
                        ? "Es. https://pobb.in/..."
                        : "https://..."
                    }
                  />
                </label>
              </div>

              <label>
                Note personali
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Gem setup, obiettivi, varianti, prossimi upgrade..."
                  rows={4}
                />
              </label>

              {error && (
                <p className="build-modal-error" role="alert">
                  {error}
                </p>
              )}

              <div className="build-modal-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                >
                  Annulla
                </button>

                <button
                  className="button button-gold"
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving ? "Salvataggio..." : "Salva build"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
