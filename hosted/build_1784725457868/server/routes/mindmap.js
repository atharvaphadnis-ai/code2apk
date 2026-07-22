// POST /mindmap — turn a prompt into a Pollinations image URL
const express = require("express");
const router = express.Router();

router.post("/", (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Missing prompt" });
  const clean =
    "mind map diagram, clean layout, dark background, glowing blue and purple nodes, of: " +
    prompt;
  const url =
    "https://image.pollinations.ai/prompt/" +
    encodeURIComponent(clean) +
    "?width=1280&height=720&nologo=true";
  res.json({ url });
});

module.exports = router;
