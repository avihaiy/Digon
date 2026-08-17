// Switch to default Node.js Serverless runtime to resolve environment variable availability issues
export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const { prompt, base64Image, mimeType, model = "gemini-flash-latest" } = body;

    // We use the raw API key from environment, without the VITE_ prefix.
    // Ensure you set GEMINI_API_KEY in your Vercel project settings.
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing Gemini API Key in server environment." }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
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
      return new Response(JSON.stringify({ error: `Gemini API Error: ${errText}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    let text = "";
    if (data.candidates && data.candidates[0].content.parts[0].text) {
      text = data.candidates[0].content.parts[0].text;
    }

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
