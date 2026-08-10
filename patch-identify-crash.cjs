const fs = require('fs');

let identifyCode = fs.readFileSync('src/pages/fishing/Identify.tsx', 'utf8');

if (!identifyCode.includes('compressImage')) {
  identifyCode = identifyCode.replace(
    /import \{ useAuth \} from "@\/hooks\/useAuth";/,
    `import { useAuth } from "@/hooks/useAuth";\nimport { compressImage } from "@/lib/imageCompression";`
  );
}

const oldHandleFileChange = /const handleFileChange = \(e: React\.ChangeEvent<HTMLInputElement>\) => \{[\s\S]*?reader\.readAsDataURL\(file\);\s*\}\s*\};/;
const newHandleFileChange = `const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, { maxWidth: 1024, quality: 0.8 });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setImage(base64);
          analyzeImage(base64);
        };
        reader.readAsDataURL(compressed);
      } catch (err) {
        toast.error("שגיאה בטעינת התמונה.");
      }
    }
  };`;
identifyCode = identifyCode.replace(oldHandleFileChange, newHandleFileChange);

const oldParseBlock = /const parsedResult = JSON\.parse\(cleanedText\);\s*setResult\(parsedResult\);/;
const newParseBlock = `      try {
        const parsedResult = JSON.parse(cleanedText);
        setResult(parsedResult);
      } catch (parseError) {
        console.error("JSON Parse Error. Raw text:", text);
        setResult({
          name: "זיהוי לא ברור",
          confidence: 0,
          kosher: false,
          danger: null,
          description: text || "הבינה המלאכותית לא הצליחה לזהות בוודאות. נסה לצלם מזווית אחרת או קרוב יותר.",
          tips: "וודא שהדג מואר היטב ושלם.",
          minSize: "",
          bestBait: ""
        });
      }`;
identifyCode = identifyCode.replace(oldParseBlock, newParseBlock);

const oldCatchBlock = /\} catch \(error: any\) \{\s*console\.error\("AI Error:", error\);\s*toast\.error\(\`שגיאה בזיהוי התמונה: \$\{error\.message \|\| 'נסה שוב'\}\`\);\s*\} finally \{/;
const newCatchBlock = `} catch (error: any) {
      console.error("AI Error:", error);
      toast.error(\`שגיאה בזיהוי התמונה: \${error.message || 'נסה שוב'}\`);
      setResult({
        name: "שגיאת תקשורת / שרת",
        confidence: 0,
        kosher: false,
        danger: null,
        description: error.message || "החיבור לשרת נכשל. בדוק את החיבור לאינטרנט ונסה שוב.",
        tips: "",
        minSize: "",
        bestBait: ""
      });
    } finally {`;
identifyCode = identifyCode.replace(oldCatchBlock, newCatchBlock);

fs.writeFileSync('src/pages/fishing/Identify.tsx', identifyCode);
