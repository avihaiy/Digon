const fs = require('fs');

let identifyCode = fs.readFileSync('src/pages/fishing/Identify.tsx', 'utf8');

const shareButtonUI = `
              {result && (
                <Button 
                  variant="default" 
                  className="w-full h-14 rounded-2xl gap-2 text-lg font-bold mt-4 bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
                  onClick={handleShare}
                  disabled={isSharing}
                >
                  <Share2 className="w-5 h-5" />
                  {isSharing ? "מכין תמונה..." : "שתף תמונה ממותגת"}
                </Button>
              )}
`;

const targetButton = `              {(!isScanning || result) && (
                <Button 
                  variant="outline" 
                  className="w-full h-12 rounded-2xl gap-2 font-bold mt-4 bg-background shadow-sm"
                  onClick={resetScanner}
                >
                  <RefreshCw className="w-4 h-4" />
                  סרוק תמונה נוספת
                </Button>
              )}`;

identifyCode = identifyCode.replace(targetButton, shareButtonUI + '\n' + targetButton);

fs.writeFileSync('src/pages/fishing/Identify.tsx', identifyCode);
