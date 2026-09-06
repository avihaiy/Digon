import { VercelRequest, VercelResponse } from '@vercel/node';

// Switch to default Node.js Serverless runtime to resolve environment variable availability issues
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    // In Vercel Node.js runtime, req.body is already parsed if Content-Type is application/json
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { prompt, base64Image, mimeType, model = "gemini-pro-latest" } = body || {};

    // We use the raw API key from environment, without the VITE_ prefix.
    // Ensure you set GEMINI_API_KEY in your Vercel project settings.
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Missing Gemini API Key in server environment." });
    }

    const requestBody: any = {
      contents: [{ parts: [] }]
    };

    if (base64Image && mimeType) {
      requestBody.contents[0].parts.push({
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        }
      });
    }

    if (prompt) {
      requestBody.contents[0].parts.push({
        text: prompt
      });
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Gemini API Error: ${errText}` });
    }

    const data = await response.json();
    let text = "";
    if (data.candidates && data.candidates[0].content.parts[0].text) {
      text = data.candidates[0].content.parts[0].text;
    }

    return res.status(200).json({ text });

  } catch (error: any) {
    console.error("Gemini API handler error:", error);
    return res.status(500).json({ error: error.message });
  }
}
