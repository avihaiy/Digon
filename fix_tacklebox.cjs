const fs = require('fs');
let code = fs.readFileSync('src/pages/fishing/TackleBox.tsx', 'utf8');

const oldAI = `      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model: "gemini-pro-latest" })
      });
      if (!response.ok) throw new Error(response.statusText);
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      let cleanedText = data.text.replace(/\\x60\\x60\\x60json/g, '').replace(/\\x60\\x60\\x60/g, '').trim();`;

const newAI = `      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Missing Gemini API Key");

      const payload = {
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: mimeType, data: base64Data } }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 100,
        }
      };

      const response = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=\${apiKey}\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "API Error");
      
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      let cleanedText = rawText.replace(/\\x60\\x60\\x60json/g, '').replace(/\\x60\\x60\\x60/g, '').trim();`;

// Wait, the regex `\x60` might be easier, or just string replacement
code = code.replace(oldAI, newAI);

// To avoid replace failing, we'll use regex for the whole block
const blockRegex = /const response = await fetch\('\/api\/gemini'[\s\S]*?let cleanedText = data\.text\.replace\(\/```json\/g, ''\)\.replace\(\/```\/g, ''\)\.trim\(\);/;

const replacementStr = `      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Missing Gemini API Key");

      const payload = {
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: mimeType, data: base64Data } }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
        }
      };

      const response = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=\${apiKey}\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "API Error");
      
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      let cleanedText = rawText.replace(/\\\`\\\`\\\`json/g, '').replace(/\\\`\\\`\\\`/g, '').trim();`;

code = code.replace(blockRegex, replacementStr);

fs.writeFileSync('src/pages/fishing/TackleBox.tsx', code, 'utf8');
console.log('done');
