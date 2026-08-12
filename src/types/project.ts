export type RuntimeStructure = {
  totalRuntimeSeconds?: number;
  episodes?: number;
  runtimePerEpisodeSeconds?: number;
  partsPerEpisode?: number;
  runtimePerPartSeconds?: number;
  scenesPerPart?: number;
  averageSceneDurationSeconds?: number;
};

export type ProjectCharacter = {
  id: string;
  name: string;
  age: string | null;
  gender: string | null;
  appearance: string;
  wardrobe: string | null;
  personality: string | null;
  role: string | null;
  relationships: string | null;
  voiceTone: string | null;
  cinematicNotes: string | null;
  imageUrl: string | null;
};

export type ProjectLocation = {
  id: string;
  name: string;
  description: string;
  mood: string | null;
  imageUrl: string | null;
};

export type Project = {
  id: string;
  title: string;
  synopsis: string | null;
  storyBible: string | null;
  runtimeStructure: RuntimeStructure | null;
  visualStyle: string;
  aspectRatio: string;
};

export type ProjectContext = Project & {
  characters: ProjectCharacter[];
  locations: ProjectLocation[];
};
