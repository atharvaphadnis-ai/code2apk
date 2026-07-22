const fs = require("fs");
const pdfParse = require("pdf-parse");
exports.parsePdf = async (filePath) => {
  const buf = fs.readFileSync(filePath);
  const { text } = await pdfParse(buf);
  return text;
};
