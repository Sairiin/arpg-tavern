"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { FormEvent, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/client";
import { BuildVariants } from "@/components/builds/build-variants";
import {
  arpgGames,
  buildCategories,
  type ArpgGame,
  type BuildCategory,
  type BuildVisibility
} from "@/lib/builds/types";
import "./build-detail.css";

type BuildVersion = {
  id: string;
  label: string;
  patch: string;
  category: BuildCategory;
  notes: string;
  createdAt?: {
    seconds: number;
    nanoseconds: number;
  } | null;
};

type BuildData = {
  title: string;
  game: ArpgGame;
  characterClass: string;
  patch: string;
  category: BuildCategory;
  visibility: BuildVisibility;
  notes: string;
};

const emptyBuild: BuildData = {
  title: "",
  game: "Path of Exile 2",
  characterClass: "",
  patch: "",
  category: "League starter",
  visibility: "private",
  notes: ""
};

export default function BuildDetailPage() {
  const router = useRouter();
  const params = useParams<{ buildId: string }>();
  const buildId = params.buildId;

  const [user, setUser] = useState<User | null>(null);
  const [build, setBuild] = useState<BuildData>(emptyBuild);
  const [versions, setVersions] = useState<BuildVersion[]>([]);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoadingBuild, setIsLoadingBuild] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [versionLabel, setVersionLabel] = useState("");
  const [versionPatch, setVersionPatch] = useState("");
  const [versionCategory, setVersionCategory] =
    useState<BuildCategory>("League starter");
  const [versionNotes, setVersionNotes] = useState("");

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
    if (!user || !buildId) {
      return;
    }

    async function loadBuild() {
      setIsLoadingBuild(true);
      setErrorMessage("");

      try {
        const buildReference = doc(db, "users", user.uid, "builds", buildId);
        const buildSnapshot = await getDoc(buildReference);

        if (!buildSnapshot.exists()) {
          router.replace("/dashboard");
          return;
        }

        const data = buildSnapshot.data();

        setBuild({
          title: data.title || "",
          game: data.game || "Path of Exile 2",
          characterClass: data.characterClass || "",
          patch: data.patch || "",
          category: data.category || "League starter",
          visibility: data.visibility || "private",
          notes: data.notes || ""
        });

        setVersionLabel(`Versione ${new Date().toLocaleDateString("it-IT")}`);
        setVersionPatch(data.patch || "");
        setVersionCategory(data.category || "League starter");
        setVersionNotes(data.notes || "");
      } catch (error) {
        console.error("Errore caricamento build:", error);
        setErrorMessage("Non è stato possibile aprire questa build.");
      } finally {
        setIsLoadingBuild(false);
      }
    }

    void loadBuild();
  }, [buildId, router, user]);

  useEffect(() => {
    if (!user || !buildId) {
      setVersions([]);
      return;
    }

    const versionsQuery = query(
      collection(db, "users", user.uid, "builds", buildId, "versions"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      versionsQuery,
      (snapshot) => {
        setVersions(
          snapshot.docs.map((versionDocument) => {
            const data = versionDocument.data();

            return {
              id: versionDocument.id,
              label: data.label || "Versione senza nome",
              patch: data.patch || "",
              category: data.category || "Theorycraft",
              notes: data.notes || "",
              createdAt: data.createdAt || null
            };
          })
        );
      },
      (error) => {
        console.error("Errore lettura versioni:", error);
      }
    );

    return () => unsubscribe();
  }, [buildId, user]);

  async function saveBuild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    if (
      !build.title.trim() ||
      !build.characterClass.trim() ||
      !build.patch.trim()
    ) {
      setErrorMessage(
        "Nome, classe/archetipo e patch/stagione sono obbligatori."
      );
      return;
    }

    setIsSaving(true);

    try {
      await updateDoc(doc(db, "users", user.uid, "builds", buildId), {
        title: build.title.trim(),
        game: build.game,
        characterClass: build.characterClass.trim(),
        patch: build.patch.trim(),
        category: build.category,
        visibility: build.visibility,
        notes: build.notes.trim(),
        updatedAt: serverTimestamp()
      });

      setSuccessMessage("Il grimorio è stato aggiornato.");
    } catch (error) {
      console.error("Errore aggiornamento build:", error);
      setErrorMessage("Non è stato possibile aggiornare la build.");
    } finally {
      setIsSaving(false);
    }
  }

  async function createVersion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    if (!versionLabel.trim() || !versionPatch.trim()) {
      setErrorMessage(
        "Per salvare una versione inserisci almeno nome e patch/stagione."
      );
      return;
    }

    setIsCreatingVersion(true);

    try {
      await addDoc(
        collection(db, "users", user.uid, "builds", buildId, "versions"),
        {
          label: versionLabel.trim(),
          patch: versionPatch.trim(),
          category: versionCategory,
          notes: versionNotes.trim(),
          buildSnapshot: {
            title: build.title.trim(),
            game: build.game,
            characterClass: build.characterClass.trim(),
            patch: build.patch.trim(),
            category: build.category,
            visibility: build.visibility,
            notes: build.notes.trim()
          },
          createdAt: serverTimestamp()
        }
      );

      setSuccessMessage("Nuova versione salvata nel registro.");
      setVersionLabel(`Versione ${new Date().toLocaleDateString("it-IT")}`);
      setVersionPatch(build.patch);
      setVersionCategory(build.category);
      setVersionNotes(build.notes);
    } catch (error) {
      console.error("Errore salvataggio versione:", error);
      setErrorMessage("Non è stato possibile salvare la nuova versione.");
    } finally {
      setIsCreatingVersion(false);
    }
  }

  async function removeBuild() {
    if (!user) {
      return;
    }

    const confirmed = window.confirm(
      "Vuoi eliminare questa build? Le versioni salvate dovranno essere eliminate separatamente in una fase successiva."
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteDoc(doc(db, "users", user.uid, "builds", buildId));
      router.push("/dashboard");
    } catch (error) {
      console.error("Errore eliminazione build:", error);
      setErrorMessage("Non è stato possibile eliminare la build.");
    }
  }

  if (isCheckingAuth || isLoadingBuild) {
    return (
      <main className="build-detail-page build-detail-loading">
        <p>Il locandiere apre il tuo grimorio...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="build-detail-page">
      <header className="build-detail-topbar">
        <Link className="brand" href="/dashboard">
          <span className="brand-mark">✦</span>
          <span className="brand-text">
            <small>La casa dei theorycrafter</small>
            ARPG Tavern
          </span>
        </Link>

        <Link className="build-back-link" href="/dashboard">
          ← Tutte le build
        </Link>
      </header>

      <section className="build-detail-hero">
        <div>
          <p className="eyebrow">Grimorio personale</p>
          <h1>{build.title || "Build senza nome"}</h1>
          <p>
            {build.game} · {build.characterClass} · Patch/Stagione{" "}
            {build.patch}
          </p>
        </div>

        <div className="build-detail-hero-actions">
          <Link className="compare-build-link" href={`/builds/${buildId}/compare`}>
            Confronta build
          </Link>

          <button
            className="delete-build-button"
            type="button"
            onClick={removeBuild}
          >
            Elimina build
          </button>
        </div>
      </section>

      <div className="build-detail-layout">
        <section className="build-detail-card">
          <div className="detail-card-title">
            <span aria-hidden="true">⚔</span>
            <div>
              <p className="eyebrow">Pagina principale</p>
              <h2>Informazioni della build</h2>
            </div>
          </div>

          <form className="detail-form" onSubmit={saveBuild}>
            <label className="detail-field detail-field-wide">
              <span>Nome della build</span>
              <input
                value={build.title}
                onChange={(event) =>
                  setBuild((current) => ({
                    ...current,
                    title: event.target.value
                  }))
                }
                maxLength={90}
              />
            </label>

            <label className="detail-field">
              <span>Gioco</span>
              <select
                value={build.game}
                onChange={(event) =>
                  setBuild((current) => ({
                    ...current,
                    game: event.target.value as ArpgGame
                  }))
                }
              >
                {arpgGames.map((gameName) => (
                  <option key={gameName} value={gameName}>
                    {gameName}
                  </option>
                ))}
              </select>
            </label>

            <label className="detail-field">
              <span>Classe o archetipo</span>
              <input
                value={build.characterClass}
                onChange={(event) =>
                  setBuild((current) => ({
                    ...current,
                    characterClass: event.target.value
                  }))
                }
                maxLength={70}
              />
            </label>

            <label className="detail-field">
              <span>Patch / stagione</span>
              <input
                value={build.patch}
                onChange={(event) =>
                  setBuild((current) => ({
                    ...current,
                    patch: event.target.value
                  }))
                }
                maxLength={50}
              />
            </label>

            <label className="detail-field">
              <span>Tipo di build</span>
              <select
                value={build.category}
                onChange={(event) =>
                  setBuild((current) => ({
                    ...current,
                    category: event.target.value as BuildCategory
                  }))
                }
              >
                {buildCategories.map((categoryName) => (
                  <option key={categoryName} value={categoryName}>
                    {categoryName}
                  </option>
                ))}
              </select>
            </label>

            <label className="detail-field">
              <span>Visibilità</span>
              <select
                value={build.visibility}
                onChange={(event) =>
                  setBuild((current) => ({
                    ...current,
                    visibility: event.target.value as BuildVisibility
                  }))
                }
              >
                <option value="private">Privata — solo io</option>
                <option value="unlisted">Non in elenco</option>
              </select>
            </label>

            <label className="detail-field detail-field-wide">
              <span>Note e obiettivi</span>
              <textarea
                value={build.notes}
                onChange={(event) =>
                  setBuild((current) => ({
                    ...current,
                    notes: event.target.value
                  }))
                }
                rows={7}
                maxLength={1500}
              />
            </label>

            <div className="detail-form-actions">
              <button className="save-build-button" type="submit" disabled={isSaving}>
                {isSaving ? "Salvataggio..." : "Salva modifiche"}
              </button>
            </div>
          </form>
        </section>

        <aside className="versions-panel">
          <div className="versions-panel-heading">
            <p className="eyebrow">Cronache della build</p>
            <h2>Versioni salvate</h2>
            <p>
              Salva una fotografia della build prima di cambiare patch,
              obiettivo o configurazione.
            </p>
          </div>

          <form className="version-form" onSubmit={createVersion}>
            <label className="detail-field">
              <span>Nome versione</span>
              <input
                value={versionLabel}
                onChange={(event) => setVersionLabel(event.target.value)}
                placeholder="Es. Bossing v1"
                maxLength={90}
              />
            </label>

            <label className="detail-field">
              <span>Patch / stagione</span>
              <input
                value={versionPatch}
                onChange={(event) => setVersionPatch(event.target.value)}
                placeholder="Es. 0.3"
                maxLength={50}
              />
            </label>

            <label className="detail-field">
              <span>Tipo versione</span>
              <select
                value={versionCategory}
                onChange={(event) =>
                  setVersionCategory(event.target.value as BuildCategory)
                }
              >
                {buildCategories.map((categoryName) => (
                  <option key={categoryName} value={categoryName}>
                    {categoryName}
                  </option>
                ))}
              </select>
            </label>

            <label className="detail-field">
              <span>Nota versione</span>
              <textarea
                value={versionNotes}
                onChange={(event) => setVersionNotes(event.target.value)}
                placeholder="Cosa cambia in questa versione?"
                rows={4}
                maxLength={1000}
              />
            </label>

            <button
              className="save-version-button"
              type="submit"
              disabled={isCreatingVersion}
            >
              {isCreatingVersion ? "Sigillo la versione..." : "Salva snapshot"}
            </button>
          </form>

          <div className="version-list">
            {versions.length === 0 ? (
              <p className="version-empty">
                Nessuna versione salvata. Crea il primo snapshot prima di
                modificare la build.
              </p>
            ) : (
              versions.map((version) => (
                <article className="version-item" key={version.id}>
                  <div>
                    <span>{version.category}</span>
                    <h3>{version.label}</h3>
                    <p>Patch/Stagione {version.patch}</p>
                    {version.notes && <small>{version.notes}</small>}
                  </div>
                  <span className="version-rune" aria-hidden="true">
                    ✦
                  </span>
                </article>
              ))
            )}
          </div>
        </aside>
      </div>
            <div className="build-variants-container">
        <BuildVariants
          userId={user.uid}
          buildId={buildId}
          buildTitle={build.title}
          buildPatch={build.patch}
          buildCategory={build.category}
          buildVisibility={build.visibility}
          buildNotes={build.notes}
        />
      </div>

      {(errorMessage || successMessage) && (
        <div
          className={`build-detail-message ${
            errorMessage ? "build-detail-message-error" : ""
          }`}
        >
          {errorMessage || successMessage}
        </div>
      )}
    </main>
  );
}
