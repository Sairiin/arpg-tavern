export const POE2_CLASSES = [
  "Warrior",
  "Ranger",
  "Witch",
  "Sorceress",
  "Monk",
  "Mercenary",
  "Huntress",
  "Druid",
  "Shaman",
  "Other",
] as const;

export type Poe2Class = (typeof POE2_CLASSES)[number];

export type SavedBuildLink = {
  id: string;
  game: "poe2";
  title: string;
  url: string;
  characterClass: Poe2Class;
  league: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type BuildLinkFormValues = Pick<
  SavedBuildLink,
  "title" | "url" | "characterClass" | "league" | "notes"
>;
