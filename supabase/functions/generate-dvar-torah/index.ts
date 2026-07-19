import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { parasha } = await req.json()
    
    if (!parasha) {
      throw new Error('Parasha name is required')
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing')
    }

    const prompt = `כתוב לי דבר תורה קצר ומרתק על פרשת ${parasha}. הדבר תורה מיועד לעלון שבת קהילתי. על המאמר לכלול מסר או מוסר השכל קצר ויפה שאפשר לקחת לחיי היום-יום.
החזר את התשובה בפורמט HTML נקי (ללא תגיות <html> או <body>, רק תגיות <p>, <strong>, <ul> וכו') כדי שאוכל לשתול אותו ישירות במערכת.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    })

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error.message || 'Error from Gemini API')
    }

    // Extract text from Gemini response
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    // Clean up markdown block if it returned ```html ... ```
    const cleanHtml = text.replace(/```html/g, '').replace(/```/g, '').trim()

    return new Response(
      JSON.stringify({ html: cleanHtml }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
