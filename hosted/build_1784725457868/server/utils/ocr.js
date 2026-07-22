const Tesseract = require("tesseract.js");
exports.ocrImage = async (filePath) => {
  const { data } = await Tesseract.recognize(filePath, "eng");
  return data.text;
};
