"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { FormEvent, useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import {
  getBuildSourceLabel,
  getBuildSourceUrl,
} from "@/lib/builds/source-label";

type VariantRecord = {
  id: string;
  title: string;
  patch: string;
  category: string;
  notes: string;
  sourceUrl: string;
};

type BuildVariantsPanelProps = {
  userId: string;
  buildId: string;
  buildTitle: string;
  buildPatch: string;
  buildCategory: string;
  buildNotes: string;
};

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

export function BuildVariantsPanel({
  userId,
  buildId,
  buildTitle,
  buildPatch,
  buildCategory,
  buildNotes,
}: BuildVariantsPanelProps) {
  const [variants, setVariants] = useState<VariantRecord[]>([]);
  const [title, setTitle] = useState("");
  const [patch, setPatch] = useState(buildPatch);
  const [category, setCategory] = useState(buildCategory || "Generale");
  const [notes, setNotes] = useState(buildNotes);
  const [sourceUrl, setSourceUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setPatch(buildPatch);
    setCategory(buildCategory || "Generale");
    setNotes(buildNotes);
  }, [buildPatch, buildCategory, buildNotes]);

  useEffect(() => {
    const variantsQuery = query(
      collection(db, "users", userId, "builds", buildId, "variants"),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      variantsQuery,
      (snapshot) => {
        setVariants(
          snapshot.docs.map((variantDocument) => {
            const data = variantDocument.data();

            return {
              id: variantDocument.id,
              title: String(data.title || "Variante senza nome"),
              patch: String(data.patch || ""),
              category: String(data.category || "Generale"),
              notes: String(data.notes || ""),
              sourceUrl: String(data.sourceUrl || data.buildLink || ""),
            };
          }),
        );
      },
      (snapshotError) => {
        console.error("Errore lettura varianti:", snapshotError);
        setError("Non è stato possibile leggere le varianti.");
      },
    );

    return () => unsubscribe();
  }, [buildId, userId]);

  async function createVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setError("Inserisci un nome per la variante.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await addDoc(
        collection(db, "users", userId, "builds", buildId, "variants"),
        {
          title: cleanTitle,
          patch: patch.trim(),
          category,
          notes: notes.trim(),
          ...(sourceUrl.trim()
            ? {
                sourceUrl: sourceUrl.trim(),
                buildLink: sourceUrl.trim(),
              }
            : {}),
          sourceBuildTitle: buildTitle,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      );

      setTitle("");
      setPatch(buildPatch);
      setCategory(buildCategory || "Generale");
      setNotes(buildNotes);
      setSourceUrl("");
    } catch (saveError) {
      console.error("Errore creazione variante:", saveError);
      setError("Non è stato possibile salvare la variante.");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeVariant(variant: VariantRecord) {
    const confirmed = window.confirm(
      `Eliminare definitivamente la variante "${variant.title}"?`,
    );

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      await deleteDoc(
        doc(db, "users", userId, "builds", buildId, "variants", variant.id),
      );
    } catch (deleteError) {
      console.error("Errore eliminazione variante:", deleteError);
      setError("Non è stato possibile eliminare la variante.");
    }
  }

  return (
    <details className="library-build-variants">
      <summary className="library-build-variants-heading">
        <div>
          <p className="eyebrow">Rami del grimorio</p>
          <h2>Varianti della build</h2>
          <p>
            Salva una versione dedicata a mapping, bossing, SSF, hardcore o un
            budget specifico.
          </p>
        </div>

        <span className="library-build-variants-count">
          {variants.length}{" "}
          {variants.length === 1 ? "variante" : "varianti"}
        </span>
      </summary>

      <form className="library-variant-form" onSubmit={createVariant}>
        <label>
          Nome variante
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={`${buildTitle || "Build"} — Bossing`}
            required
          />
        </label>

        <div className="library-variant-form-grid">
          <label>
            Categoria
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {categories.map((variantCategory) => (
                <option key={variantCategory} value={variantCategory}>
                  {variantCategory}
                </option>
              ))}
            </select>
          </label>

          <label>
            Patch / stagione
            <input
              value={patch}
              onChange={(event) => setPatch(event.target.value)}
              placeholder="Es. 0.3 / Season 10"
            />
          </label>
        </div>

        <label>
          Note variante
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Cosa cambia rispetto alla build principale?"
            rows={4}
          />
        </label>

        <label>
          Link variante
          <input
            type="url"
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            placeholder="Es. https://pobb.in/... o https://..."
          />
        </label>

        {error && <p className="library-variant-error">{error}</p>}

        <div className="library-variant-form-actions">
          <button className="button button-gold" type="submit" disabled={isSaving}>
            {isSaving ? "Salvataggio..." : "Crea variante"}
          </button>
        </div>
      </form>

      <div className="library-variant-list">
        {variants.length === 0 ? (
          <p className="library-variant-empty">
            Nessuna variante salvata: la build principale resta la tua base.
          </p>
        ) : (
          variants.map((variant) => (
            <article className="library-variant-item" key={variant.id}>
              <div>
                <span className="library-variant-rune" aria-hidden="true">
                  ◈
                </span>
                <div>
                  <h3>{variant.title}</h3>
                  <p>
                    {[variant.category, variant.patch]
                      .filter(Boolean)
                      .join(" · ") || "Dettagli non indicati"}
                  </p>
                  {variant.notes && <small>{variant.notes}</small>}

                  {getBuildSourceLabel(getBuildSourceUrl(variant)) && (
                    <span className="library-variant-source">
                      {getBuildSourceLabel(getBuildSourceUrl(variant))?.label}
                    </span>
                  )}
                </div>
              </div>

              <div className="library-variant-actions">
                {getBuildSourceUrl(variant) && (
                  <a
                    className="library-variant-open"
                    href={getBuildSourceUrl(variant)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Apri variante ↗
                  </a>
                )}

                <button
                  className="library-variant-delete"
                  type="button"
                  onClick={() => void removeVariant(variant)}
                >
                  Elimina
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </details>
  );
}
