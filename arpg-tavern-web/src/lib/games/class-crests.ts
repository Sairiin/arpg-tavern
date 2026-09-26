const normalize = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const CLASS_CRESTS: Record<string, Record<string, string>> = {
  poe1: {
    marauder: "/images/class-crests/poe1-marauder.png",
    ranger: "/images/class-crests/poe1-ranger.png",
    witch: "/images/class-crests/poe1-witch.png",
    duelist: "/images/class-crests/poe1-duelist.png",
    templar: "/images/class-crests/poe1-templar.png",
    shadow: "/images/class-crests/poe1-shadow.png",
    scion: "/images/class-crests/poe1-scion.png",
  },
  poe2: {
    warrior: "/images/class-crests/poe2-warrior.png",
    ranger: "/images/class-crests/poe2-ranger.png",
    witch: "/images/class-crests/poe2-witch.png",
    mercenary: "/images/class-crests/poe2-mercenary.png",
    sorceress: "/images/class-crests/poe2-sorceress.png",
    monk: "/images/class-crests/poe2-monk.png",
    huntress: "/images/class-crests/poe2-huntress.png",
    druid: "/images/class-crests/poe2-druid.png",
  },
  "diablo-2": {
    amazon: "/images/class-crests/diablo-2-amazon.png",
    assassin: "/images/class-crests/diablo-2-assassin.png",
    barbarian: "/images/class-crests/diablo-2-barbarian.png",
    druid: "/images/class-crests/diablo-2-druid.png",
    necromancer: "/images/class-crests/diablo-2-necromancer.png",
    paladin: "/images/class-crests/diablo-2-paladin.png",
    sorceress: "/images/class-crests/diablo-2-sorceress.png",
  },
  "diablo-4": {
    barbarian: "/images/class-crests/diablo-4-barbarian.png",
    druid: "/images/class-crests/diablo-4-druid.png",
    necromancer: "/images/class-crests/diablo-4-necromancer.png",
    rogue: "/images/class-crests/diablo-4-rogue.png",
    sorcerer: "/images/class-crests/diablo-4-sorcerer.png",
    spiritborn: "/images/class-crests/diablo-4-spiritborn.png",
  },
  "last-epoch": {
    acolyte: "/images/class-crests/last-epoch-acolyte.png",
    mage: "/images/class-crests/last-epoch-mage.png",
    primalist: "/images/class-crests/last-epoch-primalist.png",
    rogue: "/images/class-crests/last-epoch-rogue.png",
    sentinel: "/images/class-crests/last-epoch-sentinel.png",
  },
  "grim-dawn": {
    soldier: "/images/class-crests/grim-dawn-soldier.png",
    demolitionist: "/images/class-crests/grim-dawn-demolitionist.png",
    occultist: "/images/class-crests/grim-dawn-occultist.png",
    nightblade: "/images/class-crests/grim-dawn-nightblade.png",
    arcanist: "/images/class-crests/grim-dawn-arcanist.png",
    shaman: "/images/class-crests/grim-dawn-shaman.png",
    inquisitor: "/images/class-crests/grim-dawn-inquisitor.png",
    necromancer: "/images/class-crests/grim-dawn-necromancer.png",
    oathkeeper: "/images/class-crests/grim-dawn-oathkeeper.png",
  },
};

export function getClassCrestImage(game: string, characterClass: string) {
  if (normalize(characterClass) === "guida") {
    return "/images/class-crests/guide.png";
  }


  const gameCrests = CLASS_CRESTS[game];

  if (!gameCrests) {
    return null;
  }

  return gameCrests[normalize(characterClass)] ?? null;
}

const CLASS_BACKGROUND_ARCHETYPES: Record<string, string> = {
  marauder: "warrior",
  warrior: "warrior",
  barbarian: "warrior",
  duelist: "warrior",
  soldier: "warrior",
  sentinel: "warrior",

  ranger: "ranger",
  huntress: "ranger",
  amazon: "ranger",

  witch: "mage",
  sorceress: "mage",
  sorcerer: "mage",
  mage: "mage",
  arcanist: "mage",

  necromancer: "necromancer",
  acolyte: "necromancer",

  templar: "paladin",
  paladin: "paladin",
  oathkeeper: "paladin",

  shadow: "rogue",
  assassin: "rogue",
  rogue: "rogue",
  nightblade: "rogue",

  druid: "druid",
  primalist: "druid",
  spiritborn: "druid",

  monk: "monk",

  mercenary: "gunslinger",
  demolitionist: "gunslinger",

  occultist: "occultist",
  shaman: "shaman",
  inquisitor: "inquisitor",
};

export function getClassBackgroundImage(characterClass: string) {
  const className = normalize(characterClass);
  const archetype = CLASS_BACKGROUND_ARCHETYPES[className];

  return archetype
    ? `/images/class-backgrounds/${archetype}.jpg`
    : null;
}
