import { promisify } from "util";
import { exec } from "child_process";

const execAsync = promisify(exec);

/**
 * Detect silence regions using ffmpeg's silencedetect filter.
 * 
 * This identifies where volume < threshold for more than min duration.
 */
export async function detectSilence(videoPath) {
  console.log("Detecting silence…");

  // Silence threshold in dB
  const silenceThreshold = -35;
  const silenceDuration = 0.4; // 400ms

  const cmd = `
    ffmpeg -i "${videoPath}" -af silencedetect=n=${silenceThreshold}dB:d=${silenceDuration} -f null -
  `;

  try {
    const { stderr } = await execAsync(cmd);

    const silence = [];
    let current = {};

    const lines = stderr.split("\n");

    for (let line of lines) {
      line = line.trim();

      if (line.includes("silence_start")) {
        const t = parseFloat(line.split("silence_start:")[1]);
        current.start = t;
      }

      if (line.includes("silence_end")) {
        const parts = line.split("silence_end:")[1];
        const end = parseFloat(parts.split("|")[0]);
        current.end = end;
        silence.push({ ...current });
        current = {};
      }
    }

    // Merge overlapping silence segments
    const merged = mergeOverlaps(silence);
    return merged;

  } catch (e) {
    console.error("Silence detection failed:", e);
    return [];
  }
}

/**
 * Merge silence segments that overlap or are very close.
 */
function mergeOverlaps(segments) {
  if (segments.length === 0) return [];

  segments.sort((a, b) => a.start - b.start);

  const merged = [segments[0]];

  for (let i = 1; i < segments.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = segments[i];

    if (curr.start <= prev.end + 0.1) {
      // Overlapping or very close — merge
      prev.end = Math.max(prev.end, curr.end);
    } else {
      merged.push(curr);
    }
  }

  return merged;
}
