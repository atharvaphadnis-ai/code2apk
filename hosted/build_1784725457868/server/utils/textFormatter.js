exports.buildPrompt = (text) => `Analyze the following document and respond in Markdown with these exact sections:

# Title
A concise, descriptive title.

## Summary
A 2–4 sentence summary.

## Key Points
- Bullet points of the most important facts.

## Insights / Explanation
A thoughtful explanation of what the document means, its implications, and any patterns you notice.

---
DOCUMENT:
${text.slice(0, 15000)}`;
