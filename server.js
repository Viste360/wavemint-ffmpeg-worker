import express from "express";
import cors from "cors";

import sliceRoutes from "./routes/slice.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/slice", sliceRoutes);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("FFmpeg worker running on port", PORT);
});

});

app.listen(3000, () => console.log("FFmpeg worker running on 3000"));
