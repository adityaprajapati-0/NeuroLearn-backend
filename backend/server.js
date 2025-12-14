import express from "express";
import cors from "cors";

import run from "./judge/run.js";
import submit from "./judge/submit.js";

const app = express();

/* --------------------------------------------------
   CORS (RENDER + BROWSER SAFE)
-------------------------------------------------- */
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

// 🔥 VERY IMPORTANT — allow browser preflight
app.options("*", cors());

/* --------------------------------------------------
   BODY PARSER
-------------------------------------------------- */
app.use(express.json());

/* --------------------------------------------------
   HEALTH / ROOT
-------------------------------------------------- */
app.get("/", (req, res) => {
  res.send("🚀 NeuroLearn Judge Backend is running");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/* --------------------------------------------------
   API ROUTES
-------------------------------------------------- */
app.post("/api/run", run);
app.post("/api/submit", submit);

/* --------------------------------------------------
   PORT (RENDER SAFE)
-------------------------------------------------- */
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🔥 Judge backend running on port ${PORT}`);
});
