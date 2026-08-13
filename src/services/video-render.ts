import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import { uploadVideo } from "@/lib/storage";
import { isDevMode } from "@/lib/config";

const FONT_PATH = path.join(process.cwd(), "node_modules/dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf");

const run = promisify(execFile);

const DEFAULT_SCENE_DURATION = 9;
const FPS = 30;
const FFMPEG_TIMEOUT_MS = Number(process.env.FFMPEG_TIMEOUT ?? 600) * 1000;

type SceneInput = { order: number; subtitle: string; imageUrl: string };

function dimensionsFor(aspectRatio: string): { width: number; height: number } {
  return aspectRatio === "16:9" ? { width: 1920, height: 1080 } : { width: 1080, height: 1920 };
}

async function downloadToFile(url: string, destPath: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(destPath, buffer);
}

function escapeDrawtext(text: string): string {
  // Truncate/normalize whitespace *before* escaping so we never cut a
  // multi-character escape sequence in half.
  const truncated = text.replace(/\n/g, " ").slice(0, 140);

  // The whole string is wrapped in single quotes (text='...') below.
  // ffmpeg's filtergraph quoting for a literal `'` inside a quoted string
  // (close quote, escaped quote, reopen quote: '\'') looks right per the
  // docs but empirically still corrupts parsing of every filter option that
  // follows (verified against the real ffmpeg binary — this is exactly what
  // broke a real "Ramon's" subtitle in production, both the naive `\'`
  // escape and the documented `'\''` trick). Sidestepping the quoting
  // entirely by swapping in a visually-identical Unicode apostrophe is the
  // only approach that held up under testing.
  return truncated
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "’")
    .replace(/:/g, "\\:");
}

async function renderSceneSegment(
  scene: SceneInput,
  index: number,
  workDir: string,
  dimensions: { width: number; height: number },
  sceneDuration: number,
): Promise<string> {
  const { width, height } = dimensions;
  const imagePath = path.join(workDir, `scene_${index}_source.png`);
  await downloadToFile(scene.imageUrl, imagePath);

  const outputPath = path.join(workDir, `scene_${index}.mp4`);
  const totalFrames = sceneDuration * FPS;

  const zoomExpr =
    index % 2 === 0
      ? `zoom='min(zoom+0.0015,1.2)':x='iw/2-(iw/zoom/2)+(in/${totalFrames})*20':y='ih/2-(ih/zoom/2)'`
      : `zoom='min(zoom+0.0015,1.2)':x='iw/2-(iw/zoom/2)-(in/${totalFrames})*20':y='ih/2-(ih/zoom/2)+(in/${totalFrames})*10'`;

  const subtitle = escapeDrawtext(scene.subtitle);

  const filter = [
    `scale=${width * 2}:${height * 2}:force_original_aspect_ratio=increase`,
    `crop=${width * 2}:${height * 2}`,
    `zoompan=${zoomExpr}:d=${totalFrames}:s=${width}x${height}:fps=${FPS}`,
    `drawtext=text='${subtitle}':fontfile=${FONT_PATH}:` +
      `fontsize=54:fontcolor=white:borderw=4:bordercolor=black:x=(w-text_w)/2:y=h-th-160:line_spacing=10:box=0`,
    `vignette=PI/5`,
  ].join(",");

  await run(
    ffmpegPath.path,
    [
      "-y",
      "-loop", "1",
      "-i", imagePath,
      "-vf", filter,
      "-t", String(sceneDuration),
      "-r", String(FPS),
      "-pix_fmt", "yuv420p",
      "-c:v", "libx264",
      "-preset", "medium",
      outputPath,
    ],
    { timeout: FFMPEG_TIMEOUT_MS, maxBuffer: 1024 * 1024 * 64 },
  );

  return outputPath;
}

async function crossfadeSegments(segmentPaths: string[], outputPath: string, sceneDuration: number) {
  const transition = 1.0;
  const duration = sceneDuration;

  const inputs = segmentPaths.flatMap((p) => ["-i", p]);
  const filterParts: string[] = [];
  let lastLabel = "0:v";
  let offset = duration - transition;

  for (let i = 1; i < segmentPaths.length; i++) {
    const outLabel = `v${i}`;
    filterParts.push(`[${lastLabel}][${i}:v]xfade=transition=fade:duration=${transition}:offset=${offset}[${outLabel}]`);
    lastLabel = outLabel;
    offset += duration - transition;
  }

  await run(
    ffmpegPath.path,
    [
      "-y",
      ...inputs,
      "-filter_complex", filterParts.join(";"),
      "-map", `[${lastLabel}]`,
      "-c:v", "libx264",
      "-preset", "medium",
      "-pix_fmt", "yuv420p",
      outputPath,
    ],
    { timeout: FFMPEG_TIMEOUT_MS, maxBuffer: 1024 * 1024 * 64 },
  );
}

async function muxAudioAndFinalize(
  silentVideoPath: string,
  narrationPath: string | null,
  musicPath: string | null,
  outputPath: string,
) {
  const hasNarration = Boolean(narrationPath);
  const hasMusic = Boolean(musicPath);

  const inputs = ["-i", silentVideoPath];
  if (hasNarration && narrationPath) inputs.push("-i", narrationPath);
  if (hasMusic && musicPath) inputs.push("-i", musicPath);
  if (!hasNarration && !hasMusic) inputs.push("-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000");

  // Input index 1 is narration if present, else music, else silence — build
  // the filter graph to match whichever combination is actually attached.
  let audioFilter: string;
  if (hasNarration && hasMusic) {
    audioFilter = "[1:a]volume=1.0[narration];[2:a]volume=0.2[music];[narration][music]amix=inputs=2:duration=first:dropout_transition=2[aout]";
  } else if (hasNarration) {
    audioFilter = "[1:a]volume=1.0[aout]";
  } else if (hasMusic) {
    audioFilter = "[1:a]volume=0.6[aout]"; // no narration to duck under — music carries the soundtrack
  } else {
    audioFilter = "[1:a]anull[aout]";
  }

  await run(
    ffmpegPath.path,
    [
      "-y",
      ...inputs,
      "-filter_complex", audioFilter,
      "-map", "0:v",
      "-map", "[aout]",
      "-c:v", "libx264",
      "-preset", "slow",
      "-crf", "20",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "192k",
      "-shortest",
      "-movflags", "+faststart",
      outputPath,
    ],
    { timeout: FFMPEG_TIMEOUT_MS, maxBuffer: 1024 * 1024 * 64 },
  );
}

export async function renderStoryVideo(
  scenes: SceneInput[],
  narrationUrl: string | null,
  aspectRatio: string = "9:16",
  sceneDurationSeconds: number = DEFAULT_SCENE_DURATION,
): Promise<string> {
  if (isDevMode) {
    throw new Error("FFmpeg render worker disabled in development mode");
  }

  if (scenes.length === 0) throw new Error("Cannot render a video with no scenes.");

  const sceneDuration = Math.min(30, Math.max(3, Math.round(sceneDurationSeconds)));
  const dimensions = dimensionsFor(aspectRatio);
  const workDir = await mkdtemp(path.join(tmpdir(), "realcraft-render-"));

  try {
    const segmentPaths: string[] = [];
    for (let i = 0; i < scenes.length; i++) {
      segmentPaths.push(await renderSceneSegment(scenes[i], i, workDir, dimensions, sceneDuration));
    }

    const silentPath = path.join(workDir, "combined_silent.mp4");
    await crossfadeSegments(segmentPaths, silentPath, sceneDuration);

    let narrationPath: string | null = null;
    if (narrationUrl) {
      narrationPath = path.join(workDir, "narration.audio");
      await downloadToFile(narrationUrl, narrationPath);
    }

    const musicUrl = process.env.FFMPEG_MUSIC_TRACK_URL || null;
    let musicPath: string | null = null;
    if (musicUrl) {
      const resolvedMusicPath = path.join(workDir, "music.mp3");
      await downloadToFile(musicUrl, resolvedMusicPath);
      musicPath = resolvedMusicPath;
    }

    const outputPath = path.join(workDir, "final.mp4");
    await muxAudioAndFinalize(silentPath, narrationPath, musicPath, outputPath);

    const finalBuffer = await readFile(outputPath);
    return await uploadVideo(finalBuffer);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
