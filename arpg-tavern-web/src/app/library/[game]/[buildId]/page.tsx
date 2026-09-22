"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import {
  getClassBackgroundImage,
  getClassCrestImage,
} from "@/lib/games/class-crests";
import {
  getBuildSourceLabel,
  getBuildSourceUrl,
} from "@/lib/builds/source-label";
import { BuildVariantsPanel } from "@/components/library/build-variants-panel";
import "../../../dashboard/dashboard.css";

const games = {
  poe1: { name: "Path of Exile 1", shortName: "PoE 1" },
  poe2: { name: "Path of Exile 2", shortName: "PoE 2" },
  "diablo-2": { name: "Diablo II", shortName: "Diablo II" },
  "diablo-4": { name: "Diablo IV", shortName: "Diablo IV" },
  "last-epoch": { name: "Last Epoch", shortName: "Last Epoch" },
  "grim-dawn": { name: "Grim Dawn", shortName: "Grim Dawn" },
} as const;

type GameSlug = keyof typeof games;

const categories = [
  "Leveling",
  "Mapping",
  "Bossing",
  "Farming",
  "Hardcore",
  "SSF",
  "PvP",
  "Generale",
];

function isGameSlug(value: string): value is GameSlug {
  return value in games;
}

type StoredBuild = {
  title?: string;
  game?: string;
  characterClass?: string;
  patch?: string;
  category?: string;
  notes?: string;
  buildLink?: string;
  sourceUrl?: string;
  archived?: boolean;
  createdAt?: {
    seconds: number;
    nanoseconds: number;
  } | null;
  updatedAt?: {
    seconds: number;
    nanoseconds: number;
  } | null;
};

type BuildFormValues = {
  title: string;
  characterClass: string;
  patch: string;
  category: string;
  notes: string;
  buildLink: string;
};

function buildToFormValues(build: StoredBuild): BuildFormValues {
  return {
    title: build.title ?? "",
    characterClass: build.characterClass ?? "",
    patch: build.patch ?? "",
    category: build.category ?? "Generale",
    notes: build.notes ?? "",
    buildLink: build.buildLink ?? "",
  };
}

function makeCopyTitle(title: string) {
  const trimmedTitle = title.trim() || "Build senza nome";
  return `${trimmedTitle} — Copia`;
}

function formatBuildDate(
  timestamp?: { seconds: number; nanoseconds: number } | null,
) {
  if (!timestamp?.seconds) {
    return "Non disponibile";
  }

  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp.seconds * 1000));
}

export default function BuildDetailPage() {
  const params = useParams<{ game: string; buildId: string }>();
  const router = useRouter();
  const gameSlug = params.game;
  const buildId = params.buildId;

  const [user, setUser] = useState<User | null>(null);
  const [build, setBuild] = useState<StoredBuild | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formValues, setFormValues] = useState<BuildFormValues>({
    title: "",
    characterClass: "",
    patch: "",
    category: "Generale",
    notes: "",
    buildLink: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState("");

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
    async function loadBuild() {
      if (!user || !isGameSlug(gameSlug) || !buildId) {
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const buildReference = doc(db, "users", user.uid, "builds", buildId);
        const snapshot = await getDoc(buildReference);

        if (!snapshot.exists()) {
          setError("Questa build non esiste o non è più disponibile.");
          setBuild(null);
          return;
        }

        const data = snapshot.data() as StoredBuild;

        if (data.game !== gameSlug) {
          setError("Questa build non appartiene all'archivio selezionato.");
          setBuild(null);
          return;
        }

        setBuild(data);
      } catch (loadError) {
        console.error("Errore lettura build:", loadError);
        setError("Non è stato possibile aprire la build.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadBuild();
  }, [user, gameSlug, buildId]);

  function openEditModal() {
    if (!build) {
      return;
    }

    setActionError("");
    setFormValues(buildToFormValues(build));
    setIsEditOpen(true);
  }

  function closeEditModal() {
    if (isSaving) {
      return;
    }

    setIsEditOpen(false);
    setActionError("");
  }

  function updateFormValue(
    field: keyof BuildFormValues,
    value: string,
  ) {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || !build || !buildId) {
      return;
    }

    const title = formValues.title.trim();
    const characterClass = formValues.characterClass.trim();

    if (!title || !characterClass) {
      setActionError("Inserisci un titolo e seleziona una classe.");
      return;
    }

    setIsSaving(true);
    setActionError("");

    try {
      const buildReference = doc(db, "users", user.uid, "builds", buildId);
      const updatedBuild = {
        title,
        game: gameSlug,
        characterClass,
        patch: formValues.patch.trim(),
        category: formValues.category,
        notes: formValues.notes.trim(),
        buildLink: formValues.buildLink.trim(),
        sourceUrl: formValues.buildLink.trim(),
        updatedAt: serverTimestamp(),
      };

      await updateDoc(buildReference, updatedBuild);

      setBuild((current) =>
        current
          ? {
              ...current,
              title,
              game: gameSlug,
              characterClass,
              patch: formValues.patch.trim(),
              category: formValues.category,
              notes: formValues.notes.trim(),
              buildLink: formValues.buildLink.trim(),
              sourceUrl: formValues.buildLink.trim(),
            }
          : current,
      );
      setIsEditOpen(false);
    } catch (saveError) {
      console.error("Errore aggiornamento build:", saveError);
      setActionError("Non è stato possibile salvare le modifiche.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDuplicate() {
    if (!user || !build || !isGameSlug(gameSlug)) {
      return;
    }

    setIsDuplicating(true);
    setActionError("");

    try {
      const newBuildReference = doc(
        db,
        "users",
        user.uid,
        "builds",
        crypto.randomUUID(),
      );

      const copiedBuild = {
        title: makeCopyTitle(build.title ?? ""),
        game: gameSlug,
        characterClass: build.characterClass ?? "",
        patch: build.patch ?? "",
        category: build.category ?? "Generale",
        notes: build.notes ?? "",
        buildLink: build.sourceUrl ?? build.buildLink ?? "",
        archived: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(newBuildReference, copiedBuild);
      router.push(`/library/${gameSlug}/${newBuildReference.id}`);
    } catch (duplicateError) {
      console.error("Errore duplicazione build:", duplicateError);
      setActionError("Non è stato possibile duplicare la build.");
    } finally {
      setIsDuplicating(false);
    }
  }

  async function handleArchiveToggle() {
    if (!user || !build || !buildId) {
      return;
    }

    setIsArchiving(true);
    setActionError("");

    try {
      const archived = !build.archived;
      const buildReference = doc(db, "users", user.uid, "builds", buildId);

      await updateDoc(buildReference, {
        archived,
        updatedAt: serverTimestamp(),
      });

      setBuild((current) =>
        current
          ? {
              ...current,
              archived,
            }
          : current,
      );
    } catch (archiveError) {
      console.error("Errore archivio build:", archiveError);
      setActionError("Non è stato possibile aggiornare lo stato della build.");
    } finally {
      setIsArchiving(false);
    }
  }

  async function handleDelete() {
    if (!user || !buildId || !build) {
      return;
    }

    const confirmed = window.confirm(
      `Eliminare definitivamente "${build.title || "questa build"}"? Questa azione non può essere annullata.`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setActionError("");

    try {
      const buildReference = doc(db, "users", user.uid, "builds", buildId);
      await deleteDoc(buildReference);
      router.replace(`/library/${gameSlug}`);
    } catch (deleteError) {
      console.error("Errore eliminazione build:", deleteError);
      setActionError("Non è stato possibile eliminare la build.");
      setIsDeleting(false);
    }
  }

  if (!isGameSlug(gameSlug)) {
    return null;
  }

  const currentGame = games[gameSlug];
  const buildSourceUrl = build ? getBuildSourceUrl(build) : "";
  const buildSource = getBuildSourceLabel(buildSourceUrl);
  const isBusy = isSaving || isDuplicating || isArchiving || isDeleting;

  if (isCheckingAuth || isLoading) {
    return (
      <main className="dashboard-page dashboard-loading">
        <p>Il locandiere sta aprendo la pergamena...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="dashboard-page game-library-page">
      <header className="dashboard-topbar">
        <Link
          className="brand brand-build-detail"
          href={`/library/${gameSlug}`}
          aria-label={`Torna alle build di ${currentGame.shortName}`}
        >
          <span className="brand-mark build-detail-class-mark" aria-hidden="true">
            {build && getClassCrestImage(gameSlug, build.characterClass || "") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={
                  getClassCrestImage(gameSlug, build.characterClass || "") ?? ""
                }
                alt=""
              />
            ) : (
              <span className="build-detail-class-fallback">◈</span>
            )}
          </span>

          <span className="brand-text">
            <small>La casa dei theorycrafter</small>
            {build?.title || "Build senza nome"}
          </span>
        </Link>

        <Link className="library-back-link" href={`/library/${gameSlug}`}>
          ← Torna a {currentGame.shortName}
        </Link>
      </header>

      <section className="build-detail-page">
        {error && (
          <div className="builds-empty-state builds-error-state">
            <span aria-hidden="true">!</span>
            <p>{error}</p>
          </div>
        )}

        {build && (
          <article className="build-showcase">
            {getClassBackgroundImage(build.characterClass || "") && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="build-showcase-background"
                src={getClassBackgroundImage(build.characterClass || "") ?? ""}
                alt=""
                aria-hidden="true"
              />
            )}

            <header className="build-showcase-hero">
              {getClassCrestImage(gameSlug, build.characterClass || "") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="build-showcase-class-crest"
                  src={
                    getClassCrestImage(gameSlug, build.characterClass || "") ??
                    ""
                  }
                  alt={`Stemma ${build.characterClass || "build"}`}
                />
              ) : (
                <div className="build-showcase-orb" aria-hidden="true">
                  <span>◈</span>
                </div>
              )}

              <div className="build-showcase-copy">
                <p className="eyebrow">{currentGame.name}</p>
                <h1>{build.title || "Build senza nome"}</h1>
                <p className="build-showcase-subtitle">
                  {build.category ||
                    "Una pergamena personale custodita nel tuo grimorio."}
                </p>

                {build.archived && (
                  <p className="build-showcase-status">Build archiviata</p>
                )}
              </div>

              {buildSourceUrl && (
                <a
                  className="button button-gold build-showcase-action"
                  href={buildSourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="build-showcase-action-label">
                    {buildSource?.label
                      ? `Apri ${buildSource.label}`
                      : "Apri build"}
                  </span>
                </a>
              )}
            </header>

            <section className="build-showcase-toolbar" aria-label="Azioni build">
              <button
                className="button button-secondary"
                type="button"
                onClick={openEditModal}
                disabled={isBusy}
              >
                Modifica
              </button>

              <button
                className="button button-secondary"
                type="button"
                onClick={() => void handleDuplicate()}
                disabled={isBusy}
              >
                {isDuplicating ? "Duplicazione..." : "Duplica"}
              </button>

              <button
                className="button button-secondary"
                type="button"
                onClick={() => void handleArchiveToggle()}
                disabled={isBusy}
              >
                {isArchiving
                  ? "Aggiornamento..."
                  : build.archived
                    ? "Riattiva"
                    : "Archivia"}
              </button>

              <button
                className="button build-showcase-delete-button"
                type="button"
                onClick={() => void handleDelete()}
                disabled={isBusy}
              >
                {isDeleting ? "Eliminazione..." : "Elimina"}
              </button>
            </section>

            {actionError && (
              <div className="build-showcase-action-error" role="alert">
                {actionError}
              </div>
            )}

            <section className="build-showcase-stats" aria-label="Dettagli build">
              <div className="build-showcase-stat">
                <span className="build-showcase-stat-icon" aria-hidden="true">
                  ⚔
                </span>
                <div>
                  <small>Classe</small>
                  <strong>{build.characterClass || "Non indicata"}</strong>
                </div>
              </div>

              <div className="build-showcase-stat">
                <span className="build-showcase-stat-icon" aria-hidden="true">
                  ◈
                </span>
                <div>
                  <small>Categoria</small>
                  <strong>{build.category || "Generale"}</strong>
                </div>
              </div>

              <div className="build-showcase-stat">
                <span className="build-showcase-stat-icon" aria-hidden="true">
                  ⌛
                </span>
                <div>
                  <small>Patch / stagione</small>
                  <strong>{build.patch || "Non indicata"}</strong>
                </div>
              </div>
            </section>

            <section className="build-showcase-dates" aria-label="Cronologia build">
              <span>
                <small>Creata</small>
                <strong>{formatBuildDate(build.createdAt)}</strong>
              </span>

              <span>
                <small>Ultima modifica</small>
                <strong>{formatBuildDate(build.updatedAt)}</strong>
              </span>
            </section>

            <section className="build-showcase-notes">
              <div className="build-showcase-section-heading">
                <span aria-hidden="true">✦</span>
                <div>
                  <p className="eyebrow">Appunti dell'avventuriero</p>
                  <h2>Note e strategia</h2>
                </div>
              </div>

              <p>
                {build.notes ||
                  "Nessuna nota è stata aggiunta a questa build. Puoi completarla dalla schermata di modifica."}
              </p>
            </section>

            <BuildVariantsPanel
              userId={user.uid}
              buildId={buildId}
              buildTitle={build.title ?? ""}
              buildPatch={build.patch ?? ""}
              buildCategory={build.category ?? "Generale"}
              buildNotes={build.notes ?? ""}
            />

            <footer className="build-showcase-footer">
              
        

<Link className="button button-secondary" href={`/library/${gameSlug}`}>
                ← Torna alle mie build
              
              <a
                className="pobb-open-link"
                href="https://pobb.in/_YmEjejyB97N"
                target="_blank"
                rel="noreferrer"
              >
                Apri planner
              </a>
</Link>

              {buildSourceUrl ? (
                <a
                  className="button button-secondary"
                  href={buildSourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {buildSource?.label
                    ? `Apri ${buildSource.label} ↗`
                    : "Apri link esterno ↗"}
                </a>
              ) : (
                <span className="build-showcase-muted">
                  Nessun link esterno associato
                </span>
              )}
            </footer>
          </article>
        )}
      </section>

      {build && isEditOpen && (
        <div
          className="build-modal-backdrop"
          role="presentation"
          onMouseDown={closeEditModal}
        >
          <section
            className="build-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-build-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="build-modal-heading">
              <div>
                <p className="eyebrow">Aggiorna il grimorio</p>
                <h2 id="edit-build-title">Modifica build</h2>
              </div>

              <button
                className="build-modal-close"
                type="button"
                onClick={closeEditModal}
                disabled={isSaving}
                aria-label="Chiudi modifica build"
              >
                ×
              </button>
            </div>

            <form className="build-modal-form" onSubmit={handleSave}>
              <label>
                Titolo della build
                <input
                  value={formValues.title}
                  onChange={(event) =>
                    updateFormValue("title", event.target.value)
                  }
                  placeholder="Es. Lightning Arrow Deadeye"
                  required
                />
              </label>

              <label>
                Classe
                <input
                  value={formValues.characterClass}
                  onChange={(event) =>
                    updateFormValue("characterClass", event.target.value)
                  }
                  placeholder="Es. Ranger"
                  required
                />
              </label>

              <div className="build-modal-form-grid">
                <label>
                  Categoria
                  <select
                    value={formValues.category}
                    onChange={(event) =>
                      updateFormValue("category", event.target.value)
                    }
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Patch / stagione
                  <input
                    value={formValues.patch}
                    onChange={(event) =>
                      updateFormValue("patch", event.target.value)
                    }
                    placeholder="Es. 0.3"
                  />
                </label>
              </div>

              <label>
                Link build
                <input
                  value={formValues.buildLink}
                  onChange={(event) =>
                    updateFormValue("buildLink", event.target.value)
                  }
                  placeholder="https://..."
                  type="url"
                />
              </label>

              <label>
                Note e strategia
                <textarea
                  value={formValues.notes}
                  onChange={(event) =>
                    updateFormValue("notes", event.target.value)
                  }
                  placeholder="Appunti, obiettivi, equipaggiamento, passaggi..."
                  rows={6}
                />
              </label>

              {actionError && (
                <p className="build-modal-error" role="alert">
                  {actionError}
                </p>
              )}

              <div className="build-modal-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={closeEditModal}
                  disabled={isSaving}
                >
                  Annulla
                </button>

                <button className="button button-gold" type="submit" disabled={isSaving}>
                  {isSaving ? "Salvataggio..." : "Salva modifiche"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
