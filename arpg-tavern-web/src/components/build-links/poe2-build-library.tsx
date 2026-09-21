"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  loadSavedBuildLinks,
  saveBuildLinks,
} from "@/lib/build-links/storage";
import {
  POE2_CLASSES,
  type BuildLinkFormValues,
  type Poe2Class,
  type SavedBuildLink,
} from "@/lib/build-links/types";

const EMPTY_FORM: BuildLinkFormValues = {
  title: "",
  url: "",
  characterClass: "Other",
  league: "",
  notes: "",
};

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `build-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function Poe2BuildLibrary() {
  const [builds, setBuilds] = useState<SavedBuildLink[]>(() =>
    loadSavedBuildLinks(),
  );
  const [form, setForm] = useState<BuildLinkFormValues>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState("all");
  const [leagueFilter, setLeagueFilter] = useState("all");
  const [error, setError] = useState("");

  const leagues = useMemo(
    () =>
      [...new Set(builds.map((build) => build.league.trim()).filter(Boolean))]
        .sort((left, right) => left.localeCompare(right)),
    [builds],
  );

  const filteredBuilds = useMemo(
    () =>
      builds.filter((build) => {
        const matchesClass =
          classFilter === "all" || build.characterClass === classFilter;
        const matchesLeague =
          leagueFilter === "all" || build.league === leagueFilter;

        return matchesClass && matchesLeague;
      }),
    [builds, classFilter, leagueFilter],
  );

  function updateBuilds(nextBuilds: SavedBuildLink[]) {
    const sorted = [...nextBuilds].sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    );

    setBuilds(sorted);
    saveBuildLinks(sorted);
  }

  function updateForm<K extends keyof BuildLinkFormValues>(
    key: K,
    value: BuildLinkFormValues[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const title = form.title.trim();
    const url = form.url.trim();
    const league = form.league.trim();
    const notes = form.notes.trim();

    if (!title || !url) {
      setError("Titolo e link sono obbligatori.");
      return;
    }

    try {
      const parsedUrl = new URL(url);

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error();
      }
    } catch {
      setError("Inserisci un link valido che inizi con http:// o https://.");
      return;
    }

    const now = new Date().toISOString();

    if (editingId) {
      updateBuilds(
        builds.map((build) =>
          build.id === editingId
            ? {
                ...build,
                title,
                url,
                characterClass: form.characterClass,
                league,
                notes,
                updatedAt: now,
              }
            : build,
        ),
      );
    } else {
      updateBuilds([
        {
          id: createId(),
          game: "poe2",
          title,
          url,
          characterClass: form.characterClass,
          league,
          notes,
          createdAt: now,
          updatedAt: now,
        },
        ...builds,
      ]);
    }

    resetForm();
  }

  function startEditing(build: SavedBuildLink) {
    setEditingId(build.id);
    setForm({
      title: build.title,
      url: build.url,
      characterClass: build.characterClass,
      league: build.league,
      notes: build.notes,
    });
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteBuild(build: SavedBuildLink) {
    const confirmed = window.confirm(
      `Eliminare definitivamente la build "${build.title}"?`,
    );

    if (!confirmed) return;

    updateBuilds(builds.filter((candidate) => candidate.id !== build.id));

    if (editingId === build.id) {
      resetForm();
    }
  }

  return (
    <div className="build-library">
      <section className="build-library__intro">
        <p className="build-library__eyebrow">Archivio personale</p>
        <h1>Build di Path of Exile 2</h1>
        <p>
          Salva i link delle build che vuoi ricordare. I dati restano nel tuo
          browser e la build conserva la propria lega anche quando la stagione
          cambia.
        </p>
      </section>

      <section className="build-library__form-card" aria-labelledby="build-form-title">
        <div className="build-library__section-heading">
          <div>
            <p className="build-library__eyebrow">
              {editingId ? "Modifica build" : "Nuova build"}
            </p>
            <h2 id="build-form-title">
              {editingId ? "Aggiorna il collegamento" : "Aggiungi un link"}
            </h2>
          </div>

          {editingId ? (
            <button
              className="build-library__button build-library__button--muted"
              type="button"
              onClick={resetForm}
            >
              Annulla modifica
            </button>
          ) : null}
        </div>

        <form className="build-library__form" onSubmit={handleSubmit}>
          <label>
            <span>Titolo *</span>
            <input
              value={form.title}
              onChange={(event) => updateForm("title", event.target.value)}
              placeholder="Es. Spark Totem Shaman"
              maxLength={120}
              required
            />
          </label>

          <label>
            <span>Link della build *</span>
            <input
              value={form.url}
              onChange={(event) => updateForm("url", event.target.value)}
              placeholder="https://pobarchives.com/build/..."
              inputMode="url"
              required
            />
          </label>

          <label>
            <span>Classe *</span>
            <select
              value={form.characterClass}
              onChange={(event) =>
                updateForm("characterClass", event.target.value as Poe2Class)
              }
            >
              {POE2_CLASSES.map((characterClass) => (
                <option key={characterClass} value={characterClass}>
                  {characterClass}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Lega / stagione</span>
            <input
              value={form.league}
              onChange={(event) => updateForm("league", event.target.value)}
              placeholder="Es. Return of the Ancients"
              maxLength={100}
            />
          </label>

          <label className="build-library__notes-field">
            <span>Note personali</span>
            <textarea
              value={form.notes}
              onChange={(event) => updateForm("notes", event.target.value)}
              placeholder="Cosa vuoi ricordare di questa build?"
              rows={4}
              maxLength={1000}
            />
          </label>

          {error ? <p className="build-library__error">{error}</p> : null}

          <button className="build-library__button" type="submit">
            {editingId ? "Salva modifiche" : "Salva build"}
          </button>
        </form>
      </section>

      <section className="build-library__collection" aria-labelledby="saved-builds-title">
        <div className="build-library__section-heading">
          <div>
            <p className="build-library__eyebrow">Collezione</p>
            <h2 id="saved-builds-title">
              {builds.length} {builds.length === 1 ? "build salvata" : "build salvate"}
            </h2>
          </div>

          <div className="build-library__filters">
            <label>
              <span>Classe</span>
              <select
                value={classFilter}
                onChange={(event) => setClassFilter(event.target.value)}
              >
                <option value="all">Tutte le classi</option>
                {POE2_CLASSES.map((characterClass) => (
                  <option key={characterClass} value={characterClass}>
                    {characterClass}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Lega</span>
              <select
                value={leagueFilter}
                onChange={(event) => setLeagueFilter(event.target.value)}
              >
                <option value="all">Tutte le leghe</option>
                {leagues.map((league) => (
                  <option key={league} value={league}>
                    {league}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {filteredBuilds.length > 0 ? (
          <div className="build-library__grid">
            {filteredBuilds.map((build) => (
              <article className="build-card" key={build.id}>
                <div className="build-card__meta">
                  <span>POE 2</span>
                  <span>{build.characterClass}</span>
                </div>

                <h3>{build.title}</h3>

                <p className="build-card__league">
                  {build.league || "Stagione non indicata"}
                </p>

                {build.notes ? (
                  <p className="build-card__notes">{build.notes}</p>
                ) : null}

                <p className="build-card__date">
                  Salvata il {formatDate(build.createdAt)}
                </p>

                <div className="build-card__actions">
                  <a
                    className="build-library__button"
                    href={build.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Apri build
                  </a>
                  <button
                    className="build-library__button build-library__button--muted"
                    type="button"
                    onClick={() => startEditing(build)}
                  >
                    Modifica
                  </button>
                  <button
                    className="build-library__button build-library__button--danger"
                    type="button"
                    onClick={() => deleteBuild(build)}
                  >
                    Elimina
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="build-library__empty">
            <h3>Nessuna build trovata</h3>
            <p>
              Salva il primo link oppure modifica i filtri per vedere la tua
              collezione.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
