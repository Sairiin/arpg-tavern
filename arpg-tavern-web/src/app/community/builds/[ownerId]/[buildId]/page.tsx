"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/client";
import "../../../../dashboard/dashboard.css";
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
};

export default function CommunityBuildDetailPage() {
  const params = useParams<{ ownerId: string; buildId: string }>();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [build, setBuild] = useState<BuildData | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

      setMessage("Build importata nella tua libreria.");
    } catch (importError) {
      console.error(importError);
      setError("Non è stato possibile importare la build.");
    } finally {
      setImporting(false);
    }
  }

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
    <main className="dashboard-page community-page">
      <header className="community-header">
        <div>
          <p className="eyebrow">Build pubblica</p>
          <h1>{build.title || "Build senza nome"}</h1>
          <p>{build.game || "Gioco non indicato"}</p>
        </div>

        <Link className="button button-secondary" href="/community">
          ← Community Builds
        </Link>
      </header>

      <article className="community-card community-build-detail">
        <div className="community-meta">
          <span>{build.characterClass || "Classe non indicata"}</span>
          <span>{build.patch || "Patch non indicata"}</span>
          <span>{build.category || "Generale"}</span>
        </div>

        <section className="community-build-section">
          <p className="eyebrow">Appunti dell'avventuriero</p>
          <h2>Note e strategia</h2>
          <p>
            {build.notes || "Nessuna nota è stata aggiunta a questa build."}
          </p>
        </section>

        {build.sourceUrl && (
          <p>
            <a href={build.sourceUrl} target="_blank" rel="noreferrer">
              Apri fonte originale ↗
            </a>
          </p>
        )}

        {message && <p className="community-success">{message}</p>}
        {error && <p className="community-error">{error}</p>}

        <button
          className="button button-secondary"
          type="button"
          onClick={() => void importBuild()}
          disabled={importing}
        >
          {importing ? "Importazione..." : "Importa nella mia libreria"}
        </button>
      </article>
    </main>
  );
}
