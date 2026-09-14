"use client";

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { db } from "@/lib/firebase/client";
import {
  arpgGames,
  buildCategories,
  type ArpgGame,
  type BuildCategory,
  type BuildVisibility
} from "@/lib/builds/types";

type BuildFormProps = {
  userId: string;
};

export function BuildForm({ userId }: BuildFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [game, setGame] = useState<ArpgGame>("Path of Exile 2");
  const [characterClass, setCharacterClass] = useState("");
  const [patch, setPatch] = useState("");
  const [category, setCategory] = useState<BuildCategory>("League starter");
  const [visibility, setVisibility] = useState<BuildVisibility>("private");
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const cleanTitle = title.trim();
    const cleanClass = characterClass.trim();
    const cleanPatch = patch.trim();
    const cleanNotes = notes.trim();

    if (!cleanTitle || !cleanClass || !cleanPatch) {
      setErrorMessage(
        "Inserisci almeno un nome per la build, una classe/archetipo e la patch o stagione."
      );
      return;
    }

    setIsSaving(true);

    try {
      await addDoc(collection(db, "users", userId, "builds"), {
        title: cleanTitle,
        game,
        characterClass: cleanClass,
        patch: cleanPatch,
        category,
        visibility,
        notes: cleanNotes,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
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
          Inizia con le informazioni essenziali. Nelle prossime fasi potrai
          aggiungere skill, equipaggiamento, versioni e varianti.
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
          <select
            value={game}
            onChange={(event) => setGame(event.target.value as ArpgGame)}
          >
            {arpgGames.map((gameName) => (
              <option key={gameName} value={gameName}>
                {gameName}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>Classe o archetipo</span>
          <input
            value={characterClass}
            onChange={(event) => setCharacterClass(event.target.value)}
            placeholder="Es. Sorceress, Ranger, Sentinel..."
            maxLength={70}
            required
          />
        </label>

        <label className="form-field">
          <span>Patch / stagione</span>
          <input
            value={patch}
            onChange={(event) => setPatch(event.target.value)}
            placeholder="Es. 0.3 / Stagione 4"
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
        >
          Annulla
        </button>

        <button className="button button-gold" type="submit" disabled={isSaving}>
          <span className="button-rune" aria-hidden="true">
            ✦
          </span>
          {isSaving ? "Il grimorio si sta chiudendo..." : "Salva la build"}
        </button>
      </div>
    </form>
  );
}
