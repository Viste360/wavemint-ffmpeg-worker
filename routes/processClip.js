export default async function handler(req, res) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_FFMPEG_WORKER}/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const result = await response.json();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "FFmpeg worker error", details: error.toString() });
  }
}
