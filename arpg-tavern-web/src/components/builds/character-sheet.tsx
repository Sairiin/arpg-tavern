import type { ImportedBuildData, ImportedItem } from "@/lib/builds/types";
const equipmentSlotIcons: Record<string, string> = {
  helmet: "/assets/character-sheet/generated/equipment-helmet.png",
  helm: "/assets/character-sheet/generated/equipment-helmet.png",
  weapon: "/assets/character-sheet/generated/equipment-weapon.png",
  body: "/assets/character-sheet/generated/equipment-body.png",
  armour: "/assets/character-sheet/generated/equipment-body.png",
  armor: "/assets/character-sheet/generated/equipment-body.png",
  gloves: "/assets/character-sheet/generated/equipment-gloves.png",
  boots: "/assets/character-sheet/generated/equipment-boots.png",
  ring: "/assets/character-sheet/generated/equipment-ring.png",
  amulet: "/assets/character-sheet/generated/equipment-amulet.png",
};

function getEquipmentIcon(slot?: string) {
  const normalizedSlot = slot?.trim().toLowerCase() || "";
  return (
    equipmentSlotIcons[normalizedSlot] ||
    "/assets/character-sheet/generated/equipment-body.png"
  );
}

type CharacterSheetProps = {
  title: string;
  game: string;
  characterClass: string;
  ascendancy: string;
  patch: string;
  category: string;
  notes: string;
  importedData?: ImportedBuildData;
  onEdit: () => void;
};

function rarityIcon(rarity: ImportedItem["rarity"]): string {
  if (rarity === "unique") return "✦";
  if (rarity === "rare") return "◆";
  if (rarity === "magic") return "◇";
  return "○";
}

export function CharacterSheet({
  title,
  game,
  characterClass,
  ascendancy,
  patch,
  category,
  notes,
  importedData,
  onEdit,
}: CharacterSheetProps) {
  const character = importedData?.character;
  const summary = importedData?.summary;
  const items = importedData?.items || [];
  const skills = importedData?.skills || [];
  const passiveCount = summary?.passiveCount || 0;

  return (
    <section className="character-sheet">
      <header className="character-sheet__header">
        <div className="character-sheet__seal" aria-hidden="true">✦</div>
        <div className="character-sheet__title">
          <span className="character-sheet__eyebrow">Scheda dell'avventuriero</span>
          <h1>{title || "Build senza nome"}</h1>
          <p>{game} · {character?.className || characterClass || "Classe non indicata"} · {character?.ascendancy || ascendancy || "Ascendancy non indicata"}</p>
        </div>
        <div className="character-sheet__level">
          <span>Livello</span>
          <strong>{character?.level || "—"}</strong>
          <small>{patch || "Patch —"}</small>
        </div>
      </header>

      <div className="character-sheet__body">
        <aside className="character-sheet__column">
          <section className="sheet-card sheet-card--stats">
            <h2>Attributi della build</h2>
            <div className="sheet-stat-grid">
              <div><span>Classe</span><strong>{character?.className || characterClass || "—"}</strong></div>
              <div><span>Ascendancy</span><strong>{character?.ascendancy || ascendancy || "—"}</strong></div>
              <div><span>Passivi</span><strong>{passiveCount}</strong></div>
              <div><span>Gruppi skill</span><strong>{summary?.skillGroupCount || 0}</strong></div>
              <div><span>Oggetti</span><strong>{summary?.itemCount || 0}</strong></div>
              <div><span>Categoria</span><strong>{category}</strong></div>
            </div>
          </section>

          <details className="sheet-card sheet-card--notes">
            <summary>Note e obiettivi</summary>
            <p>{notes || "Nessuna nota inserita."}</p>
          </details>
        </aside>

        <section className="character-sheet__portrait-panel">
            <img
  className="character-sheet__portrait-image"
  src="/assets/character-sheet/generated/character-portrait.png"
  alt="Ritratto del personaggio"
  loading="lazy"
/>
          <div className="character-sheet__portrait" aria-label="Ritratto decorativo del personaggio">
           
            <strong>{character?.className || characterClass || "Avventuriero"}</strong>
            <small>{character?.ascendancy || ascendancy || "Percorso da definire"}</small>
          </div>
          <div className="character-sheet__ribbon">{title || "Build senza nome"}</div>
          <button className="sheet-action sheet-action--primary" type="button" onClick={onEdit}>Modifica scheda</button>
        </section>

        <aside className="character-sheet__column">
          <section className="sheet-card sheet-card--defences">
            <h2>Riepilogo</h2>
            <div className="sheet-defence-list">
              <div><span>Gioco</span><strong>{game}</strong></div>
              <div><span>Patch</span><strong>{patch || "—"}</strong></div>
              <div><span>Fonte</span><strong>{importedData ? "Importata" : "Manuale"}</strong></div>
              <div><span>Stato</span><strong>Salvata</strong></div>
            </div>
          </section>

          <details className="sheet-card sheet-card--archive">
            <summary>Dettagli importazione</summary>
            <p>{summary?.gemCount || 0} gemme · {summary?.itemCount || 0} oggetti · {passiveCount} nodi passivi.</p>
          </details>
        </aside>
      </div>

      <details className="sheet-card sheet-card--equipment" open>
        <summary>Equipaggiamento <small>{items.length} oggetti</small></summary>
        <div className="sheet-equipment-grid">
          {items.map((item, index) => (
            <article className={`sheet-item sheet-item--${item.rarity || "unknown"}`} key={`${item.slot}-${item.name}-${index}`}>
              <span className="sheet-item__icon" aria-hidden="true">{rarityIcon(item.rarity)}</span>
              <img
  className="sheet-item__icon"
  src={getEquipmentIcon(item.slot)}
  alt=""
  aria-hidden="true"
/>

<div>
  <small>{item.slot || "Slot"}</small>
  <h3>{item.name || "Oggetto senza nome"}</h3>
  <p>{item.baseType || "Base non rilevata"}</p>
</div>
              {item.rawText && <details className="sheet-item__details"><summary>Mod e dettagli</summary><pre>{item.rawText}</pre></details>}
            </article>
          ))}
        </div>
      </details>

      <div className="character-sheet__lower-grid">
        <details className="sheet-card" open>
          <summary>Abilità e gemme <small>{skills.length} gruppi</small></summary>
          {skills.map((group, groupIndex) => (
            <section className="sheet-skill-group" key={`${group.label}-${groupIndex}`}>
              <h3>{group.label}</h3>
              <div className="sheet-gem-row">
                {group.gems.map((gem, gemIndex) => (
  <span
    className={`sheet-gem ${
      group.isMainSkill && gemIndex === 0
        ? "sheet-gem--main"
        : ""
    }`}
    title={`${gem.name} · Livello ${gem.level || "—"}`}
    key={`${gem.name}-${gemIndex}`}
  >
    <img
      src={`/assets/character-sheet/${
        group.isMainSkill && gemIndex === 0
          ? "gem-active.png"
          : "gem-support.png"
      }`}
      alt=""
      aria-hidden="true"
    />
    <span>{gem.name}</span>
  </span>
))}
              </div>
            </section>
          ))}
        </details>

        <details className="sheet-card" open>
          <summary>Albero dei passivi <small>{passiveCount} nodi</small></summary>
          <div className="sheet-passive-tree">
            <div className="sheet-passive-tree__line" />
            {Array.from({
  length: Math.min(Math.max(passiveCount, 5), 18),
}).map((_, index) => (
  <span
    className={`sheet-passive-node ${
      index === 8 ? "sheet-passive-node--major" : ""
    }`}
    key={index}
    title={`Nodo passivo ${index + 1}`}
  >
    <img
      src="/assets/character-sheet/generated/passive-node.png"
      alt=""
      aria-hidden="true"
    />
    <span>{index + 1}</span>
  </span>
))}
          </div>
        </details>
      </div>
    </section>
  );
}