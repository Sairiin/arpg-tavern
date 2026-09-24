"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collectionGroup, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import "../dashboard/dashboard.css";
import "./community.css";

type CommunityBuild = {
  id: string;
  title: string;
  game: string;
  characterClass: string;
  patch: string;
  category: string;
  updatedAt?: { seconds?: number } | null;
};

const gameLabels: Record<string, string> = {
  poe1: "Path of Exile 1",
  poe2: "Path of Exile 2",
  "diablo-2": "Diablo II",
  "diablo-4": "Diablo IV",
  "last-epoch": "Last Epoch",
  "grim-dawn": "Grim Dawn",
};

function formatDate(timestamp?: { seconds?: number } | null) {
  if (!timestamp?.seconds) return "Data non disponibile";
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" }).format(
    new Date(timestamp.seconds * 1000),
  );
}

export default function CommunityBuildsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [builds, setBuilds] = useState<CommunityBuild[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [gameFilter, setGameFilter] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsCheckingAuth(false);
      if (!currentUser) router.replace("/login");
    });
  }, [router]);

  useEffect(() => {
    if (!user) return;
    setError("");
    const buildsQuery = query(
      collectionGroup(db, "builds"),
      where("visibility", "==", "public"),
    );
    return onSnapshot(
      buildsQuery,
      (snapshot) => {
        setBuilds(
          snapshot.docs.map((document) => {
            const data = document.data();
            return {
              id: document.id,
              title: String(data.title || "Build senza nome"),
              game: String(data.game || ""),
              characterClass: String(data.characterClass || "Classe non indicata"),
              patch: String(data.patch || "Patch non indicata"),
              category: String(data.category || "Generale"),
              updatedAt: data.updatedAt as CommunityBuild["updatedAt"],
            };
          }),
        );
      },
      (snapshotError) => {
        console.error("Errore catalogo Community Builds:", snapshotError);
        setError("Non è stato possibile caricare le build pubbliche.");
      },
    );
  }, [user]);

  const games = useMemo(
    () => Array.from(new Set(builds.map((build) => build.game).filter(Boolean))).sort(),
    [builds],
  );

  const filteredBuilds = useMemo(() => {
    const normalized = searchTerm.trim().toLocaleLowerCase("it");
    return [...builds]
      .filter((build) => !gameFilter || build.game === gameFilter)
      .filter((build) => {
        if (!normalized) return true;
        return [build.title, build.game, build.characterClass, build.patch, build.category]
          .join(" ")
          .toLocaleLowerCase("it")
          .includes(normalized);
      })
      .sort((first, second) =>
        (second.updatedAt?.seconds ?? 0) - (first.updatedAt?.seconds ?? 0),
      );
  }, [builds, gameFilter, searchTerm]);

  if (isCheckingAuth) {
    return <main className="dashboard-page community-page"><p>Il locandiere sta aprendo il catalogo...</p></main>;
  }

  return (
    <main className="dashboard-page community-page">
      <header className="community-header">
        <div>
          <p className="eyebrow">Archivio condiviso</p>
          <h1>Community Builds</h1>
          <p>Esplora le build pubblicate dalla community. Importazione non ancora disponibile.</p>
        </div>
        <Link className="button button-secondary" href="/dashboard">Torna al dashboard</Link>
      </header>
      <section className="community-toolbar" aria-label="Filtri build pubbliche">
        <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Cerca build..." />
        <select value={gameFilter} onChange={(event) => setGameFilter(event.target.value)}>
          <option value="">Tutti i giochi</option>
          {games.map((game) => <option key={game} value={game}>{gameLabels[game] || game}</option>)}
        </select>
      </section>
      {error && <p className="community-error">{error}</p>}
      {!error && filteredBuilds.length === 0 && <p className="community-empty">Nessuna build pubblica trovata.</p>}
      <section className="community-grid" aria-label="Build pubbliche">
        {filteredBuilds.map((build) => (
          <article className="community-card" key={`${build.game}-${build.id}`}>
            <p className="eyebrow">{gameLabels[build.game] || build.game || "Gioco non indicato"}</p>
            <h2>{build.title}</h2>
            <div className="community-meta">
              <span>{build.characterClass}</span>
              <span>{build.patch}</span>
              <span>{build.category}</span>
            </div>
            <footer><span>Pubblicata · {formatDate(build.updatedAt)}</span></footer>
          </article>
        ))}
      </section>
    </main>
  );
}
