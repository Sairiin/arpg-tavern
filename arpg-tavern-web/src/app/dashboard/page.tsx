"use client";
import "./dashboard.css";

import Link from "next/link";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type QueryDocumentSnapshot
} from "firebase/firestore";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase/client";
import type { BuildRecord } from "@/lib/builds/types";

function mapBuild(document: QueryDocumentSnapshot): BuildRecord {
  const data = document.data();

  return {
    id: document.id,
    title: data.title,
    game: data.game,
    characterClass: data.characterClass,
    patch: data.patch,
    category: data.category,
    visibility: data.visibility,
    notes: data.notes || "",
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [builds, setBuilds] = useState<BuildRecord[]>([]);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoadingBuilds, setIsLoadingBuilds] = useState(false);
  const [buildError, setBuildError] = useState("");

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
    if (!user) {
      setBuilds([]);
      return;
    }

    setIsLoadingBuilds(true);
    setBuildError("");

    const buildsQuery = query(
      collection(db, "users", user.uid, "builds"),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      buildsQuery,
      (snapshot) => {
        setBuilds(snapshot.docs.map(mapBuild));
        setIsLoadingBuilds(false);
      },
      (error) => {
        console.error("Errore lettura build:", error);
        setBuildError(
          "Non è stato possibile leggere l'archivio. Verifica le regole Firestore."
        );
        setIsLoadingBuilds(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  async function handleSignOut() {
    await signOut(auth);
    router.push("/");
  }

  if (isCheckingAuth) {
    return (
      <main className="dashboard-page dashboard-loading">
        <p>Il locandiere sta cercando il tuo registro...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  const adventurerName = user.displayName || "Avventuriero";
  const initial = adventurerName.charAt(0).toUpperCase();

  return (
    <main className="dashboard-page">
      <header className="dashboard-topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">✦</span>

          <span className="brand-text">
            <small>La casa dei theorycrafter</small>
            ARPG Tavern
          </span>
        </Link>

        <div className="adventurer-menu">
          <span className="adventurer-avatar">
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />
            ) : (
              initial
            )}
          </span>

          <div>
            <small>Avventuriero</small>
            <strong>{adventurerName}</strong>
          </div>

          <button type="button" onClick={handleSignOut}>
            Esci
          </button>
        </div>
      </header>

      <section className="dashboard-hero dashboard-hero-compact">
        <div>
          <p className="eyebrow">Il tuo tavolo è pronto</p>
          <h1>
            Bentornato,
            <span>{adventurerName}.</span>
          </h1>
          <p>
            Il tuo grimorio è pronto: crea una build e inizieremo a custodire
            ogni versione della tua avventura.
          </p>
        </div>

        <Link
          className="button button-gold dashboard-create-button"
          href="/builds/new"
        >
          <span className="button-rune" aria-hidden="true">
            ✦
          </span>
          Nuova build
          <span className="button-arrow" aria-hidden="true">
            →
          </span>
        </Link>
      </section>

      <section className="dashboard-summary">
        <article>
          <span aria-hidden="true">⚔</span>
          <div>
            <small>Build nel grimorio</small>
            <strong>{builds.length}</strong>
          </div>
        </article>

        <article>
          <span aria-hidden="true">⌛</span>
          <div>
            <small>Ultima stagione</small>
            <strong>In preparazione</strong>
          </div>
        </article>

        <article>
          <span aria-hidden="true">✦</span>
          <div>
            <small>Assistente del saggio</small>
            <strong>In arrivo</strong>
          </div>
        </article>
      </section>

      <section className="builds-section">
        <div className="builds-section-heading">
          <div>
            <p className="eyebrow">Archivio personale</p>
            <h2>Le tue build</h2>
          </div>

          <Link href="/builds/new">+ Aggiungi build</Link>
        </div>

        {isLoadingBuilds && (
          <div className="builds-empty-state">
            <span aria-hidden="true">⌛</span>
            <p>Il locandiere sta sfogliando il tuo grimorio...</p>
          </div>
        )}

        {buildError && (
          <div className="builds-empty-state builds-error-state">
            <span aria-hidden="true">!</span>
            <p>{buildError}</p>
          </div>
        )}

        {!isLoadingBuilds && !buildError && builds.length === 0 && (
          <div className="builds-empty-state">
            <span aria-hidden="true">📜</span>
            <h3>Il grimorio è ancora vuoto</h3>
            <p>
              Crea la tua prima build per iniziare a salvare idee, patch,
              varianti e obiettivi.
            </p>
            <Link className="button button-gold" href="/builds/new">
              <span className="button-rune" aria-hidden="true">
                ✦
              </span>
              Crea la prima build
            </Link>
          </div>
        )}

        {!isLoadingBuilds && !buildError && builds.length > 0 && (
          <div className="build-list">
            {builds.map((build) => (
              <Link className="saved-build-card" href={`/builds/${build.id}`} key={build.id}>
                <div className="saved-build-icon" aria-hidden="true">
                  ⚔
                </div>

                <div className="saved-build-content">
                  <div className="saved-build-topline">
                    <span>{build.game}</span>
                    <span>
                      {build.visibility === "private"
                        ? "Privata"
                        : "Non in elenco"}
                    </span>
                  </div>

                  <h3>{build.title}</h3>

                  <p>
                    {build.characterClass} · {build.category} · Patch/Stagione{" "}
                    {build.patch}
                  </p>

                  {build.notes && <small>{build.notes}</small>}
                </div>

                <span className="saved-build-chevron" aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
