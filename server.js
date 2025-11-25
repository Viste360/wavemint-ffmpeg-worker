import express from "express";
import cors from "cors";
import sliceRoute from "./routes/slice.js";

const app = express();

// Basic security / safety
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "ffmpeg-worker" });
});

// Slice route
app.use("/slice", sliceRoute);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler (just in case)
app.use((err, req, res, next) => {
  console.error("Unhandled error in ffmpeg-worker:", err);
  res.status(500).json({ error: "internal_error" });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("🎬 FFmpeg worker running on port", PORT);
});
