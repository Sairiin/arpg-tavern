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
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { FormEvent, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/client";
import { BuildVariants } from "@/components/builds/build-variants";
import { CharacterSheet } from "@/components/builds/character-sheet";
import {
  arpgGames,
  buildCategories,
  type ArpgGame,
  type BuildCategory,
  type BuildSourceType,
  type BuildVisibility,
  type ImportedBuildData,
  type ImportedItem,
  type ImportedSkillGroup,
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
  ascendancy: string;
  patch: string;
  category: BuildCategory;
  visibility: BuildVisibility;
  notes: string;
  sourceType?: BuildSourceType;
  sourceUrl?: string;
  externalAuthor?: string;
  pobUrl?: string;
  pobCode?: string;
  poe2BuildJson?: string;
  poe2BuildFileName?: string;
  importedData?: ImportedBuildData;
};

const emptyBuild: BuildData = {
  title: "",
  game: "Path of Exile 2",
  characterClass: "",
  ascendancy: "",
  patch: "",
  category: "League starter",
  visibility: "public",
  notes: "",
  sourceType: "manual",
  sourceUrl: "",
  externalAuthor: "",
  pobUrl: "",
  pobCode: "",
  poe2BuildJson: "",
  poe2BuildFileName: "",
  importedData: undefined,
};

function getSourceLabel(build: BuildData): string {
  if (build.sourceType === "pob-link") {
    return build.game === "Path of Exile 2"
      ? "Link Path of Building 2"
      : "Link Path of Building";
  }

  if (build.sourceType === "pob-code") {
    return build.game === "Path of Exile 2"
      ? "Codice Path of Building 2"
      : "Codice Path of Building";
  }

  if (build.sourceType === "poe2-build-file") {
    return "File .build Path of Exile 2";
  }

  return "Compilata manualmente";
}

function formatJsonCharacterCount(json: string | undefined): string {
  if (!json) {
    return "0";
  }

  return new Intl.NumberFormat("it-IT").format(json.length);
}

function getItemIcon(rarity: ImportedItem["rarity"]): string {
  if (rarity === "unique") {
    return "✦";
  }

  if (rarity === "rare") {
    return "◆";
  }

  if (rarity === "magic") {
    return "◇";
  }

  return "○";
}

function getItemRarityLabel(rarity: ImportedItem["rarity"]): string {
  if (rarity === "unique") {
    return "Unique";
  }

  if (rarity === "rare") {
    return "Raro";
  }

  if (rarity === "magic") {
    return "Magico";
  }

  if (rarity === "normal") {
    return "Normale";
  }

  return "Sconosciuto";
}

function getMainSkillGroup(
  importedData: ImportedBuildData | undefined
): ImportedSkillGroup | undefined {
  if (!importedData) {
    return undefined;
  }

  return (
        importedData.skills.find((group) => group.isMainSkill) ||
    importedData.skills[0]
  );
}

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

    const userId = user.uid;

    async function loadBuild() {
      setIsLoadingBuild(true);
      setErrorMessage("");

      try {
        const buildReference = doc(db, "users", userId, "builds", buildId);
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
          ascendancy:
            data.ascendancy ||
            data.importedData?.character?.ascendancy ||
            "",
          patch: data.patch || "",
          category: data.category || "League starter",
          visibility: data.visibility || "public",
          notes: data.notes || "",
          sourceType: data.sourceType || "manual",
          sourceUrl: data.sourceUrl || "",
          externalAuthor: data.externalAuthor || "",
          pobUrl: data.pobUrl || "",
          pobCode: data.pobCode || "",
          poe2BuildJson: data.poe2BuildJson || "",
          poe2BuildFileName: data.poe2BuildFileName || "",
          importedData: data.importedData || undefined,
        });

        setVersionLabel(`Versione ${new Date().toLocaleDateString("it-IT")}`);
        setVersionPatch(data.patch || "");
        setVersionCategory(data.category || "League starter");
        setVersionNotes("");
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

    const userId = user.uid;

    const versionsQuery = query(
      collection(db, "users", userId, "builds", buildId, "versions"),
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
              createdAt: data.createdAt || null,
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

    const cleanTitle = build.title.trim();
    const cleanClass = build.characterClass.trim();
    const cleanAscendancy = build.ascendancy.trim();
    const cleanPatch = build.patch.trim();
    const cleanNotes = build.notes.trim();

    if (!cleanTitle || !cleanClass || !cleanPatch) {
      setErrorMessage(
        "Nome, classe e patch/stagione sono obbligatori."
      );
      return;
    }

    setIsSaving(true);

    try {
      await updateDoc(doc(db, "users", user.uid, "builds", buildId), {
        title: cleanTitle,
        game: build.game,
        characterClass: cleanClass,
        ...(cleanAscendancy ? { ascendancy: cleanAscendancy } : {}),
        patch: cleanPatch,
        category: build.category,
        visibility: build.visibility,
        notes: cleanNotes,
        updatedAt: serverTimestamp(),
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
            ascendancy: build.ascendancy.trim(),
            patch: build.patch.trim(),
            category: build.category,
            visibility: build.visibility,
            notes: build.notes.trim(),
            sourceType: build.sourceType || "manual",
            sourceUrl: build.sourceUrl || "",
            externalAuthor: build.externalAuthor || "",
            pobUrl: build.pobUrl || "",
            pobCode: build.pobCode || "",
            poe2BuildJson: build.poe2BuildJson || "",
            poe2BuildFileName: build.poe2BuildFileName || "",
            importedData: build.importedData || null,
          },
          createdAt: serverTimestamp(),
        }
      );

      setSuccessMessage("Nuova versione salvata nel registro.");
      setVersionLabel(`Versione ${new Date().toLocaleDateString("it-IT")}`);
      setVersionPatch(build.patch);
      setVersionCategory(build.category);
      setVersionNotes("");
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

  const sourceLabel = getSourceLabel(build);
  const importedData = build.importedData;
  const mainSkillGroup = getMainSkillGroup(importedData);

  const hasImportedSource =
    build.sourceType === "pob-link" ||
    build.sourceType === "pob-code" ||
    build.sourceType === "poe2-build-file";

  return (
  <main className="character-sheet-page">
    <header className="character-sheet-toolbar">
      <Link href="/dashboard" className="character-sheet-back">
        ← Tutte le build
      </Link>

      <span className="character-sheet-brand">
        ARPG Tavern · Scheda dell’avventuriero
      </span>

      <div className="character-sheet-toolbar-actions">
        <Link
          className="character-sheet-action"
          href={`/builds/${buildId}/compare`}
        >
          Confronta
        </Link>

        <button
          className="character-sheet-action character-sheet-danger"
          type="button"
          onClick={removeBuild}
        >
          Elimina
        </button>
      </div>
    </header>

    <CharacterSheet
      title={build.title}
      game={build.game}
      characterClass={build.characterClass}
      ascendancy={build.ascendancy}
      patch={build.patch}
      category={build.category}
      notes={build.notes}
      importedData={build.importedData}
      onEdit={() => {
        document
          .querySelector(".character-sheet-edit-form")
          ?.scrollIntoView({ behavior: "smooth" });
      }}
    />

    <details className="character-sheet-section character-sheet-edit-form">
      <summary>Modifica dati della build</summary>

      <form className="detail-form" onSubmit={saveBuild}>
        <label className="detail-field detail-field-wide">
          <span>Nome della build</span>
          <input
            value={build.title}
            onChange={(event) =>
              setBuild((current) => ({
                ...current,
                title: event.target.value,
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
                game: event.target.value as ArpgGame,
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
          <span>Classe</span>
          <input
            value={build.characterClass}
            onChange={(event) =>
              setBuild((current) => ({
                ...current,
                characterClass: event.target.value,
              }))
            }
            maxLength={70}
          />
        </label>

        <label className="detail-field">
          <span>Ascendancy</span>
          <input
            value={build.ascendancy}
            onChange={(event) =>
              setBuild((current) => ({
                ...current,
                ascendancy: event.target.value,
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
                patch: event.target.value,
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
                category: event.target.value as BuildCategory,
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
                visibility: event.target.value as BuildVisibility,
              }))
            }
          >
            <option value="private">Privata — solo io</option>
            <option value="public">Pubblica — Community</option>
          </select>
        </label>

        <label className="detail-field detail-field-wide">
          <span>Note e obiettivi</span>
          <textarea
            value={build.notes}
            onChange={(event) =>
              setBuild((current) => ({
                ...current,
                notes: event.target.value,
              }))
            }
            rows={7}
            maxLength={1500}
          />
        </label>

        <div className="detail-form-actions">
          <button
            className="save-build-button"
            type="submit"
            disabled={isSaving}
          >
            {isSaving ? "Salvataggio..." : "Salva modifiche"}
          </button>
        </div>
      </form>
    </details>

    <details className="character-sheet-section character-sheet-archive">
      <summary>Cronache e versioni</summary>

      <form className="version-form" onSubmit={createVersion}>
        <label className="detail-field">
          <span>Nome versione</span>
          <input
            value={versionLabel}
            onChange={(event) => setVersionLabel(event.target.value)}
            maxLength={90}
          />
        </label>

        <label className="detail-field">
          <span>Patch / stagione</span>
          <input
            value={versionPatch}
            onChange={(event) => setVersionPatch(event.target.value)}
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
          <p className="version-empty">Nessuna versione salvata.</p>
        ) : (
          versions.map((version) => (
            <article className="version-item" key={version.id}>
              <span>{version.category}</span>
              <h3>{version.label}</h3>
              <p>Patch/Stagione {version.patch}</p>
              {version.notes && <small>{version.notes}</small>}
            </article>
          ))
        )}
      </div>
    </details>

        <section className="character-sheet-section character-sheet-variants-wrapper">
      <BuildVariants
        userId={user.uid}
        buildId={buildId}
        buildTitle={build.title}
        buildPatch={build.patch}
        buildCategory={build.category}
        buildVisibility={build.visibility}
        buildNotes={build.notes}
      />
    </section>

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