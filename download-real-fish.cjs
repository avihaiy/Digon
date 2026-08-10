const fs = require('fs');
const https = require('https');
const path = require('path');

const fishMapping = {
  "locus": "White_grouper",
  "denis": "Gilt-head_bream",
  "sargus": "White_seabream",
  "aras": "Marbled_spinefoot",
  "avo-nafha": "Lagocephalus_sceleratus",
  "intias": "Greater_amberjack",
  "palamida": "Little_tunny",
  "marmir": "Sand_steenbras",
  "gombar": "Bluefish",
  "barracuda": "Great_barracuda",
  "tarchon": "White_trevally",
  "labrak": "European_bass",
  "musar": "Argyrosomus_regius",
  "farida": "Common_pandora",
  "safmit": "Plotosus_lineatus",
  "calamari": "European_squid",
  "zaharon": "Red_lionfish",
  "buri": "Flathead_grey_mullet",
  "musht": "Nile_tilapia",
  "karpion": "Common_carp",
  "barbus": "Luciobarbus_capito",
  "catfish": "African_sharptooth_catfish",
  "silver-carp": "Silver_carp",
  "tzelofach": "European_eel",
  "trout": "Rainbow_trout",
  "kachlon": "Pompano",
  "dorado": "Mahi-mahi",
  "halilon": "Bluespotted_cornetfish",
  "televizia": "Sillago_sihama",
  "plamida-lavana": "Narrow-barred_Spanish_mackerel",
  "tona-shchora": "Little_tunny",
  "tamnun": "Common_octopus",
  "salpa": "Salema_porgy",
  "lavnun": "Acanthobrama_terraesanctae"
};

const dir = path.join(__dirname, 'public', 'fish');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const delay = ms => new Promise(res => setTimeout(res, ms));

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://en.wikipedia.org/'
};

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (response) => {
      if (response.statusCode === 200) {
        const file = fs.createWriteStream(dest);
        response.pipe(file);
        file.on('finish', () => file.close(resolve));
      } else if (response.statusCode === 301 || response.statusCode === 302) {
         downloadImage(response.headers.location, dest).then(resolve).catch(reject);
      } else {
        console.error("Failed " + url + " - " + response.statusCode);
        resolve();
      }
    }).on('error', (err) => {
      console.error("Error " + url, err);
      resolve();
    });
  });
}

async function run() {
  const codePath = 'src/pages/fishing/Wiki.tsx';
  let code = fs.readFileSync(codePath, 'utf8');

  for (const [id, title] of Object.entries(fishMapping)) {
    console.log("Fetching " + title + "...");
    try {
      const apiUrl = "https://en.wikipedia.org/w/api.php?action=query&titles=" + title + "&prop=pageimages&format=json&pithumbsize=640";
      const data = await httpsGet(apiUrl);
      const pages = data.query.pages;
      const pageId = Object.keys(pages)[0];
      
      if (pageId !== "-1" && pages[pageId].thumbnail) {
        const imageUrl = pages[pageId].thumbnail.source;
        const dest = path.join(dir, id + ".jpg");
        await downloadImage(imageUrl, dest);
        console.log("Downloaded " + id + ".jpg");
        
        // Replace URL in Wiki.tsx
        const regex = new RegExp("(id:\\s*\"" + id + "\",[\\s\\S]*?image:\\s*)\"[^\"]+\"", 'g');
        code = code.replace(regex, "$1\"/fish/" + id + ".jpg\"");
      } else {
        console.log("No image found for " + title);
      }
    } catch (e) {
      console.error("Error fetching " + title + ":", e);
    }
    
    // Add delay to avoid 429
    await delay(1500);
  }

  fs.writeFileSync(codePath, code);
  console.log("Finished replacing URLs!");
}

run();
