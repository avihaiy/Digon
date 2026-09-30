const fs = require('fs');
let code = fs.readFileSync('src/pages/fishing/Identify.tsx', 'utf8');

const targetStr = `                </Card>

              {result && (
                <Button 
                  variant="default" `;

const fallbackTargetStr = `                </Card>

              {result && (
                <Button 
                  variant="default" `;

// Let's use string replace on something guaranteed to be there
const oldUI = `{result && (
                <Button 
                  variant="default" 
                  className="w-full h-14 rounded-2xl gap-2 text-lg font-bold mt-4 bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
                  onClick={handleShare}`;

const newUI = `{result && scanType === 'gear' && (
                <Button 
                  variant="outline" 
                  className="w-full h-14 rounded-2xl gap-2 text-lg font-bold mt-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border-emerald-500/30"
                  onClick={handleAddToTackleBox}
                  disabled={addedToTackleBox}
                >
                  <PackagePlus className="w-5 h-5" />
                  {addedToTackleBox ? "נוסף לקופסת ציוד" : "הוסף לקופסת ציוד"}
                </Button>
              )}

              {result && (
                <Button 
                  variant="default" 
                  className="w-full h-14 rounded-2xl gap-2 text-lg font-bold mt-4 bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
                  onClick={handleShare}`;

if (code.includes(oldUI)) {
  code = code.replace(oldUI, newUI);
  fs.writeFileSync('src/pages/fishing/Identify.tsx', code, 'utf8');
  console.log("Success exact match");
} else {
  // Try regex
  const regex = /\{\s*result && \(\s*<Button \s*variant="default" \s*className="w-full h-14 rounded-2xl gap-2 text-lg font-bold mt-4 bg-orange-500 hover:bg-orange-600 text-white shadow-lg"\s*onClick=\{handleShare\}/s;
  if (regex.test(code)) {
    code = code.replace(regex, newUI);
    fs.writeFileSync('src/pages/fishing/Identify.tsx', code, 'utf8');
    console.log("Success regex match");
  } else {
    console.log("Failed to find UI to replace");
  }
}
