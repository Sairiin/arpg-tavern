"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from "firebase/firestore";
import { FormEvent, useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import {
  buildCategories,
  type BuildCategory,
  type BuildVisibility
} from "@/lib/builds/types";

type VariantRecord = {
  id: string;
  title: string;
  patch: string;
  category: BuildCategory;
  visibility: BuildVisibility;
  notes: string;
  createdAt?: {
    seconds: number;
    nanoseconds: number;
  } | null;
};

type BuildVariantsProps = {
  userId: string;
  buildId: string;
  buildTitle: string;
  buildPatch: string;
  buildCategory: BuildCategory;
  buildVisibility: BuildVisibility;
  buildNotes: string;
};

export function BuildVariants({
  userId,
  buildId,
  buildTitle,
  buildPatch,
  buildCategory,
  buildVisibility,
  buildNotes
}: BuildVariantsProps) {
  const [variants, setVariants] = useState<VariantRecord[]>([]);
  const [title, setTitle] = useState("");
  const [patch, setPatch] = useState(buildPatch);
  const [category, setCategory] = useState<BuildCategory>(buildCategory);
  const [visibility, setVisibility] =
    useState<BuildVisibility>(buildVisibility);
  const [notes, setNotes] = useState(buildNotes);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setPatch(buildPatch);
    setCategory(buildCategory);
    setVisibility(buildVisibility);
    setNotes(buildNotes);
  }, [buildPatch, buildCategory, buildVisibility, buildNotes]);

  useEffect(() => {
    const variantsQuery = query(
      collection(db, "users", userId, "builds", buildId, "variants"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      variantsQuery,
      (snapshot) => {
        setVariants(
          snapshot.docs.map((variantDocument) => {
            const data = variantDocument.data();

            return {
              id: variantDocument.id,
              title: data.title || "Variante senza nome",
              patch: data.patch || "",
              category: data.category || "Theorycraft",
              visibility: data.visibility || "private",
              notes: data.notes || "",
              createdAt: data.createdAt || null
            };
          })
        );
      },
      (error) => {
        console.error("Errore lettura varianti:", error);
        setErrorMessage("Non è stato possibile leggere le varianti.");
      }
    );

    return () => unsubscribe();
  }, [buildId, userId]);

  async function createVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setErrorMessage("Inserisci un nome per la variante.");
      return;
    }

    setIsSaving(true);

    try {
      await addDoc(
        collection(db, "users", userId, "builds", buildId, "variants"),
        {
          title: cleanTitle,
          patch: patch.trim(),
          category,
          visibility,
          notes: notes.trim(),
          sourceBuildTitle: buildTitle,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      );

      setTitle("");
      setPatch(buildPatch);
      setCategory(buildCategory);
      setVisibility(buildVisibility);
      setNotes(buildNotes);
    } catch (error) {
      console.error("Errore creazione variante:", error);
      setErrorMessage("Non è stato possibile salvare la variante.");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeVariant(variant: VariantRecord) {
    const confirmed = window.confirm(
      `Vuoi eliminare definitivamente la variante "${variant.title}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteDoc(
        doc(db, "users", userId, "builds", buildId, "variants", variant.id)
      );
    } catch (error) {
      console.error("Errore eliminazione variante:", error);
      setErrorMessage("Non è stato possibile eliminare la variante.");
    }
  }

  return (
    <section className="variants-panel">
      <div className="variants-heading">
        <div>
          <p className="eyebrow">Rami del grimorio</p>
          <h2>Varianti della build</h2>
          <p>
            Crea una copia concettuale della build per un obiettivo preciso:
            mapping, bossing, SSF, hardcore o budget.
          </p>
        </div>

        <span className="variants-count">
          {variants.length} {variants.length === 1 ? "variante" : "varianti"}
        </span>
      </div>

      <form className="variant-form" onSubmit={createVariant}>
        <label className="detail-field detail-field-wide">
          <span>Nome della variante</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Es. Variante Bossing, Mapping veloce, SSF..."
            maxLength={90}
          />
        </label>

        <label className="detail-field">
          <span>Patch / stagione</span>
          <input
            value={patch}
            onChange={(event) => setPatch(event.target.value)}
            maxLength={50}
          />
        </label>

        <label className="detail-field">
          <span>Obiettivo</span>
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

        <label className="detail-field">
          <span>Visibilità</span>
          <select
            value={visibility}
            onChange={(event) =>
              setVisibility(event.target.value as BuildVisibility)
            }
          >
            <option value="private">Privata — solo io</option>
            <option value="unlisted">Non in elenco</option>
          </select>
        </label>

        <label className="detail-field">
          <span>Nota della variante</span>
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Es. più difese, setup da boss..."
            maxLength={250}
          />
        </label>

        <div className="variant-form-actions">
          <button type="submit" className="save-version-button" disabled={isSaving}>
            {isSaving ? "Creo la variante..." : "Crea variante"}
          </button>
        </div>
      </form>

      {errorMessage && <p className="variant-error">{errorMessage}</p>}

      <div className="variant-list">
        {variants.length === 0 ? (
          <p className="variant-empty">
            Non hai ancora creato varianti. La build principale rimane
            intatta: qui puoi sperimentare liberamente.
          </p>
        ) : (
          variants.map((variant) => (
            <article className="variant-item" key={variant.id}>
              <div className="variant-item-rune" aria-hidden="true">
                ✦
              </div>

              <div className="variant-item-content">
                <div>
                  <span>{variant.category}</span>
                  <span>
                    {variant.visibility === "private"
                      ? "Privata"
                      : "Non in elenco"}
                  </span>
                </div>

                <h3>{variant.title}</h3>
                <p>Patch/Stagione {variant.patch || "non specificata"}</p>

                {variant.notes && <small>{variant.notes}</small>}
              </div>

              <button
                type="button"
                className="delete-variant-button"
                onClick={() => removeVariant(variant)}
              >
                Elimina
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
