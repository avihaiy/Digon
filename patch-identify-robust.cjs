const fs = require('fs');

let identifyCode = fs.readFileSync('src/pages/fishing/Identify.tsx', 'utf8');

// We will replace the entire try block for the API call to make it extremely robust.
const tryBlockRegex = /try \{\s*const apiKey = import\.meta\.env\.VITE_GEMINI_API_KEY;[\s\S]*?\} catch \(error\) \{\s*console\.error\("AI Error:", error\);\s*toast\.error\("שגיאה בזיהוי התמונה\. נסה שוב\."\);\s*\} finally \{\s*setIsScanning\(false\);\s*\}/;

const robustTryBlock = `try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!apiKey) {
        toast.info("מפתח API של Gemini לא נמצא, מציג תוצאה להדגמה.");
        await new Promise(resolve => setTimeout(resolve, 2000));
        setResult({
          name: "לוקוס לבן (דקר)",
          confidence: 96,
          kosher: true,
          danger: null,
          description: "דג טורף ממשפחת הדקריים, נחשב לאחד ממשובחי הדגים בים התיכון.",
          tips: "מומלץ להשתמש בשיטת ז'רז'ור עם דמויים גדולים או פיתיון חי ליד סלעים.",
          minSize: "45 ס״מ (חוק הגנת הדייג בישראל)",
          bestBait: "סבידה / תמנון / דמוי שוקע 120 מ״מ"
        });
        return;
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      
      const mimeMatch = base64Str.match(/^data:(image\\/[a-zA-Z0-9]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
      const base64Data = base64Str.split(",")[1];
      
      const prompt = \`
        You are an expert marine biologist and fisherman in Israel (Mediterranean Sea, Red Sea, Sea of Galilee).
        Identify the fish in this image with maximum accuracy.
        First, analyze the shape, fins, scales, color patterns, and mouth.
        Consider common Israeli fish: דניס, ברמונדי, לוקוס, פרידה, אנטיאס, פלמידה, גומבר, בורי, אראס, אבו נפחא, מרמיר, סרגוס, טרכון, שולה, טונה שחורה, חרב.
        If it's an invasive species from the Red Sea (Lessepsian migration), note it.
        If the image DOES NOT contain a fish or marine creature, return "לא זוהה דג בתמונה" for the name, 0 for confidence, and explain what you see in the description.
        Respond in pure JSON format (without markdown blocks) with the following structure:
        {
          "name": "Hebrew name of the fish (and common nickname)",
          "confidence": number between 0-100,
          "kosher": boolean,
          "danger": "string warning if it's venomous/poisonous (like Aras or Abu Nafha), otherwise null",
          "description": "Short description in Hebrew",
          "tips": "One short fishing tip or culinary tip in Hebrew",
          "minSize": "Minimum legal catch size in Israel (e.g. 45 ס״מ) or 'אין הגבלה'",
          "bestBait": "Recommended bait in Hebrew"
        }
      \`;

      let text = "";
      try {
        // Try Pro first
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const aiResult = await model.generateContent([
          prompt,
          { inlineData: { data: base64Data, mimeType: mimeType } }
        ]);
        text = aiResult.response.text();
      } catch (proError: any) {
        console.warn("Pro model failed, falling back to Flash:", proError);
        // Fallback to Flash (handles rate limits or model availability issues)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const aiResult = await model.generateContent([
          prompt,
          { inlineData: { data: base64Data, mimeType: mimeType } }
        ]);
        text = aiResult.response.text();
      }
      
      // Robust JSON extraction
      let cleanedText = text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
      const firstBrace = cleanedText.indexOf('{');
      const lastBrace = cleanedText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
      }
      
      const parsedResult = JSON.parse(cleanedText);
      setResult(parsedResult);
      
    } catch (error: any) {
      console.error("AI Error:", error);
      toast.error(\`שגיאה בזיהוי התמונה: \${error.message || 'נסה שוב'}\`);
    } finally {
      setIsScanning(false);
    }`;

identifyCode = identifyCode.replace(tryBlockRegex, robustTryBlock);

fs.writeFileSync('src/pages/fishing/Identify.tsx', identifyCode);
