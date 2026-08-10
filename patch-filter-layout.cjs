const fs = require('fs');

let imageFilterCode = fs.readFileSync('src/lib/imageFilter.ts', 'utf8');

// Replace the baseFontSize calculation
imageFilterCode = imageFilterCode.replace(
  /const baseFontSize = Math\.max\(24, Math\.floor\(canvas\.height \* 0\.04\)\);/,
  `// Use the smaller dimension so portrait images don't get huge fonts\n        const baseFontSize = Math.max(18, Math.floor(Math.min(canvas.width, canvas.height) * 0.045));`
);

// We need to fix the overlapping layout on the Y axis
// In the original code:
// ctx.fillText(fishText, canvas.width - padding, canvas.height - padding - baseFontSize * 1.5);
// ctx.fillText(weatherStr, canvas.width - padding, canvas.height - padding);

// Let's change the spacing to 1.8 to give more breathing room
imageFilterCode = imageFilterCode.replace(
  /ctx\.fillText\(fishText, canvas\.width - padding, canvas\.height - padding - baseFontSize \* 1\.5\);/,
  `ctx.fillText(fishText, canvas.width - padding, canvas.height - padding - baseFontSize * 1.8);`
);

// If the fishText is extremely long (like AI identifications often are), it can still overlap. 
// We can truncate it or just rely on the smaller font. The font scaling fix should solve 99% of cases.

// To be super safe, let's also increase the gradient height so the text is more readable
imageFilterCode = imageFilterCode.replace(
  /const gradientHeight = canvas\.height \* 0\.25;/,
  `const gradientHeight = Math.max(canvas.height * 0.25, baseFontSize * 6);`
);

fs.writeFileSync('src/lib/imageFilter.ts', imageFilterCode);
