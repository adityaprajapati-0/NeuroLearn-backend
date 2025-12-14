import express from "express";
import cors from "cors";

import run from "./judge/run.js";
import submit from "./judge/submit.js";

const app = express();

app.use(cors());
app.use(express.json());

app.post("/api/run", run);
app.post("/api/submit", submit);

app.listen(4000, () => {
  console.log("🔥 Judge backend running on http://localhost:4000");
});
