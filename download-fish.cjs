const fs = require('fs');
const https = require('https');
const path = require('path');

const wikiCode = fs.readFileSync('src/pages/fishing/Wiki.tsx', 'utf8');

// Extract all fish images
const fishRegex = /id:\s*"([^"]+)",\s*name:\s*"[^"]+",\s*image:\s*"([^"]+)"/g;
const fishes = [];
let match;
while ((match = fishRegex.exec(wikiCode)) !== null) {
  fishes.push({ id: match[1], url: match[2] });
}

const dir = path.join(__dirname, 'public', 'fish');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

async function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    // Sometimes URLs have %28 which node https doesn't like? We'll see.
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    };
    
    https.get(url, options, (response) => {
      if (response.statusCode === 200) {
        const file = fs.createWriteStream(dest);
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      } else if (response.statusCode === 301 || response.statusCode === 302) {
         downloadImage(response.headers.location, dest).then(resolve).catch(reject);
      } else {
        console.error(\`Failed \${url} - Status: \${response.statusCode}\`);
        resolve(); // resolve anyway to not block
      }
    }).on('error', (err) => {
      console.error(\`Error \${url}\`, err);
      resolve();
    });
  });
}

async function run() {
  let newCode = wikiCode;
  
  for (const fish of fishes) {
    const ext = path.extname(new URL(fish.url).pathname) || '.jpg';
    const filename = \`\${fish.id}\${ext}\`;
    const dest = path.join(dir, filename);
    
    console.log(\`Downloading \${fish.url} to \${dest}...\`);
    await downloadImage(fish.url, dest);
    
    // Replace URL in code
    newCode = newCode.replace(fish.url, \`/fish/\${filename}\`);
  }
  
  fs.writeFileSync('src/pages/fishing/Wiki.tsx', newCode);
  console.log("Done!");
}

run();
