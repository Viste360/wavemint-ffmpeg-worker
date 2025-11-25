import express from "express";
import multer from "multer";
import fs from "fs";
import { hybridSlice } from "../utils/ffmpeg.js";

const router = express.Router();

// Multer config — store uploads in /tmp (Railway-safe)
const upload = multer({
  dest: "/tmp",
  limits: {
    fileSize: 1024 * 1024 * 500, // 500MB max (adjust if needed)
  },
});

// POST /slice
// Fields:
//   video: required
//   audio: optional
router.post(
  "/",
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "audio", maxCount: 1 },
  ]),
  async (req, res) => {
    let videoFile, audioFile;

    try {
      videoFile = req.files?.video?.[0];
      audioFile = req.files?.audio?.[0];

      if (!videoFile) {
        return res.status(400).json({ error: "video_file_required" });
      }

      console.log("🎥 Received video:", videoFile.path);
      if (audioFile) {
        console.log("🎵 Received audio:", audioFile.path);
      }

      const videoPath = videoFile.path;
      const audioPath = audioFile ? audioFile.path : null;

      // Call hybrid slicer
      const clips = await hybridSlice(videoPath, audioPath);

      // Clean up original input files
      try {
        if (videoPath && fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
        if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
      } catch (cleanupErr) {
        console.warn("Cleanup error (inputs):", cleanupErr);
      }

      return res.json({
        status: "success",
        count: clips.length,
        clips,
      });
    } catch (err) {
      console.error("Slice route error:", err);

      // Best-effort cleanup
      try {
        if (videoFile?.path && fs.existsSync(videoFile.path)) {
          fs.unlinkSync(videoFile.path);
        }
        if (audioFile?.path && fs.existsSync(audioFile.path)) {
          fs.unlinkSync(audioFile.path);
        }
      } catch (cleanupErr) {
        console.warn("Cleanup error after failure:", cleanupErr);
      }

      return res.status(500).json({ error: "slice_failed" });
    }
  }
);

export default router;
