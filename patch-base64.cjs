const fs = require('fs');

let identifyCode = fs.readFileSync('src/pages/fishing/Identify.tsx', 'utf8');

const oldFetchLogic = `      // Convert base64 to File
      const res = await fetch(image);
      const blob = await res.blob();
      const file = new File([blob], "scanned_fish.jpg", { type: "image/jpeg" });`;

const newConversionLogic = `      // Convert base64 to File robustly
      const arr = image.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const file = new File([u8arr], "scanned_fish.jpg", { type: mime });`;

identifyCode = identifyCode.replace(oldFetchLogic, newConversionLogic);

fs.writeFileSync('src/pages/fishing/Identify.tsx', identifyCode);
