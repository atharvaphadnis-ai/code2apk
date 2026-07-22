// Axiom — Express server entry point
const express = require("express");
const path = require("path");
const fs = require("fs");
const analyzeRoute = require("./routes/analyze");
const mindmapRoute = require("./routes/mindmap");

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(express.json({ limit: "20mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

app.use("/analyze", analyzeRoute);
app.use("/mindmap", mindmapRoute);

app.listen(PORT, () => {
  console.log("🚀 Axiom running on http://localhost:" + PORT);
});
