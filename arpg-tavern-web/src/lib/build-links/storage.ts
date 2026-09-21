import type { SavedBuildLink } from "./types";

const STORAGE_KEY = "arpg-tavern:build-links:v1";

function isSavedBuildLink(value: unknown): value is SavedBuildLink {
  if (!value || typeof value !== "object") return false;

  const build = value as Partial<SavedBuildLink>;

  return (
    build.game === "poe2" &&
    typeof build.id === "string" &&
    typeof build.title === "string" &&
    typeof build.url === "string" &&
    typeof build.characterClass === "string" &&
    typeof build.league === "string" &&
    typeof build.notes === "string" &&
    typeof build.createdAt === "string" &&
    typeof build.updatedAt === "string"
  );
}

export function loadSavedBuildLinks(): SavedBuildLink[] {
  if (typeof window === "undefined") return [];

  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return [];

    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(isSavedBuildLink)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  } catch {
    return [];
  }
}

export function saveBuildLinks(builds: SavedBuildLink[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(builds));
}
