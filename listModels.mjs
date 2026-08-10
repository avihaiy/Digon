import fs from 'fs';
import path from 'path';

// Read the .env file to get the VITE_GEMINI_API_KEY
const envContent = fs.readFileSync('.env', 'utf-8');
const apiKeyMatch = envContent.match(/VITE_GEMINI_API_KEY=(.*)/);
if (apiKeyMatch && apiKeyMatch[1]) {
  const apiKey = apiKeyMatch[1].trim();
  
  fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
    .then(res => res.json())
    .then(data => {
      console.log("Available models:");
      if (data.models) {
        data.models.forEach(m => {
          console.log(`- ${m.name} (methods: ${m.supportedGenerationMethods.join(', ')})`);
        });
      } else {
        console.log("Response:", data);
      }
    })
    .catch(err => console.error("Error fetching models:", err));
} else {
  console.log("VITE_GEMINI_API_KEY not found in .env");
}
