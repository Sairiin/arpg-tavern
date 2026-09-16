"use client";

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { CoinFountain } from "@/components/tavern/coin-fountain";
import { db } from "@/lib/firebase/client";
import { importPobCode } from "@/lib/builds/pob-import";
import {
  arpgGames,
  buildCategories,
  type ArpgGame,
  type BuildCategory,
  type BuildSourceType,
  type BuildVisibility,
  type ImportedBuildData,
} 

from "@/lib/builds/types";

type BuildFormProps = {
  userId: string;
};

type Poe2BuildPreview = {
  fileName: string;
  name: string;
  author: string;
  characterClass: string;
};

function getTextValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getPoe2BuildPreview(
  parsedBuild: Record<string, unknown>,
  fileName: string
): Poe2BuildPreview {
  const buildData =
    parsedBuild.Build &&
    typeof parsedBuild.Build === "object" &&
    !Array.isArray(parsedBuild.Build)
      ? (parsedBuild.Build as Record<string, unknown>)
      : parsedBuild;

  const metadata =
    buildData.metadata &&
    typeof buildData.metadata === "object" &&
    !Array.isArray(buildData.metadata)
      ? (buildData.metadata as Record<string, unknown>)
      : {};

  const name =
    getTextValue(buildData.name) ||
    getTextValue(buildData.Name) ||
    getTextValue(metadata.name) ||
    getTextValue(metadata.title);

  const author =
    getTextValue(buildData.author) ||
    getTextValue(buildData.Author) ||
    getTextValue(metadata.author) ||
    getTextValue(metadata.creator);

  const characterClass =
    getTextValue(buildData.class) ||
    getTextValue(buildData.characterClass) ||
    getTextValue(buildData.className) ||
    getTextValue(metadata.class) ||
    getTextValue(metadata.characterClass);

  return {
    fileName,
    name,
    author,
    characterClass,
  };
}

function getImportedBuildTitle(importedData: ImportedBuildData): string {
  const mainSkillName = importedData.summary.mainSkillName;
  const ascendancy = importedData.character.ascendancy;
  const className = importedData.character.className;

  if (mainSkillName && ascendancy) {
    return `${ascendancy} ${mainSkillName}`;
  }

  if (mainSkillName && className) {
    return `${className} ${mainSkillName}`;
  }

  if (ascendancy) {
    return ascendancy;
  }

  if (className) {
    return className;
  }

  return "";
}

export function BuildForm({ userId }: BuildFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [game, setGame] = useState<ArpgGame>("Path of Exile 2");
  const [characterClass, setCharacterClass] = useState("");
  const [ascendancy, setAscendancy] = useState("");
  const [patch, setPatch] = useState("");
  const [category, setCategory] = useState<BuildCategory>("League starter");
  const [visibility, setVisibility] = useState<BuildVisibility>("private");
  const [notes, setNotes] = useState("");

  const [sourceType, setSourceType] = useState<BuildSourceType>("manual");
  const [pobUrl, setPobUrl] = useState("");
  const [pobCode, setPobCode] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [externalAuthor, setExternalAuthor] = useState("");

  const [importedData, setImportedData] = useState<ImportedBuildData | null>(
    null
  );
  const [isAnalyzingPob, setIsAnalyzingPob] = useState(false);
  const [pobAnalysisMessage, setPobAnalysisMessage] = useState("");

  const [poe2BuildJson, setPoe2BuildJson] = useState("");
  const [poe2BuildFileName, setPoe2BuildFileName] = useState("");
  const [poe2BuildPreview, setPoe2BuildPreview] =
    useState<Poe2BuildPreview | null>(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isPoe2 = game === "Path of Exile 2";
  const isPoe2BuildFile = sourceType === "poe2-build-file";

  useEffect(() => {
    if (!isPoe2 && sourceType === "poe2-build-file") {
      setSourceType("manual");
    }
  }, [isPoe2, sourceType]);

  function resetPobAnalysis() {
    setImportedData(null);
    setPobAnalysisMessage("");
  }

  function handleGameChange(event: ChangeEvent<HTMLSelectElement>) {
    const selectedGame = event.target.value as ArpgGame;

    setGame(selectedGame);
    setErrorMessage("");
    resetPobAnalysis();

    if (selectedGame === "Path of Exile" && sourceType === "poe2-build-file") {
      setSourceType("manual");
    }
  }

  function handleSourceTypeChange(event: ChangeEvent<HTMLSelectElement>) {
    const selectedSourceType = event.target.value as BuildSourceType;

    setSourceType(selectedSourceType);
    setErrorMessage("");
    resetPobAnalysis();

    if (selectedSourceType !== "poe2-build-file") {
      setPoe2BuildJson("");
      setPoe2BuildFileName("");
      setPoe2BuildPreview(null);
    }
  }

  function handlePobCodeChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setPobCode(event.target.value);
    resetPobAnalysis();
  }
const [isResolvingPobLink, setIsResolvingPobLink] = useState(false);
async function analyzePobLink() {
  setErrorMessage("");
  setPobAnalysisMessage("");

  const cleanPobUrl = pobUrl.trim();

  if (!cleanPobUrl) {
    setErrorMessage("Incolla un link Path of Building prima di analizzarlo.");
    return;
  }

  setIsResolvingPobLink(true);

  try {
    const response = await fetch("/api/pob/resolve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: cleanPobUrl }),
    });

    const result = (await response.json()) as {
      pobCode?: string;
      error?: string;
    };

    if (!response.ok || !result.pobCode) {
      throw new Error(
        result.error || "Non è stato possibile recuperare il codice PoB dal link."
      );
    }

    const parsedBuild = importPobCode(result.pobCode);

    setPobCode(result.pobCode);
    setImportedData(parsedBuild);

    if (!title.trim()) {
      setTitle(getImportedBuildTitle(parsedBuild));
    }

    if (!characterClass.trim() && parsedBuild.character.className) {
      setCharacterClass(parsedBuild.character.className);
    }

    if (!ascendancy.trim() && parsedBuild.character.ascendancy) {
      setAscendancy(parsedBuild.character.ascendancy);
    }

    setPobAnalysisMessage(
      "Link PoB analizzato. I dati estratti saranno salvati insieme alla build."
    );
  } catch (error) {
    console.error("Errore analisi link PoB:", error);

    setImportedData(null);

    setErrorMessage(
      error instanceof Error
        ? error.message
        : "Non è stato possibile analizzare il link Path of Building."
    );
  } finally {
    setIsResolvingPobLink(false);
  }
}
  function analyzePobCode() {
    setErrorMessage("");
    setPobAnalysisMessage("");

    if (!pobCode.trim()) {
      setErrorMessage(
        "Incolla un codice Path of Building prima di avviare l’analisi."
      );
      return;
    }

    setIsAnalyzingPob(true);

    try {
      const parsedBuild = importPobCode(pobCode);

      setImportedData(parsedBuild);

      if (!characterClass.trim() && parsedBuild.character.className) {
  setCharacterClass(parsedBuild.character.className);
}
if (!ascendancy.trim() && parsedBuild.character.ascendancy) {
  setAscendancy(parsedBuild.character.ascendancy);
}

      if (!title.trim()) {
        const automaticTitle = getImportedBuildTitle(parsedBuild);

        if (automaticTitle) {
          setTitle(automaticTitle);
        }
      }

      setPobAnalysisMessage(
        "Codice PoB analizzato. I dati estratti saranno salvati insieme alla build."
      );
    } catch (error) {
      console.error("Errore analisi codice PoB:", error);
      setImportedData(null);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Non è stato possibile analizzare il codice Path of Building."
      );
    } finally {
      setIsAnalyzingPob(false);
    }
  }

  async function handlePoe2BuildFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile = event.target.files?.[0];

    setErrorMessage("");
    setPoe2BuildJson("");
    setPoe2BuildFileName("");
    setPoe2BuildPreview(null);

    if (!selectedFile) {
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".build")) {
      setErrorMessage(
        "Seleziona un file con estensione .build compatibile con il Build Planner di Path of Exile 2."
      );
      event.target.value = "";
      return;
    }

    try {
      const rawJson = await selectedFile.text();
      const parsedJson: unknown = JSON.parse(rawJson);

      if (
        !parsedJson ||
        typeof parsedJson !== "object" ||
        Array.isArray(parsedJson)
      ) {
        throw new Error("Formato JSON non valido");
      }

      const preview = getPoe2BuildPreview(
        parsedJson as Record<string, unknown>,
        selectedFile.name
      );

      setPoe2BuildJson(rawJson);
      setPoe2BuildFileName(selectedFile.name);
      setPoe2BuildPreview(preview);

      if (!title.trim() && preview.name) {
        setTitle(preview.name);
      }

      if (!characterClass.trim() && preview.characterClass) {
        setCharacterClass(preview.characterClass);
      }

      if (!externalAuthor.trim() && preview.author) {
        setExternalAuthor(preview.author);
      }
    } catch (error) {
      console.error("Errore lettura file .build:", error);
      setErrorMessage(
        "Non è stato possibile leggere il file .build. Verifica che contenga JSON valido."
      );
      event.target.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const cleanTitle = title.trim();
    const cleanClass = characterClass.trim();
    const cleanAscendancy = ascendancy.trim();
    const cleanPatch = patch.trim();
    const cleanNotes = notes.trim();
    const cleanPobUrl = pobUrl.trim();
    const cleanPobCode = pobCode.trim();
    const cleanSourceUrl = sourceUrl.trim();
    const cleanExternalAuthor = externalAuthor.trim();

    if (!cleanTitle || !cleanClass || !cleanPatch) {
      setErrorMessage(
        "Inserisci almeno un nome per la build, una classe/archetipo e la patch o stagione."
      );
      return;
    }

if (sourceType === "pob-link" && !cleanPobUrl) {
  setErrorMessage(
    "Inserisci il link di Path of Building prima di salvare la build."
  );
  return;
}

if (sourceType === "pob-link" && !importedData) {
  setErrorMessage(
    "Analizza il link Path of Building prima di salvare, così ARPG Tavern può conservare passivi, gemme e oggetti."
  );
  return;
}

    if (sourceType === "pob-code" && !cleanPobCode) {
      setErrorMessage(
        "Incolla il codice di Path of Building prima di salvare la build."
      );
      return;
    }

    if (sourceType === "pob-code" && !importedData) {
      setErrorMessage(
        "Analizza il codice Path of Building prima di salvare, così ARPG Tavern può conservare passivi, gemme e oggetti."
      );
      return;
    }

    if (sourceType === "poe2-build-file" && !poe2BuildJson) {
      setErrorMessage(
        "Carica un file .build JSON valido di Path of Exile 2 prima di salvare."
      );
      return;
    }

    setIsSaving(true);

    try {
      await addDoc(collection(db, "users", userId, "builds"), {
        title: cleanTitle,
        game,
        characterClass: cleanClass,
...(cleanAscendancy ? { ascendancy: cleanAscendancy } : {}),
patch: cleanPatch,
        category,
        visibility,
        notes: cleanNotes,

        sourceType,

        ...(cleanSourceUrl ? { sourceUrl: cleanSourceUrl } : {}),
        ...(cleanExternalAuthor
          ? { externalAuthor: cleanExternalAuthor }
          : {}),

        ...(sourceType === "pob-link"
  ? {
      pobUrl: cleanPobUrl,
      ...(importedData ? { importedData } : {}),
    }
  : {}),
        ...(sourceType === "pob-code"
          ? {
              pobCode: cleanPobCode,
              importedData,
            }
          : {}),

        ...(sourceType === "poe2-build-file"
          ? {
              poe2BuildJson,
              poe2BuildFileName,
            }
          : {}),

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Errore salvataggio build:", error);
      setErrorMessage(
        "Non è stato possibile salvare la build. Controlla le regole Firestore e riprova."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="build-form" onSubmit={handleSubmit}>
      <div className="build-form-heading">
        <p className="eyebrow">Nuova pagina del grimorio</p>
        <h1>Crea una build</h1>
        <p>
          Scegli Path of Exile o Path of Exile 2, quindi crea una build manuale
          o importa un codice di Path of Building.
        </p>
      </div>

      <div className="form-grid">
        <label className="form-field form-field-wide">
          <span>Nome della build</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Es. Stormweaver Frostbolt — League Starter"
            maxLength={90}
            required
          />
        </label>

        <label className="form-field">
          <span>Gioco</span>
          <select value={game} onChange={handleGameChange}>
            {arpgGames.map((gameName) => (
              <option key={gameName} value={gameName}>
                {gameName}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
  <span>Classe</span>
  <input
    value={characterClass}
    onChange={(event) => setCharacterClass(event.target.value)}
    placeholder={
      isPoe2
        ? "Es. Sorceress, Warrior, Mercenary..."
        : "Es. Duelist, Ranger, Witch..."
    }
    maxLength={70}
    required
  />
</label>

<label className="form-field">
  <span>Ascendancy</span>
  <input
    value={ascendancy}
    onChange={(event) => setAscendancy(event.target.value)}
    placeholder={
      isPoe2
        ? "Es. Stormweaver, Witchhunter..."
        : "Es. Slayer, Deadeye, Occultist..."
    }
    maxLength={70}
  />
</label>

        <label className="form-field">
          <span>Patch / stagione</span>
          <input
            value={patch}
            onChange={(event) => setPatch(event.target.value)}
            placeholder={isPoe2 ? "Es. 0.3" : "Es. 3.27"}
            maxLength={50}
            required
          />
        </label>

        <label className="form-field">
          <span>Tipo di build</span>
          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as BuildCategory)
            }
          >
            {buildCategories.map((categoryName) => (
              <option key={categoryName} value={categoryName}>
                {categoryName}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>Visibilità</span>
          <select
            value={visibility}
            onChange={(event) =>
              setVisibility(event.target.value as BuildVisibility)
            }
          >
            <option value="private">Privata — solo io</option>
            <option value="unlisted">
              Non in elenco — condivisibile più avanti
            </option>
          </select>
        </label>

        <label className="form-field form-field-wide">
          <span>Come vuoi importare la build?</span>

          <select value={sourceType} onChange={handleSourceTypeChange}>
            <option value="manual">Compila manualmente</option>

<option value="pob-link">
  {game === "Path of Exile 2"
    ? "Salva un link di Path of Building 2 (senza analisi)"
    : "Salva un link di Path of Building (senza analisi)"}
</option>

            <option value="pob-code">
              {isPoe2
                ? "Incolla un codice di Path of Building 2"
                : "Incolla un codice di Path of Building"}
            </option>

            {isPoe2 && (
              <option value="poe2-build-file">
                Carica un file .build di Path of Exile 2
              </option>
            )}
          </select>

          <small>
            {sourceType === "manual" &&
              "Inserisci i dati essenziali direttamente nel grimorio."}

{sourceType === "pob-link" &&
  "Il link viene conservato nella build e può essere aperto in una nuova scheda. Per estrarre automaticamente passivi, gemme e oggetti, scegli “Codice Path of Building” e incolla il codice di condivisione esportato da PoB."}

            {sourceType === "pob-code" &&
              "Incolla il codice esportato da PoB e analizzalo per estrarre passivi, skill, gemme e oggetti."}

            {sourceType === "poe2-build-file" &&
              "Il file .build viene letto nel browser, validato come JSON e conservato nella build."}
          </small>
        </label>

{sourceType === "pob-link" && (
  <label className="form-field form-field-wide">
    <span>
      {isPoe2
        ? "Link Path of Building 2"
        : "Link Path of Building"}
    </span>

    <input
      type="url"
      value={pobUrl}
      onChange={(event) => {
        setPobUrl(event.target.value);
        resetPobAnalysis();
      }}
      placeholder="Es. https://pobb.in/..."
      maxLength={1000}
      required
    />

    <div className="pob-analysis-actions">
      <button
        className="button button-wood"
        type="button"
        onClick={analyzePobLink}
        disabled={isResolvingPobLink || !pobUrl.trim()}
      >
        {isResolvingPobLink
          ? "Recupero build dal link..."
          : "Analizza link PoB"}
      </button>
    </div>

    {pobAnalysisMessage && (
      <p className="pob-analysis-success">{pobAnalysisMessage}</p>
    )}

    {importedData && (
      <section className="pob-analysis-preview">
        <div className="pob-analysis-preview-heading">
          <div>
            <p className="eyebrow">Build rilevata</p>
            <h2>{getImportedBuildTitle(importedData)}</h2>
          </div>
        </div>

        <div className="pob-analysis-stats">
          <span>{importedData.summary.passiveCount} passivi</span>
          <span>{importedData.summary.skillGroupCount} gruppi skill</span>
          <span>{importedData.summary.itemCount} oggetti</span>
        </div>
      </section>
    )}
  </label>
)}

        {sourceType === "pob-code" && (
          <div className="form-field form-field-wide">
            <span>
              {isPoe2
                ? "Codice Path of Building 2"
                : "Codice Path of Building"}
            </span>

            <textarea
              value={pobCode}
              onChange={handlePobCodeChange}
              placeholder="Incolla qui il codice di condivisione esportato da Path of Building..."
              maxLength={2_000_000}
              rows={8}
              required
            />

            <div className="pob-analysis-actions">
              <button
                className="button button-wood"
                type="button"
                onClick={analyzePobCode}
                disabled={isAnalyzingPob || !pobCode.trim()}
              >
                <span className="button-rune" aria-hidden="true">
                  ✦
                </span>

                {isAnalyzingPob
                  ? "Analisi del grimorio..."
                  : "Analizza codice PoB"}
              </button>
            </div>

            {pobAnalysisMessage && (
              <p className="pob-analysis-success">{pobAnalysisMessage}</p>
            )}

            {importedData && (
              <section className="pob-analysis-preview">
                <div className="pob-analysis-preview-heading">
                  <span aria-hidden="true">✦</span>

                  <div>
                    <p>Codice decifrato</p>
                    <h2>Anteprima della build</h2>
                  </div>
                </div>

                <div className="pob-analysis-stats">
                  <article>
                    <span>Classe</span>
                    <strong>
                      {importedData.character.className || "Non rilevata"}
                    </strong>
                  </article>

                  <article>
                    <span>Ascendancy</span>
                    <strong>
                      {importedData.character.ascendancy || "Non rilevata"}
                    </strong>
                  </article>

                  <article>
                    <span>Livello</span>
                    <strong>
                      {importedData.character.level
                        ? `Livello ${importedData.character.level}`
                        : "Non rilevato"}
                    </strong>
                  </article>

                  <article>
                    <span>Passivi</span>
                    <strong>
                      {importedData.summary.passiveCount} nodi allocati
                    </strong>
                  </article>

                  <article>
                    <span>Skill e gemme</span>
                    <strong>
                      {importedData.summary.skillGroupCount} gruppi ·{" "}
                      {importedData.summary.gemCount} gemme
                    </strong>
                  </article>

                  <article>
                    <span>Equipaggiamento</span>
                    <strong>{importedData.summary.itemCount} oggetti</strong>
                  </article>
                </div>

                {importedData.summary.mainSkillName && (
                  <p className="pob-analysis-main-skill">
                    Skill principale rilevata:{" "}
                    <strong>{importedData.summary.mainSkillName}</strong>
                  </p>
                )}
              </section>
            )}
          </div>
        )}

        {isPoe2BuildFile && (
          <div className="form-field form-field-wide">
            <span>File .build Path of Exile 2</span>

            <input
              type="file"
              accept=".build,application/json"
              onChange={handlePoe2BuildFileChange}
            />

            <small>
              Il file viene letto localmente nel browser e salvato come JSON
              originale, senza conversioni automatiche.
            </small>

            {poe2BuildPreview && (
              <div className="build-import-preview">
                <p>
                  <strong>File:</strong> {poe2BuildPreview.fileName}
                </p>

                {poe2BuildPreview.name && (
                  <p>
                    <strong>Nome rilevato:</strong> {poe2BuildPreview.name}
                  </p>
                )}

                {poe2BuildPreview.author && (
                  <p>
                    <strong>Autore rilevato:</strong>{" "}
                    {poe2BuildPreview.author}
                  </p>
                )}

                {poe2BuildPreview.characterClass && (
                  <p>
                    <strong>Classe rilevata:</strong>{" "}
                    {poe2BuildPreview.characterClass}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {sourceType !== "manual" && (
          <>
            <label className="form-field">
              <span>Autore esterno</span>
              <input
                value={externalAuthor}
                onChange={(event) => setExternalAuthor(event.target.value)}
                placeholder="Es. Nome del creatore"
                maxLength={100}
              />
            </label>

            <label className="form-field">
              <span>Pagina guida originale</span>
              <input
                type="url"
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                placeholder="Es. https://..."
                maxLength={1000}
              />
            </label>
          </>
        )}

        <label className="form-field form-field-wide">
          <span>Note iniziali</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Obiettivo, stile di gioco, budget, idee, dubbi e priorità..."
            maxLength={1500}
            rows={7}
          />
        </label>
      </div>

      {errorMessage && <p className="form-error">{errorMessage}</p>}

      <div className="form-actions">
        <button
          className="button button-wood"
          type="button"
          onClick={() => router.push("/dashboard")}
          disabled={isSaving}
        >
          Annulla
        </button>
        <CoinFountain>
  <button
    type="submit"
    className="button button-gold"
    disabled={isSaving}
  >
    {isSaving ? "Il grimorio si sta chiudendo..." : "Salva la build"}
  </button>
</CoinFountain>
      </div>
    </form>
  );
}