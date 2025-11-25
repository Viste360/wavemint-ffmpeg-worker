import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { promisify } from "util";
import { exec } from "child_process";

ffmpeg.setFfmpegPath(ffmpegPath);
const execAsync = promisify(exec);

/**
 * Extract audio amplitude envelope using ffprobe
 */
async function extractAudioEnvelope(videoPath) {
  const cmd = `ffprobe -hide_banner -loglevel error -f lavfi -i amovie=${videoPath},astats=metadata=1:reset=1 -show_entries frame=pkt_pts_time:frame_tag=lavfi.astats.Overall.RMS_level -of csv=p=0`;
  
  try {
    const { stdout } = await execAsync(cmd);
    const lines = stdout.trim().split("\n");

    const envelope = [];

    for (const line of lines) {
      // ffprobe sometimes outputs empty lines
      if (!line || !line.includes(",")) continue;

      const [timeStr, volStr] = line.split(",");
      const time = parseFloat(timeStr);
      const rms = parseFloat(volStr);

      if (!isNaN(time) && !isNaN(rms)) {
        envelope.push({ time, rms });
      }
    }

    return envelope;
  } catch (e) {
    console.error("Envelope extraction failed:", e);
    return [];
  }
}

/**
 * Smooth RMS signal using moving average
 */
function smoothEnvelope(data, window = 8) {
  const smoothed = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - window);
    const slice = data.slice(start, i + 1);
    const avg = slice.reduce((a, b) => a + b.rms, 0) / slice.length;
    smoothed.push({ time: data[i].time, rms: avg });
  }
  return smoothed;
}

/**
 * Detect peaks in energy envelope
 */
function detectPeaks(smoothed, thresholdDb = -25) {
  const peaks = [];

  for (let i = 1; i < smoothed.length - 1; i++) {
    const prev = smoothed[i - 1].rms;
    const cur = smoothed[i].rms;
    const next = smoothed[i + 1].rms;

    // RMS level is negative dB — so peak = highest (least negative)
    if (cur > prev && cur > next && cur > thresholdDb) {
      peaks.push(smoothed[i]);
    }
  }

  return peaks;
}

/**
 * Estimate BPM from peak spacings
 */
function estimateBPM(peaks) {
  if (peaks.length < 2) return 120;

  const intervals = [];
  for (let i = 1; i < peaks.length; i++) {
    const dt = peaks[i].time - peaks[i - 1].time;
    if (dt > 0.2 && dt < 1.0) intervals.push(dt);
  }

  if (intervals.length === 0) return 120;

  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const bpm = Math.round(60 / avg);
  return Math.min(Math.max(bpm, 60), 180);
}

/**
 * Build beat grid by distributing peaks on tempo
 */
function buildBeatGrid(peaks, bpm) {
  if (peaks.length === 0) return [];

  const beatLength = 60 / bpm;

  const grid = [];
  let t = peaks[0].time;

  while (t < peaks[peaks.length - 1].time) {
    grid.push({ time: t });
    t += beatLength;
  }

  return grid;
}

/**
 * Main beat detection entry
 */
export async function detectBeats(videoPath) {
  console.log("Detecting beats…");

  const envelope = await extractAudioEnvelope(videoPath);
  if (envelope.length === 0) return [];

  const smoothed = smoothEnvelope(envelope);
  const peaks = detectPeaks(smoothed);

  const bpm = estimateBPM(peaks);
  console.log("Estimated BPM:", bpm);

  const beatGrid = buildBeatGrid(peaks, bpm);
  console.log("Generated beats:", beatGrid.length);

  return beatGrid;
}
