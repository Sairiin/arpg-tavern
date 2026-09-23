export const POE1_VERSIONS = ["3.27"] as const;

export const POE1_CLASSES = [
  "Marauder",
  "Ranger",
  "Witch",
  "Duelist",
  "Templar",
  "Shadow",
  "Scion",
] as const;

export const POE1_ASCENDANCIES = {
  Marauder: ["Juggernaut", "Berserker", "Chieftain"],
  Ranger: ["Deadeye", "Pathfinder", "Raider"],
  Witch: ["Elementalist", "Necromancer", "Occultist"],
  Duelist: ["Slayer", "Gladiator", "Champion"],
  Templar: ["Inquisitor", "Hierophant", "Guardian"],
  Shadow: ["Assassin", "Saboteur", "Trickster"],
  Scion: ["Ascendant"],
} as const;

export const POE1_CATEGORIES = [
  "League starter",
  "Leveling",
  "Mapping",
  "Endgame",
  "Bossing",
  "SSF",
  "Hardcore",
  "Budget",
  "Theorycraft",
] as const;
