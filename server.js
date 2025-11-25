
import express from "express";
import cors from "cors";
import sliceRoute from "./routes/slice.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/slice", sliceRoute);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("FFmpeg worker running on", PORT));
