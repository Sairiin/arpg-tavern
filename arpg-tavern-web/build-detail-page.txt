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
  visibility: "private",
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
          visibility: data.visibility || "private",
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
            {build.game} · {build.characterClass}
            {build.ascendancy ? ` · ${build.ascendancy}` : ""} · Patch/Stagione{" "}
            {build.patch}
            {importedData?.character.level
              ? ` · Livello ${importedData.character.level}`
              : ""}
          </p>
        </div>

        <div className="build-detail-hero-actions">
          <Link
            className="compare-build-link"
            href={`/builds/${buildId}/compare`}
          >
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

      {importedData && (
        <section className="build-detail-card build-imported-data-card">
          <div className="detail-card-title">
            <span aria-hidden="true">✦</span>

            <div>
              <p className="eyebrow">Build decifrata</p>
              <h2>Il cuore dell’avventuriero</h2>
            </div>
          </div>

          <div className="build-import-summary">
            <article className="build-import-stat">
              <span>Classe</span>
              <strong>{importedData.character.className || build.characterClass}</strong>
            </article>

            <article className="build-import-stat">
              <span>Ascendancy</span>
              <strong>{importedData.character.ascendancy || "Non rilevata"}</strong>
            </article>

            <article className="build-import-stat">
              <span>Livello</span>
              <strong>
                {importedData.character.level
                  ? `Livello ${importedData.character.level}`
                  : "Non rilevato"}
              </strong>
            </article>

            <article className="build-import-stat">
              <span>Passivi</span>
              <strong>{importedData.summary.passiveCount} nodi</strong>
            </article>

            <article className="build-import-stat">
              <span>Skill</span>
              <strong>{importedData.summary.skillGroupCount} gruppi</strong>
            </article>

            <article className="build-import-stat">
              <span>Equipaggiamento</span>
              <strong>{importedData.summary.itemCount} oggetti</strong>
            </article>
          </div>

          {mainSkillGroup && (
            <section className="build-import-content">
              <p>Configurazione skill principale</p>

              <div className="imported-skill-main">
                <div>
                  <span>Gruppo</span>
                  <strong>{mainSkillGroup.label}</strong>
                </div>

                <div className="imported-gem-list">
                  {mainSkillGroup.gems.map((gem, index) => (
                    <span
                      className={index === 0 ? "imported-gem-active" : ""}
                      key={`${gem.name}-${index}`}
                    >
                      {gem.name}
                      {gem.level ? ` · Lv ${gem.level}` : ""}
                      {gem.quality ? ` · Q ${gem.quality}%` : ""}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          )}

          {importedData.skills.length > 0 && (
            <details className="build-import-content">
              <summary>
                Mostra tutte le skill e gemme ({importedData.summary.skillGroupCount} gruppi)
              </summary>

              <div className="imported-skill-groups">
                {importedData.skills.map((group, groupIndex) => (
                  <article
                    className="imported-skill-group"
                    key={`${group.label}-${groupIndex}`}
                  >
                    <div>
                      <span>{group.isMainSkill ? "Skill principale" : "Gruppo skill"}</span>
                      <h3>{group.label}</h3>
                    </div>

                    <div className="imported-gem-list">
                      {group.gems.map((gem, gemIndex) => (
                        <span
                          className={
                            group.isMainSkill && gemIndex === 0
                              ? "imported-gem-active"
                              : ""
                          }
                          key={`${gem.name}-${gemIndex}`}
                        >
                          {gem.name}
                          {gem.level ? ` · Lv ${gem.level}` : ""}
                          {gem.quality ? ` · Q ${gem.quality}%` : ""}
                          {!gem.enabled ? " · Disattivata" : ""}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </details>
          )}

          {importedData.items.length > 0 && (
            <details className="build-import-content">
              <summary>
                Mostra equipaggiamento ({importedData.summary.itemCount} oggetti)
              </summary>

              <div className="imported-item-list">
                {importedData.items.map((item, itemIndex) => (
                  <article
                    className={`imported-item imported-item-${item.rarity || "unknown"}`}
                    key={`${item.slot}-${item.name}-${itemIndex}`}
                  >
                    <span className="imported-item-rune" aria-hidden="true">
                      {getItemIcon(item.rarity)}
                    </span>

                    <div>
                      <span>{item.slot}</span>
                      <h3>{item.name}</h3>
                      <p>
                        {item.baseType || "Base non rilevata"} ·{" "}
                        {getItemRarityLabel(item.rarity)}
                      </p>
                    </div>

                    {item.rawText && (
                      <details className="imported-item-raw">
                        <summary>Dettagli</summary>
                        <pre>{item.rawText}</pre>
                      </details>
                    )}
                  </article>
                ))}
              </div>
            </details>
          )}

          <div className="build-passive-tree-placeholder">
            <div>
              <p className="eyebrow">Passivi importati</p>
              <h3>{importedData.summary.passiveCount} nodi allocati</h3>
              <p>
                Il codice PoB ha fornito gli ID dei nodi. Il prossimo
                aggiornamento collegherà questi ID al dataset dell’albero per
                disegnare il percorso con zoom, nodi e tooltip.
              </p>
            </div>

            <div className="passive-tree-runes" aria-hidden="true">
              <span>◌</span>
              <span>◉</span>
              <span>◆</span>
              <span>◉</span>
              <span>◌</span>
            </div>
          </div>
        </section>
      )}

      {hasImportedSource && !importedData && (
        <section className="build-detail-card build-imported-data-card">
          <div className="detail-card-title">
            <span aria-hidden="true">✦</span>

            <div>
              <p className="eyebrow">Archivio di importazione</p>
              <h2>Dati della build importata</h2>
            </div>
          </div>

          <div className="build-import-summary">
            <article className="build-import-stat">
              <span>Metodo</span>
              <strong>{sourceLabel}</strong>
            </article>

            <article className="build-import-stat">
              <span>Gioco</span>
              <strong>{build.game}</strong>
            </article>

            <article className="build-import-stat">
              <span>Stato</span>
              <strong>
                {build.sourceType === "poe2-build-file"
                  ? "JSON caricato"
                  : "Riferimento salvato"}
              </strong>
            </article>
          </div>

          {build.sourceType === "pob-link" && build.pobUrl && (
            <div className="build-import-content">
              <p>Link Path of Building</p>
              <a
                className="build-import-external-link"
                href={build.pobUrl}
                target="_blank"
                rel="noreferrer"
              >
                Apri build in Path of Building ↗
              </a>
            </div>
          )}

          {build.sourceType === "pob-code" && build.pobCode && (
            <details className="build-import-content">
              <summary>Mostra il codice Path of Building</summary>
              <textarea
                aria-label="Codice Path of Building"
                value={build.pobCode}
                readOnly
                rows={8}
              />
            </details>
          )}

          {build.sourceType === "poe2-build-file" && build.poe2BuildJson && (
            <div className="build-import-content">
              <div className="build-file-import-heading">
                <div>
                  <p>File .build di Path of Exile 2</p>
                  <strong>
                    {build.poe2BuildFileName || "File .build senza nome"}
                  </strong>
                </div>

                <span>
                  {formatJsonCharacterCount(build.poe2BuildJson)} caratteri JSON
                </span>
              </div>

              <details>
                <summary>Mostra JSON originale</summary>
                <pre className="build-json-preview">{build.poe2BuildJson}</pre>
              </details>
            </div>
          )}
        </section>
      )}

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
                placeholder="Es. Slayer, Deadeye, Stormweaver..."
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
                    notes: event.target.value,
                  }))
                }
                rows={7}
                maxLength={1500}
                placeholder="Obiettivo della build, budget, priorità e note personali..."
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
                placeholder="Es. 3.29"
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
              {isCreatingVersion
                ? "Sigillo la versione..."
                : "Salva snapshot"}
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