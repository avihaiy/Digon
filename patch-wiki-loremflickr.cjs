const fs = require('fs');

let code = fs.readFileSync('src/pages/fishing/Wiki.tsx', 'utf8');

let index = 1;
code = code.replace(/image: "https:\/\/upload.wikimedia.org[^"]+"/g, () => {
  const url = 'image: "https://loremflickr.com/640/480/fish,ocean?lock=' + index + '"';
  index++;
  return url;
});

fs.writeFileSync('src/pages/fishing/Wiki.tsx', code);
