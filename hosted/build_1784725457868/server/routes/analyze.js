// POST /analyze — receive a file, extract text, stream LLM response
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch");
const { parsePdf } = require("../utils/pdfParser");
const { ocrImage } = require("../utils/ocr");
const { buildPrompt } = require("../utils/textFormatter");

const router = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "..", "..", "uploads"),
    filename: (_r, file, cb) => cb(null, Date.now() + "-" + file.originalname),
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.post("/", upload.single("file"), async (req, res) => {
  try {
    const { provider, apiKey, model, baseUrl } = req.body;
    if (!apiKey) return res.status(400).json({ error: "Missing API key" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const ext = path.extname(req.file.originalname).toLowerCase();
    let text = "";
    if (ext === ".txt") text = fs.readFileSync(req.file.path, "utf8");
    else if (ext === ".pdf") text = await parsePdf(req.file.path);
    else if (ext === ".png") text = await ocrImage(req.file.path);
    else return res.status(400).json({ error: "Unsupported file type" });

    const url =
      (provider === "groq"
        ? "https://api.groq.com/openai/v1"
        : baseUrl || "https://openrouter.ai/api/v1") + "/chat/completions";

    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: provider === "groq" ? "qwen/qwen3.6-27b" : model,
        stream: true,
        messages: [
          { role: "system", content: "You are Axiom, a document analyst." },
          { role: "user", content: buildPrompt(text) },
        ],
      }),
    });

    res.setHeader("Content-Type", "text/event-stream");
    upstream.body.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
