import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import { uploadVideo } from "@/lib/storage";

const FONT_PATH = path.join(process.cwd(), "node_modules/dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf");

const run = promisify(execFile);

const SCENE_DURATION = 9;
const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
const FFMPEG_TIMEOUT_MS = Number(process.env.FFMPEG_TIMEOUT ?? 600) * 1000;

type SceneInput = { order: number; subtitle: string; imageUrl: string };

async function downloadToFile(url: string, destPath: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(destPath, buffer);
}

function escapeDrawtext(text: string): string {
  const escaped = text
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/:/g, "\\:")
    .replace(/\n/g, " ");
  return escaped.slice(0, 140);
}

async function renderSceneSegment(scene: SceneInput, index: number, workDir: string): Promise<string> {
  const imagePath = path.join(workDir, `scene_${index}_source.png`);
  await downloadToFile(scene.imageUrl, imagePath);

  const outputPath = path.join(workDir, `scene_${index}.mp4`);
  const totalFrames = SCENE_DURATION * FPS;

  const zoomExpr =
    index % 2 === 0
      ? `zoom='min(zoom+0.0015,1.2)':x='iw/2-(iw/zoom/2)+(in/${totalFrames})*20':y='ih/2-(ih/zoom/2)'`
      : `zoom='min(zoom+0.0015,1.2)':x='iw/2-(iw/zoom/2)-(in/${totalFrames})*20':y='ih/2-(ih/zoom/2)+(in/${totalFrames})*10'`;

  const subtitle = escapeDrawtext(scene.subtitle);

  const filter = [
    `scale=${WIDTH * 2}:${HEIGHT * 2}:force_original_aspect_ratio=increase`,
    `crop=${WIDTH * 2}:${HEIGHT * 2}`,
    `zoompan=${zoomExpr}:d=${totalFrames}:s=${WIDTH}x${HEIGHT}:fps=${FPS}`,
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
      "-t", String(SCENE_DURATION),
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

async function crossfadeSegments(segmentPaths: string[], outputPath: string) {
  const transition = 1.0;
  const duration = SCENE_DURATION;

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
  narrationPath: string,
  musicPath: string | null,
  outputPath: string,
) {
  const hasMusic = Boolean(musicPath);

  const inputs = ["-i", silentVideoPath, "-i", narrationPath];
  if (hasMusic && musicPath) inputs.push("-i", musicPath);

  const audioFilter = hasMusic
    ? "[1:a]volume=1.0[narration];[2:a]volume=0.2[music];[narration][music]amix=inputs=2:duration=first:dropout_transition=2[aout]"
    : "[1:a]volume=1.0[aout]";

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

export async function renderStoryVideo(scenes: SceneInput[], narrationUrl: string): Promise<string> {
  if (scenes.length === 0) throw new Error("Cannot render a video with no scenes.");

  const workDir = await mkdtemp(path.join(tmpdir(), "realcraft-render-"));

  try {
    const segmentPaths: string[] = [];
    for (let i = 0; i < scenes.length; i++) {
      segmentPaths.push(await renderSceneSegment(scenes[i], i, workDir));
    }

    const silentPath = path.join(workDir, "combined_silent.mp4");
    await crossfadeSegments(segmentPaths, silentPath);

    const narrationPath = path.join(workDir, "narration.audio");
    await downloadToFile(narrationUrl, narrationPath);

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
