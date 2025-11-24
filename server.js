import express from "express";
import cors from "cors";
import processClip from "./routes/processClip.js";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/process", processClip);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("FFmpeg worker running on port", port));
