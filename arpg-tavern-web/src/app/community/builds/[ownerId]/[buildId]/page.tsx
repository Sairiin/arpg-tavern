"use client";

import { LinkedBuildNotes } from "@/components/library/linked-build-notes";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, addDoc, collection, serverTimestamp, increment, updateDoc } from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/client";
import {
  getClassBackgroundImage,
  getClassCrestImage,
} from "@/lib/games/class-crests";
import "../../../../dashboard/dashboard.css";
import "../../../../library/[game]/[buildId]/build-detail.css";
import "../../../community.css";

type BuildData = {
  title?: string;
  game?: string;
  characterClass?: string;
  patch?: string;
  category?: string;
  notes?: string;
  visibility?: string;
  sourceUrl?: string;
  sourceType?: string;
  buildLink?: string;
  pobCode?: string;
  pobUrl?: string;
  createdAt?: { seconds?: number } | null;
  updatedAt?: { seconds?: number } | null;
  archived?: boolean;
};


function formatCommunityBuildDate(timestamp?: { seconds?: number } | null) {
  if (!timestamp?.seconds) return "Data non disponibile";

  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
  }).format(new Date(timestamp.seconds * 1000));
}

export default function CommunityBuildDetailPage() {
  const params = useParams<{ ownerId: string; buildId: string }>();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [build, setBuild] = useState<BuildData | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [voting, setVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [resolvedPlannerUrl, setResolvedPlannerUrl] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) router.replace("/login");
    });
  }, [router]);

  useEffect(() => {
    if (!params.ownerId || !params.buildId) return;

    async function loadBuild() {
      try {
        const reference = doc(
          db,
          "users",
          params.ownerId,
          "builds",
          params.buildId
        );
        const snapshot = await getDoc(reference);

        if (!snapshot.exists() || snapshot.data().visibility !== "public") {
          setError("Questa build non è disponibile pubblicamente.");
          return;
        }

        setBuild(snapshot.data() as BuildData);
      } catch (loadError) {
        console.error(loadError);
        setError("Non è stato possibile caricare la build.");
      } finally {
        setLoading(false);
      }
    }

    void loadBuild();
  }, [params.buildId, params.ownerId]);

  useEffect(() => {
    const pobCode = build?.pobCode?.trim() || "";
    const existingUrl =
      build?.pobUrl?.trim() ||
      build?.sourceUrl?.trim() ||
      build?.buildLink?.trim() ||
      "";

    if (!pobCode) {
      setResolvedPlannerUrl(existingUrl);
      return;
    }

    let cancelled = false;

    async function resolvePlanner() {
      try {
        const response = await fetch("/api/pob/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pobCode }),
        });
        const result = await response.json();

        if (!response.ok || !result.url) {
          throw new Error(result.error || "PoB non convertibile");
        }

        if (!cancelled) setResolvedPlannerUrl(result.url);
      } catch {
        if (!cancelled) setResolvedPlannerUrl(existingUrl);
      }
    }

    void resolvePlanner();

    return () => {
      cancelled = true;
    };
  }, [build]);

  useEffect(() => {
    if (!params.ownerId || !params.buildId) return;

    const viewKey = `community-build-view:${params.ownerId}:${params.buildId}`;
    if (sessionStorage.getItem(viewKey)) return;
    sessionStorage.setItem(viewKey, "1");

    const reference = doc(
      db,
      "users",
      params.ownerId,
      "builds",
      params.buildId,
    );

    void updateDoc(reference, { viewCount: increment(1) }).catch(() => {
      sessionStorage.removeItem(viewKey);
    });
  }, [params.buildId, params.ownerId]);

  async function importBuild() {
    if (!user || !build || importing) return;

    setImporting(true);
    setError("");
    setMessage("");

    try {
      await addDoc(collection(db, "users", user.uid, "builds"), {
        ...build,
        visibility: "private",
        importedFrom: {
          ownerId: params.ownerId,
          buildId: params.buildId,
          importedAt: serverTimestamp(),
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await updateDoc(
        doc(db, "users", params.ownerId, "builds", params.buildId),
        { importCount: increment(1) },
      ).catch(() => undefined);

      setMessage("Build importata nella tua libreria.");
    } catch (importError) {
      console.error(importError);
      setError("Non è stato possibile importare la build.");
    } finally {
      setImporting(false);
    }
  }

  async function voteForBuild() {
    if (!params.ownerId || !params.buildId || voting || hasVoted) return;

    setVoting(true);
    const voteKey = `community-build-vote:${params.ownerId}:${params.buildId}`;

    try {
      await updateDoc(
        doc(db, "users", params.ownerId, "builds", params.buildId),
        {
          voteScore: increment(1),
          voteCount: increment(1),
        },
      );
      sessionStorage.setItem(voteKey, "1");
      setHasVoted(true);
    } catch (voteError) {
      console.error("Errore voto Community:", voteError);
    } finally {
      setVoting(false);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined" || !params.ownerId || !params.buildId) {
      return;
    }

    setHasVoted(
      Boolean(
        sessionStorage.getItem(
          `community-build-vote:${params.ownerId}:${params.buildId}`,
        ),
      ),
    );
  }, [params.buildId, params.ownerId]);

  if (loading) {
    return (
      <main className="dashboard-page community-page">
        <p>Caricamento build...</p>
      </main>
    );
  }

  if (error || !build) {
    return (
      <main className="dashboard-page community-page">
        <Link className="button button-secondary" href="/community">
          ← Community Builds
        </Link>
        <p className="community-error">{error || "Build non trovata."}</p>
      </main>
    );
  }

  return (
    <main className="dashboard-page game-library-page">
      <header className="dashboard-topbar">
        <Link
          className="brand brand-build-detail"
          href="/community"
          aria-label="Torna alle build della Community"
        >
          <span className="brand-mark build-detail-class-mark" aria-hidden="true">
            <span className="build-detail-class-fallback">◈</span>
          </span>

          <span className="brand-text">
            <small>Archivio condiviso</small>
            {build.title || "Build senza nome"}
          </span>
        </Link>

        <Link className="library-back-link" href="/community">
          ← Torna alla Community
        </Link>
      </header>

      <section className="build-detail-page">
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
            {getClassCrestImage(build.game || "", build.characterClass || "") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="build-showcase-class-crest"
                src={
                  getClassCrestImage(
                    build.game || "",
                    build.characterClass || "",
                  ) ?? ""
                }
                alt={`Stemma ${build.characterClass || "build"}`}
              />
            ) : (
              <div className="build-showcase-orb" aria-hidden="true">
                <span>◈</span>
              </div>
            )}

            <div className="build-showcase-copy">
              <p className="eyebrow">{build.game || "Gioco non indicato"}</p>
              <h1>{build.title || "Build senza nome"}</h1>
              <p className="build-showcase-subtitle">
                {build.category || "Build pubblica della Community"}
              </p>

              {build.archived && (
                <p className="build-showcase-status">Build archiviata</p>
              )}
            </div>

            {build.sourceUrl && (
              <a
                className="button button-gold build-showcase-action"
                href={build.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                <span className="build-showcase-action-label">Apri build</span>
              </a>
            )}
          </header>

          <section className="build-showcase-toolbar" aria-label="Azioni build">
            <button
              className="button button-secondary"
              type="button"
              onClick={() => void voteForBuild()}
              disabled={voting || hasVoted}
            >
              {hasVoted ? "Voto registrato" : voting ? "Voto..." : "Vota questa build"}
            </button>
            <button
              className="button button-gold"
              type="button"
              onClick={() => void importBuild()}
              disabled={importing}
            >
              {importing ? "Importazione..." : "Importa nella mia libreria"}
            </button>
          </section>

          <section className="build-showcase-stats" aria-label="Dettagli build">
            <div className="build-showcase-stat">
              <span className="build-showcase-stat-icon" aria-hidden="true">⚔</span>
              <div>
                <small>Classe</small>
                <strong>{build.characterClass || "Non indicata"}</strong>
              </div>
            </div>

            <div className="build-showcase-stat">
              <span className="build-showcase-stat-icon" aria-hidden="true">◈</span>
              <div>
                <small>Categoria</small>
                <strong>{build.category || "Generale"}</strong>
              </div>
            </div>

            <div className="build-showcase-stat">
              <span className="build-showcase-stat-icon" aria-hidden="true">⌛</span>
              <div>
                <small>Patch / stagione</small>
                <strong>{build.patch || "Non indicata"}</strong>
              </div>
            </div>
          </section>

          <section className="build-showcase-dates" aria-label="Cronologia build">
            <span>
              <small>Creata</small>
              <strong>{formatCommunityBuildDate(build.createdAt)}</strong>
            </span>
            <span>
              <small>Ultima modifica</small>
              <strong>{formatCommunityBuildDate(build.updatedAt)}</strong>
            </span>
          </section>

          <section className="build-showcase-notes">
            <div className="build-showcase-section-heading">
              <span aria-hidden="true"><span className="site-guild-emblem" aria-hidden="true" /></span>
              <div>
                <p className="eyebrow">Appunti dell'avventuriero</p>
                <h2>Note e strategia</h2>
              </div>
            </div>
            <LinkedBuildNotes
              text={build.notes || "Nessuna nota è stata aggiunta a questa build."}
            />
          </section>

          {message && <p className="community-success">{message}</p>}
          {error && <p className="community-error">{error}</p>}

          <footer className="build-showcase-footer">
            <Link className="button button-secondary" href="/community">
              ← Torna alla Community
            </Link>

            {build.sourceUrl ? (
              <a
                className="build-showcase-text-link"
                href={build.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                Apri link esterno ↗
              </a>
            ) : (
              <span className="build-showcase-muted">
                Nessun link esterno associato
              </span>
            )}
          </footer>
        </article>

        {(() => {
          const plannerUrl =
            resolvedPlannerUrl ||
            build.pobUrl ||
            build.sourceUrl ||
            build.buildLink ||
            "";

          if (!/^https?:\/\/(www\.)?pobb\.in\//i.test(plannerUrl)) {
            return null;
          }

          return (
            <section className="planner-shell planner-shell-centered">
              <div className="planner-shell-heading">
                <span aria-hidden="true">⚔</span>
                <div>
                  <p className="eyebrow">Planner</p>
                  <h2>Pianificatore interattivo Path of Building</h2>
                </div>
              </div>

              <div className="planner-shell-frame">
                <iframe
                  src={plannerUrl}
                  title="PoB Planner"
                  scrolling="yes"
                  allowFullScreen
                />
              </div>
            </section>
          );
        })()}
      </section>
    </main>
  );
}
