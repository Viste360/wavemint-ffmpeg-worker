export default async function processClip(req, res) {
  return res.json({
    message: "FFmpeg worker online!",
    status: "ok"
  });
}
