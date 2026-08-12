import type { ProjectContext, RuntimeStructure } from "@/types/project";

function formatRuntimeStructure(rs: RuntimeStructure | null): string {
  if (!rs) return "Not specified.";

  const parts: string[] = [];
  if (rs.totalRuntimeSeconds) parts.push(`total runtime ${rs.totalRuntimeSeconds}s`);
  if (rs.episodes) parts.push(`${rs.episodes} planned episodes`);
  if (rs.runtimePerEpisodeSeconds) parts.push(`${rs.runtimePerEpisodeSeconds}s per episode`);
  if (rs.partsPerEpisode) parts.push(`${rs.partsPerEpisode} parts per episode`);
  if (rs.runtimePerPartSeconds) parts.push(`${rs.runtimePerPartSeconds}s per part`);
  if (rs.scenesPerPart) parts.push(`${rs.scenesPerPart} scenes per part`);
  if (rs.averageSceneDurationSeconds) parts.push(`~${rs.averageSceneDurationSeconds}s per scene`);

  return parts.length > 0 ? parts.join(", ") : "Not specified.";
}

function formatCharacters(characters: ProjectContext["characters"]): string {
  if (characters.length === 0) return "None.";

  return characters
    .map((c) => {
      const traits = [
        c.role,
        c.age ? `${c.age} years old` : null,
        c.gender,
        c.appearance,
        c.wardrobe ? `wardrobe: ${c.wardrobe}` : null,
        c.personality ? `personality: ${c.personality}` : null,
        c.voiceTone ? `voice tone: ${c.voiceTone}` : null,
        c.relationships ? `relationships: ${c.relationships}` : null,
        c.cinematicNotes ? `cinematic notes: ${c.cinematicNotes}` : null,
      ]
        .filter(Boolean)
        .join("; ");
      const identity = c.imageUrl ? " Maintain the exact facial identity from the uploaded reference image." : "";
      return `${c.name} — ${traits}.${identity}`;
    })
    .join("\n");
}

function formatLocations(locations: ProjectContext["locations"]): string {
  if (locations.length === 0) return "None.";
  return locations.map((l) => `${l.name} — ${l.description}${l.mood ? ` (mood: ${l.mood})` : ""}`).join("\n");
}

/** Builds the hidden per-episode context block every project episode prompt is prefixed with. */
export function buildHiddenContext(context: ProjectContext): string {
  return [
    `PROJECT TITLE: ${context.title}`,
    `DESCRIPTION: ${context.synopsis ?? "Not specified."}`,
    `RUNTIME STRUCTURE: ${formatRuntimeStructure(context.runtimeStructure)}`,
    `CHARACTERS:\n${formatCharacters(context.characters)}`,
    `RECURRING LOCATIONS:\n${formatLocations(context.locations)}`,
    `STORY SUMMARY: ${context.storyBible ?? "Not specified."}`,
    `VISUAL STYLE: ${context.visualStyle}`,
    `ASPECT RATIO: ${context.aspectRatio}`,
    "",
    "Maintain strict continuity across all episodes and scenes.",
  ].join("\n");
}
