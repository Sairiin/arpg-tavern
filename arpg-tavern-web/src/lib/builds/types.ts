export const arpgGames = [
  "Path of Exile 2",
  "Path of Exile",
  "Diablo IV",
  "Last Epoch",
  "Grim Dawn",
  "Torchlight Infinite",
  "Altro"
] as const;

export const buildCategories = [
  "League starter",
  "Leveling",
  "Mapping",
  "Endgame",
  "Bossing",
  "SSF",
  "Hardcore",
  "Budget",
  "Theorycraft"
] as const;

export type ArpgGame = (typeof arpgGames)[number];
export type BuildCategory = (typeof buildCategories)[number];
export type BuildVisibility = "private" | "unlisted";

export type BuildRecord = {
  id: string;
  title: string;
  game: ArpgGame;
  characterClass: string;
  patch: string;
  category: BuildCategory;
  visibility: BuildVisibility;
  notes: string;
  createdAt?: {
    seconds: number;
    nanoseconds: number;
  } | null;
  updatedAt?: {
    seconds: number;
    nanoseconds: number;
  } | null;
};