import { promisify } from "util";
import { exec } from "child_process";

const execAsync = promisify(exec);

/**
 * Detect energy spikes by analyzing short-time energy
 * from audio waveform via ffprobe astats.
 *
 * This acts as a fallback for beat detection.
 */
export async function detectEnergy(videoPath) {
  console.log("Detecting energy…");

  const cmd = `ffprobe -hide_banner -loglevel error -f lavfi -i amovie=${videoPath},astats=metadata=1:reset=1 -show_entries frame=pkt_pts_time:frame_tag=lavfi.astats.Overall.Peak_level -of csv=p=0`;

  try {
    const { stdout } = await execAsync(cmd);

    const lines = stdout.trim().split("\n");

    const energy = [];

    for (const line of lines) {
      if (!line || !line.includes(",")) continue;

      const [timeStr, peakStr] = line.split(",");
      const time = parseFloat(timeStr);
      const peak = parseFloat(peakStr);

      if (!isNaN(time) && !isNaN(peak)) {
        energy.push({ time, peak });
      }
    }

    if (energy.length === 0) return [];

    // Normalize and detect spikes
    return detectEnergyPeaks(energy);

  } catch (e) {
    console.error("Energy detection failed:", e);
    return [];
  }
}

/**
 * Normalize peak values and detect energetic frames
 */
function detectEnergyPeaks(frames) {
  if (frames.length === 0) return [];

  const peaks = frames.map(f => f.peak);
  const max = Math.max(...peaks);
  const min = Math.min(...peaks);

  // Normalize to 0..1
  const normalized = frames.map(f => ({
    time: f.time,
    val: (f.peak - min) / (max - min + 1e-6)
  }));

  const energyPoints = [];

  for (let i = 1; i < normalized.length - 1; i++) {
    const prev = normalized[i - 1].val;
    const cur = normalized[i].val;
    const next = normalized[i + 1].val;

    // Spike threshold
    if (cur > prev && cur > next && cur > 0.45) {
      energyPoints.push({ time: normalized[i].time, energy: cur });
    }
  }

  return energyPoints;
}
