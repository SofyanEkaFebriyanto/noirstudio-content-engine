/**
 * Audio helpers backed by ffmpeg/ffprobe. Everything here is optional except
 * duration probing — if ffmpeg is missing the pipeline warns and continues.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

export function hasBinary(name: string): boolean {
  try {
    execFileSync(name, ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export const hasFfmpeg = () => hasBinary('ffmpeg');
export const hasFfprobe = () => hasBinary('ffprobe');

/** Duration in seconds, or null when ffprobe is unavailable or the file is bad. */
export function probeDuration(file: string): number | null {
  if (!existsSync(file) || !hasFfprobe()) return null;
  try {
    const out = execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file],
      { encoding: 'utf8' },
    ).trim();
    const value = Number.parseFloat(out);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

/** Convert anything to a normalized mp3 so Remotion gets a predictable codec. */
export function toMp3(src: string, dest: string, bitrate = '192k'): boolean {
  if (!hasFfmpeg()) return false;
  try {
    execFileSync(
      'ffmpeg',
      ['-y', '-i', src, '-vn', '-ac', '2', '-ar', '44100', '-b:a', bitrate, dest],
      { stdio: 'ignore' },
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Loudness-normalize a finished film to a platform-safe target.
 * Returns false (without throwing) if ffmpeg is unavailable.
 */
export function loudnorm(input: string, output: string, targetLufs = -14, truePeak = -1.5): boolean {
  if (!hasFfmpeg()) return false;
  try {
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-i',
        input,
        // loudnorm works at 192 kHz internally; pin the output back to 48 kHz
        // or the delivered file gets an unusual 96 kHz track that some
        // platforms re-encode poorly.
        '-af',
        `loudnorm=I=${targetLufs}:TP=${truePeak}:LRA=11,aresample=48000`,
        '-c:v',
        'copy',
        '-c:a',
        'aac',
        '-ar',
        '48000',
        '-ac',
        '2',
        '-b:a',
        '192k',
        output,
      ],
      { stdio: 'ignore' },
    );
    return true;
  } catch {
    return false;
  }
}

/** Extract one frame as png, for thumbnail generation and visual QA. */
export function extractFrame(input: string, timeSeconds: number, output: string): boolean {
  if (!hasFfmpeg()) return false;
  try {
    execFileSync(
      'ffmpeg',
      ['-y', '-ss', String(timeSeconds), '-i', input, '-frames:v', '1', '-q:v', '2', output],
      { stdio: 'ignore' },
    );
    return true;
  } catch {
    return false;
  }
}

/** Concatenate audio files with a short gap, for building a VO reel. */
export function concatAudio(files: string[], output: string, gapSeconds = 0.25): boolean {
  if (!hasFfmpeg() || files.length === 0) return false;
  const args: string[] = ['-y'];
  for (const file of files) args.push('-i', file);
  const filters = files
    .map((_, index) => `[${index}:a]apad=pad_dur=${gapSeconds}[a${index}]`)
    .join(';');
  const concatInputs = files.map((_, index) => `[a${index}]`).join('');
  const filter = `${filters};${concatInputs}concat=n=${files.length}:v=0:a=1[out]`;
  try {
    execFileSync('ffmpeg', [...args, '-filter_complex', filter, '-map', '[out]', output], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
