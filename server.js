import express from "express";
import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import cors from "cors";
import path from "path";
import fs from "fs";

const app = express();
app.use(cors());

const upload = multer({ dest: "uploads/" });

// FFmpeg binary
ffmpeg.setFfmpegPath(ffmpegPath);

// POST /processClip
app.post("/process", upload.single("video"), async (req, res) => {
  try {
    const input = req.file.path;
    const output = `output_${Date.now()}.mp4`;

    ffmpeg(input)
      .output(output)
      .on("end", () => {
        res.json({ success: true, message: "Clip processed!", file: output });
        fs.unlinkSync(input);
      })
      .on("error", (err) => {
        console.error(err);
        res.status(500).json({ success: false, error: "FFmpeg failed" });
      })
      .run();
  } catch (e) {
    res.status(500).json({ success: false, error: "Processing error" });
  }
});

app.listen(3000, () => console.log("FFmpeg worker running on 3000"));
