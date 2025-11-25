import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { detectBeats } from "./beat.js";
import { detectSilence } from "./silence.js";
import { detectEnergy } from "./energy.js";

ffmpeg.setFfmpegPath(ffmpegPath);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Convert a local file to Base64 string
 */
function fileToBase64(filePath) {
  const data = fs.readFileSync(filePath);
  return data.toString("base64");
}

/**
 * Run FFmpeg command as Promise
 */
function ffmpegPromise(cmd) {
  return new Promise((resolve, reject) => {
    cmd.on("end", resolve);
    cmd.on("error", reject);
    cmd.run();
  });
}

/**
 * Generate a random filename in /tmp
 */
function tmpFile(ext = ".mp4") {
  const id = Math.random().toString(36).substring(2, 10);
  return `/tmp/wavemint_${id}${ext}`;
}

/**
 * Main Hybrid Slicing Algorithm
 * - Beat detection
 * - Silence detection
 * - Energy peaks
 * - Musical phrases (1 or 2 bar units)
 */
export async function hybridSlice(videoPath, audioPath = null) {
  console.log("Hybrid slicing started...");

  // Step 1: Get beat grid
  const beats = await detectBeats(videoPath);
  console.log("Beats:", beats.length);

  // Step 2: Get silence map
  const silenceSegments = await detectSilence(videoPath);
  console.log("Silence:", silenceSegments);

  // Step 3: Get energy spikes
  const energyMap = await detectEnergy(videoPath);
  console.log("Energy map:", energyMap.length);

  // Step 4: Build musical phrase segments
  const clipSegments = computeMusicalPhrases(beats, silenceSegments, energyMap);

  console.log("Computed segments:", clipSegments);

  // Step 5: Create final clips
  const finalClips = [];

  for (let i = 0; i < clipSegments.length; i++) {
    const seg = clipSegments[i];

    const outFile = tmpFile(".mp4");

    console.log(`Rendering clip #${i}: ${seg.start} → ${seg.end}`);

    const cmd = ffmpeg(videoPath)
      .setStartTime(seg.start)
      .setDuration(seg.end - seg.start)
      .size("1080x1920") // vertical crop
      .videoFilters("crop=in_w:in_h, scale=1080:1920")
      .output(outFile)
      .videoCodec("libx264")
      .audioCodec("aac")
      .format("mp4");

    await ffmpegPromise(cmd);

    // Convert to base64
    const base64 = fileToBase64(outFile);

    // Clean up
    fs.unlinkSync(outFile);

    finalClips.push({
      index: i,
      start: seg.start,
      end: seg.end,
      duration: seg.end - seg.start,
      buffer: base64,
    });
  }

  return finalClips;
}

/**
 * Convert beat grid + silence + energy → musical phrase segments.
 * 
 * This ensures:
 * - Clips stay 6–15 sec
 * - Snap to nearest beat
 * - Avoid cutting in silence unless start/end
 * - Use high-energy points if beat grid is unclear
 */
function computeMusicalPhrases(beats, silence, energy) {
  const segments = [];
  const minLength = 6;   // seconds
  const maxLength = 15;  // seconds

  if (beats.length === 0) {
    // fallback: use energy map
    for (let i = 0; i < energy.length - 1; i += 3) {
      const start = energy[i].time;
      let end = energ
