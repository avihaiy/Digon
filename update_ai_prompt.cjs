const fs = require('fs');
let code = fs.readFileSync('src/components/catches/CatchReportDialog.tsx', 'utf8');

const targetText = `"Identify the exact species of this fish in Hebrew. Return ONLY the name in Hebrew (e.g. 'אנטיאס', 'לברק', 'טונה שחורה', 'קרפיון', 'מושט'). If it's not a fish, return 'לא זוהה דג'."`;
// Fallbacks for encoding
const targetTextFallback = `"Identify the exact species of this fish in Hebrew. Return ONLY the name in Hebrew (e.g. '???\n?~?T???\u05bd', '???\`?"? ', '?~? ??" ?c?-? ?"?"', '? ?"???T? ??', '??? ?c?~'). If it's not a fish, return '???? ?-? ?"?" \n?"?''."`;

const newText = `"Identify all the fish species in this image. If there are multiple different species of fish, return all of their names in Hebrew separated by commas and a space (e.g. 'אנטיאס, לברק, מושט'). If there is only one species, just return its name. Return ONLY the names in Hebrew. If it's not a fish or no fish are detected, return 'לא זוהה דג'."`;

let modified = false;

// Attempt exact match first
if (code.includes(targetText)) {
  code = code.replace(targetText, newText);
  modified = true;
} else {
  // We'll use a regex to match the "Identify ... 'לא זוהה דג'." robustly
  const regex = /"Identify the exact species of this fish in Hebrew[^"]+לא זוהה דג'."/i;
  const regex2 = /"Identify the exact species of this fish in Hebrew.*?If it's not a fish, return '.*?'\."/s;
  
  if (regex.test(code)) {
    code = code.replace(regex, newText);
    modified = true;
  } else if (regex2.test(code)) {
    code = code.replace(regex2, newText);
    modified = true;
  } else {
    console.log("Could not find the target text to replace.");
  }
}

if (modified) {
  fs.writeFileSync('src/components/catches/CatchReportDialog.tsx', code, 'utf8');
  console.log("Successfully updated the AI prompt");
}
